"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { IoIosArrowForward } from "react-icons/io";
import styles from "./PaymentsHeader.module.css";

const PaymentsHeader = () => {
  const { t, i18n } = useTranslation("hostPayments");
  const router = useRouter();
  const { lang } = useParams();
  const isArabic = i18n.language === "ar";

  return (
    <div className={styles.header}>
      <h1 className={styles.title}>
        <IoIosArrowForward
          onClick={() => router.push(`/${lang}/host`)}
          style={{
            transform: isArabic ? "rotate(0deg)" : "rotate(180deg)",
            cursor: "pointer",
            fontSize: "2.4rem",
          }}
        />
        {t("title") || "المدفوعات"}
      </h1>
    </div>
  );
};

export default PaymentsHeader;
