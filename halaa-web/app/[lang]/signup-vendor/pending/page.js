import VendorPendingApproval from "@/ui/auth/signup/vendor/VendorPendingApproval";
import Header from "@/ui/landing/Header/Header";

const VendorPendingPage = async ({ params }) => {
  const { lang } = await params;
  return (
    <>
      <Header lang={lang} variant="minimal" />
      <VendorPendingApproval lang={lang} />
    </>
  );
};

export default VendorPendingPage;
