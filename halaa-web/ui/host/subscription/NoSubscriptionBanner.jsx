"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { FaRegCalendarTimes } from "react-icons/fa";
import Button from "@/ui/commen/button/Button";
import styles from "./NoSubscriptionBanner.module.css";

/**
 * Banner shown to business accounts that have no active subscription yet.
 *
 * Business accounts cannot self-purchase their first plan — an admin must
 * activate one. This banner surfaces that "activate a plan / contact admin"
 * state and is reused both on the plans page and as a create-event gate.
 *
 * Strings live under the "plans" namespace (`business.noSub.*`).
 */
const NoSubscriptionBanner = ({ onAction, showAction = false }) => {
  const { t } = useTranslation("plans");
  const router = useRouter();
  const { lang } = useParams();

  const handleAction = () => {
    if (onAction) {
      onAction();
      return;
    }
    router.push(`/${lang}/host/plans`);
  };

  return (
    <div className={styles.banner} role="status">
      <div className={styles.iconWrap}>
        <FaRegCalendarTimes className={styles.icon} />
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{t("business.noSub.title")}</h3>
        <p className={styles.text}>{t("business.noSub.message")}</p>
      </div>
      {showAction && (
        <Button
          variant="primary"
          title={t("business.noSub.cta")}
          onClick={handleAction}
          className={styles.action}
        />
      )}
    </div>
  );
};

export default NoSubscriptionBanner;
