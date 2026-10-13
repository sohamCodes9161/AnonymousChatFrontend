// Vercel Serverless Function (Web-standard fetch handler — Vercel's
// currently recommended shape, see https://vercel.com/docs/functions/runtimes/node-js).
// Deliberately a single, non-dynamic file (no [...bracket] route): the
// previous nested-bracket catch-all route did not reliably populate
// its path params in this runtime, which was silently forwarding
// `/api/v1/auth/` (no segment) to the backend. vercel.json now rewrites
// `/api/v1/auth/:path*` to `/api/auth?path=:path*`, passing the
// segment explicitly as a query string value — a plain, well-documented
// mechanism with nothing left to framework-specific path-parsing magic.
//
// WHY THIS FUNCTION EXISTS AT ALL: a declarative vercel.json rewrite to
// an EXTERNAL destination (Render) does not reliably forward the
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

export default async function handler(request) {
  const url = new URL(request.url);
  const path = url.searchParams.get('path') || '';
  const targetUrl = `${BACKEND_ORIGIN}/api/v1/auth/${path}`;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const hasBody = !['GET', 'HEAD'].includes(request.method);

  let upstreamRes;
  try {
    upstreamRes = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? await request.text() : undefined,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'PROXY_UNREACHABLE', message: 'Could not reach the auth backend' },
      }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    );
  }

  const responseHeaders = new Headers();
  const contentType = upstreamRes.headers.get('content-type');
  if (contentType) responseHeaders.set('content-type', contentType);

  // getSetCookie() (Node 18.20+/20.4+ undici) returns each cookie as a
  // separate string; older runtimes fall back to one combined header,
  // which is fine here since we only ever set one cookie per response.
  const setCookie = upstreamRes.headers.getSetCookie?.() ?? upstreamRes.headers.get('set-cookie');
  if (setCookie) {
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const cookie of cookies) responseHeaders.append('set-cookie', cookie);
  }

  const bodyText = await upstreamRes.text();
  return new Response(bodyText, { status: upstreamRes.status, headers: responseHeaders });
}
