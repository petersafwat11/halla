import React from "react";
import { useTranslation } from "react-i18next";
import styles from "./greating.module.css";

const Greating = () => {
  const { t } = useTranslation("login");

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t("loginForm.greeting.title")}</h2>
      <p className={styles.login_text}>{t("loginForm.greeting.subtitle")}</p>
    </div>
  );
};

export default Greating;
