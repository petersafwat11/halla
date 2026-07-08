"use client";
import React from "react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./formBottom.module.css";
import Image from "next/image";
import { useTranslation } from "react-i18next";
const FormBottom = ({ text, clickHandler }) => {
  const router = useRouter();
  const pathname = usePathname();
  const lang = pathname?.split("/")[1] === "en" ? "en" : "ar";
  const { t } = useTranslation("login");

  return (
    <div className={styles.container}>
      {/* <p className={styles.or}>{t("loginForm.formBottom.orContinueWith")}</p> */}
      <button onClick={clickHandler} className={styles.toggle_button}>
        {text}
        <Image
          src={`/svg/auth/mobile.svg`}
          alt="arrow"
          width={16}
          height={20}
        />
      </button>
      <button className={styles.sign_up_button}>
        {t("loginForm.formBottom.noAccount")}{" "}
        <span
          onClick={() => router.push(`/${lang}/signup`)}
          className={styles.make_acc}
        >
          {t("loginForm.formBottom.createAccount")}
        </span>
      </button>
    </div>
  );
};

export default FormBottom;
