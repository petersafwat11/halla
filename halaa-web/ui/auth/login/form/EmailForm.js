"use client";

import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import styles from "./form.module.css";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useLanguageChange from "@/hooks/UseLanguageChange";

export default function EmailSection() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation("login");
  const { currentLocale } = useLanguageChange();

  const handleForgotPassword = () => {
    router.push(`/${currentLocale}/forget-password`);
  };
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  return (
    <div className={styles.email_login}>
      <div className={styles.inputs}>
        <InputGroup
          label={t("loginForm.emailLogin.email.label")}
          placeholder={t("loginForm.emailLogin.email.placeholder")}
          type="email"
          name="email"
          required
          iconPath="auth/email.svg"
        />
        <InputGroup
          label={t("loginForm.emailLogin.password.label")}
          placeholder={t("loginForm.emailLogin.password.placeholder")}
          type={showPassword ? "text" : "password"}
          name="password"
          required
          iconPath="auth/password.svg"
          iconPath2="auth/eye.svg"
          onIconClick={togglePasswordVisibility}
        />
      </div>
      <div className={styles.buttons}>
        <button
          type="button"
          onClick={handleForgotPassword}
          className={styles.forgot_password}
        >
          {t("loginForm.emailLogin.forgotPassword")}
        </button>
        <div className={styles.remember_me}>
          <p>{t("loginForm.emailLogin.rememberMe")}</p>
          <input type="checkbox" />
        </div>
      </div>
    </div>
  );
}
