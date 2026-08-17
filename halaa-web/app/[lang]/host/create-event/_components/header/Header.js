"use client";
import React from "react";
import styles from "./header.module.css";
import Image from "next/image";

const Header = ({ title, description, buttonText, onButtonClick }) => {
  return (
    <div className={styles.header}>
      <div className={styles.header_content}>
        <div className={styles.left_section}>
          <button
            type="button"
            className={styles.back_button}
            onClick={onButtonClick}
            aria-label="back"
          >
            <Image
              src="/svg/admin/arrow-right.svg"
              alt="back"
              width={24}
              height={24}
            />
          </button>

          <div className={styles.title_section}>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.description}>{description}</p>
          </div>
        </div>
        {/* {buttonText && (
          <button className={styles.cta_button} onClick={onButtonClick}>
            {buttonText}
          </button>
        )} */}
      </div>
    </div>
  );
};

export default Header;
