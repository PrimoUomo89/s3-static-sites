const ALLOWED_STATUSES = [301, 302, 307, 308];

// Validate a site's `redirect` block from config.json.
// Returns a normalized { to, status, preservePath } object, or null (with a
// logged reason) when the block is missing or invalid. Invalid redirects are
// skipped rather than thrown so one bad entry can't take every site offline.
function normalizeRedirect(site) {
  const redirect = site.redirect;
  if (redirect === undefined || redirect === null) {
    return null;
  }

  const label = site.subject || (site.altnames || [])[0] || "unknown site";
  const spec = typeof redirect === "string" ? { to: redirect } : redirect;

  let url;
  try {
    url = new URL(spec.to);
  } catch (error) {
    console.error(`Ignoring redirect for ${label}: "to" must be an absolute URL`);
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    console.error(`Ignoring redirect for ${label}: "to" must use http or https`);
    return null;
  }

  const status = spec.status === undefined ? 301 : spec.status;
  if (!ALLOWED_STATUSES.includes(status)) {
    console.error(`Ignoring redirect for ${label}: status must be one of ${ALLOWED_STATUSES.join(", ")}`);
    return null;
  }

  return { to: spec.to, status, preservePath: spec.preservePath === true };
}

// Build a lookup of hostname -> redirect for every altname of every site
// that has a valid redirect.
function buildRedirectMap(sites) {
  const map = new Map();
  for (const site of sites || []) {
    const redirect = normalizeRedirect(site);
    if (!redirect) continue;
    for (const host of site.altnames || []) {
      map.set(host.toLowerCase(), redirect);
    }
  }
  return map;
}

// Compute the Location for a request. With preservePath, the request's path
// and query string are appended to the target (avoiding a double slash).
function resolveRedirectLocation(redirect, originalUrl) {
  if (!redirect.preservePath || !originalUrl || originalUrl === "/") {
    return redirect.to;
  }
  return redirect.to.replace(/\/+$/, "") + originalUrl;
}

// Strip redirect settings before sites are handed to Greenlock. Redirect
// sites still get certificates so https:// requests can be redirected too.
function toGreenlockSites(sites) {
  return (sites || []).map(({ redirect, ...rest }) => rest);
}

module.exports = {
  normalizeRedirect,
  buildRedirectMap,
  resolveRedirectLocation,
  toGreenlockSites,
};
