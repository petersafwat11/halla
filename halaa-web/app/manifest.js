/**
 * app/manifest.js — Next.js web app manifest (SEO-ASO-METADATA-PLAN §3.3).
 *
 * Emits /manifest.webmanifest. Uses the owner-provided brand logo
 * (`public/logo.png`, 1024×1024) as the app icon and the canonical brand
 * name/colors from `@halla/shared/brand`. Bilingual name uses the Arabic default
 * (site default locale) with English in the description.
 */

import { BRAND_NAME, BRAND_ASSETS } from "@halla/shared/brand";

export default function manifest() {
  return {
    name: `${BRAND_NAME.ar} — Halaa`,
    short_name: BRAND_NAME.siteName,
    description:
      "منصة إدارة المناسبات الذكية — Smart event management, digital invitations, and vendor marketplace.",
    start_url: "/",
    display: "standalone",
    background_color: BRAND_ASSETS.backgroundColor,
    theme_color: BRAND_ASSETS.themeColor,
    dir: "auto",
    lang: "ar",
    icons: [
      {
        src: BRAND_ASSETS.logo, // /logo.png (1024×1024, transparent-safe)
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: BRAND_ASSETS.logo,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
