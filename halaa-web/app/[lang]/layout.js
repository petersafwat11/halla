import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { amiri, cairo, greatVibes } from "@/app/[lang]/fonts";
import GlobalProvider from "@/providers";
import ReactQueryProvider from "@/providers/ReactQueryProvider";
import { i18nRouterConfig } from "@/localization/i18nRouterConfig";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/scrollbar";
import "swiper/css/effect-fade";
import "swiper/css/effect-coverflow";
import "swiper/css/effect-flip";
import "swiper/css/effect-cube";
import {
  CANONICAL_ORIGIN,
  BRAND_NAME,
  DEFAULT_METADATA,
  BRAND_ASSETS,
  OG_LOCALE,
  hreflangAlternates,
} from "@halla/shared/brand";

/**
 * Localized root metadata (SEO-ASO-METADATA-PLAN §3.1). `metadataBase` makes all
 * relative OG/icon URLs (opengraph-image, /logo.png) resolve absolutely. The
 * default title/description are localized per `lang` so English routes are never
 * served Arabic-only defaults.
 *
 * DEFAULT-DENY robots (`index:false`): metadata inherits down the App-Router
 * tree and `robots` is replace-on-override, so EVERY route inherits noindex
 * unless it explicitly opts in. The only pages that opt in are the indexable
 * public ones — landing/marketplace/vendor (via `buildMetadata` →
 * `robotsFor(INDEXABLE)`) and the Session-5 legal routes (`legalMetadata.js`).
 * This makes an indexable private/token/auth/dashboard route structurally
 * impossible unless someone explicitly writes `index:true` on it — closing the
 * "private/token routes cannot leak or index" gate by construction, not by
 * per-route bookkeeping (§2, §11).
 */
export async function generateMetadata(props) {
  const { lang } = await props.params;
  const loc = DEFAULT_METADATA[lang] || DEFAULT_METADATA.ar;
  return {
    metadataBase: new URL(CANONICAL_ORIGIN),
    title: {
      default: loc.title,
      template: loc.titleTemplate,
    },
    description: loc.description,
    applicationName: BRAND_NAME.siteName,
    manifest: "/manifest.webmanifest",
    robots: { index: false, follow: false },
    alternates: {
      canonical: `/${lang}`,
      languages: hreflangAlternates(""),
    },
    openGraph: {
      title: loc.title,
      description: loc.description,
      siteName: BRAND_NAME.siteName,
      locale: OG_LOCALE[lang] || OG_LOCALE.ar,
      type: "website",
    },
    twitter: { card: "summary_large_image", title: loc.title, description: loc.description },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport = {
  themeColor: BRAND_ASSETS.themeColor,
  colorScheme: "light",
};

export default async function RootLayout(props) {
  const params = await props.params;

  const { lang } = params;
  const direction = i18nRouterConfig.getDirection(lang);

  const { children } = props;
  return (
    <html lang={lang} dir={direction}>
      <ReactQueryProvider>
        <GlobalProvider lang={lang}>
          <body
            // style={{ backgroundColor: "#f4efe9" }}
            className={`${cairo.className} ${cairo.variable} ${amiri.variable} ${greatVibes.variable}`}
          >
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={direction === "rtl"}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
            {children}
          </body>
        </GlobalProvider>
      </ReactQueryProvider>
    </html>
  );
}
