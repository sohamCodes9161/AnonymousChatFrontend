// Vercel Serverless Function.
//
// Deliberately the older Node-style `(req, res)` handler signature,
// NOT the newer single-argument Web Request/Response style — a prior
// attempt using that style crashed with FUNCTION_INVOCATION_FAILED,
// because `request.url` under that invocation was a bare path string
// with no protocol/host, so `new URL(request.url)` threw. The fact
// that an earlier (req, res)-style version of this function DID get
// invoked correctly (it reached the backend and got a structured JSON
// response back) confirms this runtime dispatches to that older
// convention, so this sticks with what's proven to actually run here.
//
// Path extraction: vercel.json rewrites `/api/v1/auth/:path*` to
// `/api/auth?path=:path*` — a literal query string, not a bracket
// dynamic-route convention. That was the other half of the earlier
// bug (a [...path] bracket route wasn't populating its param
// reliably, silently forwarding an empty path). A plain query string
// has no such ambiguity: req.query.path is just ordinary URL parsing.
//
// WHY THIS FUNCTION EXISTS AT ALL: a declarative vercel.json rewrite
// to an EXTERNAL destination (Render) does not reliably forward the
// backend's Set-Cookie response header back to the browser — that's
// what broke the refresh-token cookie before this was added. This
// function is a real reverse proxy we control end-to-end, so
// Set-Cookie is forwarded explicitly. Because it runs on our own
// Vercel domain, the cookie it hands back is first-party to the
// browser — no third-party-cookie blocking on any browser.
//
// Only auth routes go through this (register/login/refresh/logout);
// everything else keeps calling Render directly since it only needs
// the Bearer access token, never the cookie.

const BACKEND_ORIGIN = 'https://anonymouschatbackend-7u9y.onrender.com';
const STRIP_REQUEST_HEADERS = new Set(['host', 'connection', 'content-length']);

export default async function handler(req, res) {
  const path = req.query?.path || '';
  const targetUrl = `${BACKEND_ORIGIN}/api/v1/auth/${path}`;

  const forwardHeaders = {};
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase()) && value !== undefined) {
      forwardHeaders[key] = value;
    }
  }

  const hasBody = !['GET', 'HEAD'].includes(req.method);

  let upstreamRes;
  try {
    upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
    });
  } catch (err) {
    res.status(502).json({
      success: false,
      error: { code: 'PROXY_UNREACHABLE', message: 'Could not reach the auth backend' },
    });
    return;
  }

  // getSetCookie() (Node 18.20+/20.4+ undici) returns each cookie
  // separately; older runtimes fall back to a single combined header,
  // fine here since we only ever set one cookie per auth response.
  const setCookie = upstreamRes.headers.getSetCookie?.() ?? upstreamRes.headers.get('set-cookie');
  if (setCookie) {
    res.setHeader('Set-Cookie', setCookie);
  }

  res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
  res.status(upstreamRes.status);
  const bodyText = await upstreamRes.text();
  res.send(bodyText);
}
