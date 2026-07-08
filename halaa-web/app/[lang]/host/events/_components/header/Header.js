"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { IoIosArrowForward } from "react-icons/io";
import styles from "./header.module.css";
import Button from "@/ui/commen/button/Button";

const Header = () => {
  const { t, i18n } = useTranslation("home-events");
  const router = useRouter();
  const { lang } = useParams();
  const isArabic = i18n.language === "ar";

  const handleCreateEvent = () => {
    router.push(`/${lang}/host/create-event`);
  };

  return (
    <div className={styles.topSection}>
      <h2 className={styles.title}>
        <IoIosArrowForward
          onClick={() => router.push(`/${lang}/host`)}
          className={`${styles.backArrow} ${isArabic ? "" : styles.backArrowLtr}`}
        />
        {t("events.title")}
      </h2>
      <Button
        variant="primary"
        title={t("toolbar.createEvent")}
        onClick={handleCreateEvent}
        className={styles.createButton}
      />
    </div>
  );
};

export default Header;
