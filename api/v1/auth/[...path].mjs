// Vercel Serverless Function — NOT part of the Vite app, picked up
// automatically from /api at the project root by Vercel's build step.
//
// WHY THIS EXISTS (read before touching):
// vercel.json's `rewrites` to an external destination makes the
// BROWSER'S REQUEST look same-origin, but it does not reliably pass
// the backend's Set-Cookie response header back through to the
// browser — this is a documented limitation, not a config mistake.
// Since our refresh-token cookie is httpOnly and must survive a page
// reload, we need a real reverse proxy that we control end-to-end, so
// the Set-Cookie header is forwarded explicitly rather than left to
// Vercel's generic rewrite plumbing. This function does exactly that,
// and ONLY for the auth routes — everything else keeps calling Render
// directly (see src/api/client.js for why).
//
// Because this function itself runs ON our own Vercel domain, the
// Set-Cookie header it forwards is naturally first-party to the
// browser — no cross-site cookie problem, no browser ITP/ETP blocking,
// on any browser, desktop or mobile.

const BACKEND_ORIGIN = 'https://anonymouschatbackend-7u9y.onrender.com';

// Headers that must never be forwarded as-is between hops — they
// either describe THIS hop's transport (host, content-length, which
// change once the body is re-serialized) or are hop-by-hop headers
// the HTTP spec says a proxy must strip.
const STRIP_REQUEST_HEADERS = new Set(['host', 'connection', 'content-length']);

export default async function handler(req, res) {
  const { path } = req.query;
  const segments = Array.isArray(path) ? path : [path];
  const targetUrl = `${BACKEND_ORIGIN}/api/v1/auth/${segments.join('/')}`;

  const forwardHeaders = {};
  for (const [key, value] of Object.entries(req.headers)) {
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

  // Forward Set-Cookie explicitly — the one header the generic
  // vercel.json rewrite drops. getSetCookie() (Node 18.20+/20.4+
  // undici) returns each cookie separately; older runtimes fall back
  // to a single combined header, which is fine since we only ever
  // set one cookie (refreshToken) per auth response.
  const setCookie = upstreamRes.headers.getSetCookie?.() ?? upstreamRes.headers.get('set-cookie');
  if (setCookie) {
    res.setHeader('Set-Cookie', setCookie);
  }

  const contentType = upstreamRes.headers.get('content-type') || 'application/json';
  res.setHeader('Content-Type', contentType);
  res.status(upstreamRes.status);

  const bodyText = await upstreamRes.text();
  res.send(bodyText);
}
