import Header from "@/ui/landing/Header/Header";
import Footer from "@/ui/landing/Footer/Footer";

export default async function MarketPlaceLayout({ children, params }) {
  const { lang } = await params;
  return (
    <>
      <Header lang={lang} />
      {children}
      <Footer lang={lang} />
    </>
  );
}
