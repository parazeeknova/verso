// Sanitizes Set-Cookie headers from the backy backend so they work
// as first-party cookies on whatever origin weby is serving from.
//
// When the desktop app's embedded Nitro server proxies to the remote
// production backend, backy returns cookies scoped to its own domain
// (e.g. Domain=przknv.cc, Secure). The WebView loads from localhost,
// so those cookies get rejected. Stripping Domain and Secure makes
// them "host-only" cookies that bind to the current origin.
export const sanitizeSetCookies = (backendResponse: Response): string[] =>
  backendResponse.headers.getSetCookie().map((cookie) =>
    cookie
      // Strip Domain=...; (case-insensitive, with optional whitespace)
      .replaceAll(/;\s*domain=[^;]*/gi, "")
      // Strip Secure flag so cookies work on http://localhost
      .replaceAll(/;\s*secure/gi, ""),
  );

// Forwards sanitized Set-Cookie headers from a backy response into
// a Headers object suitable for returning to the browser.
export const forwardSanitizedCookies = (
  backendResponse: Response,
  responseHeaders: Headers,
): void => {
  for (const cookie of sanitizeSetCookies(backendResponse)) {
    responseHeaders.append("set-cookie", cookie);
  }
};
