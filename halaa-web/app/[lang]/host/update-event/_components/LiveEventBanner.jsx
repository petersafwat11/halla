"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../../create-event/page.module.css";

/**
 * Renders the live-event status notice banner.
 * Step 2 shows a softer "add-only" notice; all other steps show
 * the full lockout notice.
 */
const LiveEventBanner = ({ currentStep, isEventCompleted }) => {
  const { t } = useTranslation("createEvent");

  return (
    <div role="status" className={styles.live_event_banner}>
      {isEventCompleted
        ? t("ended_event_locked_notice")
        : currentStep === 2
        ? t("live_event_step2_notice")
        : t("live_event_locked_notice")}
    </div>
  );
};

export default LiveEventBanner;
