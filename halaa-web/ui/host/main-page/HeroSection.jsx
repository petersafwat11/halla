"use client";
import React from "react";
import styles from "./HeroSection.module.css";
import Button from "@/ui/commen/button/Button";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import UseLanguageChange from "@/hooks/UseLanguageChange";
import Image from "next/image";

function HeroSection() {
  const { t } = useTranslation("home-events");
  const router = useRouter();
  const { currentLocale } = UseLanguageChange();

  const handleCreateEvent = () => {
    router.push(`/${currentLocale}/host/create-event`);
  };

  return (
    <div className={styles.heroContainer}>
      <div className={styles.heroContent}>
        <div className={styles.heroText}>
          <div className={styles.welcomeIcon}>
            <Image
              className={styles.welcomeIcon}
              src="/svg/events/hello-2.svg"
              alt="hello"
              width={75}
              height={75}
            />
          </div>
          <div className={styles.text}>
            <h1 className={styles.title}>{t("hero.welcome")}</h1>
            <p className={styles.subtitle}>{t("hero.readyToOrganize")}</p>
          </div>
        </div>
        <div className={styles.heroActions}>
          <div className={styles.actionCard}>
            <Button
              variant="secondary"
              title={t("hero.createEvent")}
              onClick={handleCreateEvent}
              className={styles.createButton}
            />
            <p className={styles.trialText}>{t("hero.freeTrial")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroSection;
