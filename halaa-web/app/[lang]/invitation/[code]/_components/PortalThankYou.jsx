"use client";
import React from "react";
import styles from "../page.module.css";

export default function PortalThankYou({
  guestName,
  onChangeResponse,
  t,
}) {
  return (
    <div className={styles.card}>
      <h1 className={styles.successHeading}>
        {t("guestPortal.declined.title", "Thank you for letting us know")}
      </h1>
      <p className={styles.message}>
        {t(
          "guestPortal.declined.body",
          "We'll truly miss you, {{name}}. Thank you for taking the time to reply — you're welcome anytime.",
          { name: guestName }
        )}
      </p>

      {onChangeResponse ? (
        <button
          type="button"
          className={styles.changeLink}
          onClick={onChangeResponse}
        >
          {t("guestPortal.actions.change", "Change my response")}
        </button>
      ) : null}
    </div>
  );
}
