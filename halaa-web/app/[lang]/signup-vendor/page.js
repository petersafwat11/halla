import VendorSignup from "@/ui/auth/signup/vendor/VendorSignup";
import Header from "@/ui/landing/Header/Header";

const SignupVendorPage = async ({ params }) => {
  const { lang } = await params;
  return (
    <>
      <Header lang={lang} variant="minimal" />
      <VendorSignup />
    </>
  );
};

export default SignupVendorPage;
