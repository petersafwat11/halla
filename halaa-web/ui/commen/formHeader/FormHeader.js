import React, { useState } from "react";
import Image from "next/image";
import styles from "./formHeader.module.css";
import UseLanguageChange from "@/hooks/UseLanguageChange";
const FormHeader = () => {
  const { currentLocale, handleChange } = UseLanguageChange();

  return (
    <div className={styles.form_header}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <Image
            src="/logo.png"
            alt="Halaa"
            width={60}
            height={60}
            priority
          />
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
