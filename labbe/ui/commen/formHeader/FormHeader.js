import React, { useState } from "react";
import styles from "./formHeader.module.css";
import UseLanguageChange from "@/hooks/UseLanguageChange";
const FormHeader = () => {
  const { currentLocale, handleChange } = UseLanguageChange();

  return (
    <div className={styles.form_header}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <h1 className={styles.title}>
            <p className={styles.logo}>
              <span className={styles.logo_text}>L</span>
            </p>
            <span className={styles.arabic_title}> لبّى </span> Labbe
          </h1>
        </div>
                {/* <div className={styles.languages}>
          <p
            className={currentLocale === "ar" ? styles.active : styles.arabic}
            onClick={() => {
              handleChange("ar");
            }}
          >
            العربية
          </p>
          <p
            className={currentLocale === "en" ? styles.active : styles.english}
            onClick={() => {
              handleChange("en");
            }}
          >
            {" "}
            English
          </p>
        </div> */}

        <div className={styles.languages}>
          <p
            className={currentLocale === "ar" ? styles.active : styles.arabic}
            onClick={() => {
              handleChange("ar");
            }}
          >
            العربية
          </p>
          <p
            className={currentLocale === "en" ? styles.active : styles.english}
            onClick={() => {
              handleChange("en");
            }}
          >
            {" "}
            English
          </p>
        </div>
      </div>
    </div>
  );
};

export default FormHeader;
