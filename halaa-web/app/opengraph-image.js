/**
 * app/opengraph-image.js — default social-share image (SEO-ASO-METADATA-PLAN
 * §3.3 "default Open Graph image ... fallbacks").
 *
 * Generated at build time with next/og `ImageResponse` so no binary asset needs
 * to be committed and it always resolves absolutely via `metadataBase`. Text is
 * intentionally LATIN ("Halaa") — `ImageResponse`'s built-in font does not carry
 * Arabic glyphs, and bundling a font here would risk the offline build. The
 * brand colors match `@halaa/shared/brand`. This is a truthful brand card (no
 * fabricated claims/ratings).
 */

import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Halaa — Smart Event Management";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#c28e5c",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 140, fontWeight: 700, letterSpacing: -2 }}>Halaa</div>
        <div style={{ fontSize: 40, color: "#3f3a34", marginTop: 12 }}>
          Smart Event Management
        </div>
        <div style={{ fontSize: 28, color: "#8a8378", marginTop: 8 }}>halaa.com.sa</div>
      </div>
    ),
    { ...size }
  );
}
