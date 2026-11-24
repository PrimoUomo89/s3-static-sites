const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");

// fetch() refuses to send a custom Host header, so use http.request.
function request(port, { path = "/", host, method = "GET" }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { port, path, method, headers: { host }, agent: false },
      (res) => {
        res.resume();
        res.on("end", () => resolve({ status: res.statusCode, location: res.headers.location }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

const {
  normalizeRedirect,
  buildRedirectMap,
  resolveRedirectLocation,
  toGreenlockSites,
} = require("../helpers/redirects.js");
const createApp = require("../app.js");

const sites = [
  {
    subject: "static.example",
    altnames: ["static.example", "www.static.example"],
  },
  {
    subject: "old.example",
    altnames: ["old.example", "www.old.example"],
    redirect: { to: "https://new.example/landing", status: 301 },
  },
  {
    subject: "moved.example",
    altnames: ["moved.example"],
    redirect: { to: "https://elsewhere.example/", status: 308, preservePath: true },
  },
];

test("normalizeRedirect applies defaults and accepts a string shorthand", () => {
  assert.deepStrictEqual(normalizeRedirect({ redirect: "https://a.example" }), {
    to: "https://a.example",
    status: 301,
    preservePath: false,
  });
  assert.strictEqual(normalizeRedirect({ subject: "x" }), null);
});

test("normalizeRedirect rejects invalid targets and statuses", (t) => {
  t.mock.method(console, "error", () => {});
  assert.strictEqual(normalizeRedirect({ redirect: { to: "/relative" } }), null);
  assert.strictEqual(normalizeRedirect({ redirect: { to: "ftp://a.example" } }), null);
  assert.strictEqual(normalizeRedirect({ redirect: { to: "https://a.example", status: 200 } }), null);
});

test("buildRedirectMap covers every altname of redirect sites only", () => {
  const map = buildRedirectMap(sites);
  assert.deepStrictEqual([...map.keys()].sort(), ["moved.example", "old.example", "www.old.example"]);
});

test("resolveRedirectLocation preserves path only when asked", () => {
  const fixed = { to: "https://new.example/landing", status: 301, preservePath: false };
  const keep = { to: "https://elsewhere.example/", status: 308, preservePath: true };
  assert.strictEqual(resolveRedirectLocation(fixed, "/a/b?c=1"), "https://new.example/landing");
  assert.strictEqual(resolveRedirectLocation(keep, "/a/b?c=1"), "https://elsewhere.example/a/b?c=1");
  assert.strictEqual(resolveRedirectLocation(keep, "/"), "https://elsewhere.example/");
});

test("toGreenlockSites drops redirect but keeps other fields", () => {
  const out = toGreenlockSites([{ subject: "a", altnames: ["a"], renewAt: 5, redirect: "https://b" }]);
  assert.deepStrictEqual(out, [{ subject: "a", altnames: ["a"], renewAt: 5 }]);
});

test("app redirects configured hosts without touching S3", async (t) => {
  t.mock.method(console, "log", () => {});
  const hosts = sites.flatMap((s) => s.altnames);
  const app = createApp(hosts, "us-east-1", "unused-bucket", {
    refreshUrl: "/refresh-test",
    redirects: buildRedirectMap(sites),
  });
  const server = app.listen(0);
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const port = server.address().port;

  let res = await request(port, { path: "/any/page", host: "www.old.example" });
  assert.strictEqual(res.status, 301);
  assert.strictEqual(res.location, "https://new.example/landing");

  res = await request(port, { path: "/a/b?c=1", host: "moved.example" });
  assert.strictEqual(res.status, 308);
  assert.strictEqual(res.location, "https://elsewhere.example/a/b?c=1");

  res = await request(port, { method: "HEAD", host: "OLD.example" });
  assert.strictEqual(res.status, 301);
});

test("app answers unrecognized hosts with 404 instead of hanging", async (t) => {
  t.mock.method(console, "error", () => {});
  const app = createApp(["static.example"], "us-east-1", "unused-bucket", { redirects: new Map() });
  const server = app.listen(0);
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });

  const res = await request(server.address().port, { host: "unknown.example" });
  assert.strictEqual(res.status, 404);
});
