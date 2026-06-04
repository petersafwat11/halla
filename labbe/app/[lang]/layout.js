import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cairo, greatVibes } from "@/app/[lang]/fonts";
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
export const metadata = {
  title: "هلا — منصة إدارة المناسبات الذكية | Halaa",
  description: "أنشئ مناسباتك، أرسل دعوات رقمية عبر واتساب، وتتبع الحضور في الوقت الفعلي.",
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
            className={`${cairo.className} ${greatVibes.variable}`}
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
