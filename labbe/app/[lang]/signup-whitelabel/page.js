import WhiteLabelForm from "@/ui/auth/signup/whiteLabel/WhiteLabelForm";
import Header from "@/ui/landing/Header/Header";
import styles from "./page.module.css";

const SignupWhitelabelPage = async ({ params }) => {
  const { lang } = await params;
  return (
    <>
      <Header lang={lang} variant="minimal" />
      <div className={styles.wrapper}>
        <WhiteLabelForm />
      </div>
    </>
  );
};

export default SignupWhitelabelPage;
