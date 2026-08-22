// Same-origin proxy for the Step 3 template baker. It is intentionally
// allowlisted: an open URL proxy would permit SSRF against internal services.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response("missing url", { status: 400 });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return new Response("invalid url", { status: 400 });
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return new Response("invalid protocol", { status: 400 });
  }

  const configuredHosts = [
    process.env.BACKEND_PROXY_URL,
    process.env.INTERNAL_API_URL,
    process.env.NEXT_PUBLIC_API_URL,
  ]
    .map((value) => {
      try { return value ? new URL(value, request.url).hostname : null; }
      catch { return null; }
    })
    .filter(Boolean);
  const assetHosts = (process.env.TEMPLATE_IMAGE_ALLOWED_HOSTS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const allowedHosts = new Set([
    "halaa.com.sa",
    "www.halaa.com.sa",
    ...configuredHosts,
    ...assetHosts,
    ...(process.env.NODE_ENV === "development" ? ["localhost", "127.0.0.1"] : []),
  ]);
  if (!allowedHosts.has(parsed.hostname)) {
    return new Response("host not allowed", { status: 403 });
  }

  const headers = {};
  const cookie = request.headers.get("cookie");
  const authorization = request.headers.get("authorization");
  if (cookie) headers.cookie = cookie;
  if (authorization) headers.authorization = authorization;

  let upstream;
  try {
    upstream = await fetch(parsed.toString(), {
      cache: "no-store",
      headers,
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return new Response("fetch failed", { status: 502 });
  }
  if (!upstream.ok) {
    return new Response("upstream error", { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") || "image/png";
  if (!contentType.startsWith("image/")) {
    return new Response("not an image", { status: 415 });
  }

  const buf = await upstream.arrayBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": contentType,
      // The upstream may be a protected template asset fetched with the
      // caller's HttpOnly cookie. Never place it in a shared/public cache.
      "Cache-Control": "private, no-store",
    },
  });
}
