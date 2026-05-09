// Same-origin proxy for cross-origin image bytes. Used by the Step 3
// template baker (html2canvas) so the canvas never depends on the
// upstream bucket's CORS configuration. Restricts to http(s) URLs.

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

  let upstream;
  try {
    upstream = await fetch(parsed.toString(), { cache: "no-store" });
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
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
