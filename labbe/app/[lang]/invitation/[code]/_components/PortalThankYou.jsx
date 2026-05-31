"use client";
import React from "react";
import styles from "../page.module.css";

export default function PortalThankYou({
  response,
  guestName,
  event,
  whitelabel,
  logoUrl,
  onChangeResponse,
  t,
}) {
  const isDeclined = response === "declined";
  return (
    <div className={styles.card}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={whitelabel.name || event.title || ""}
          className={styles.logo}
        />
      ) : null}
      <h1 className={styles.successHeading}>
        {isDeclined
          ? t("guestPortal.declined.title", "Thank you for letting us know")
          : t("guestPortal.maybe.title", "Thank you — your response is saved")}
      </h1>
      <p className={styles.message}>
        {isDeclined
          ? t(
              "guestPortal.declined.body",
              "We'll truly miss you, {{name}}. Thank you for taking the time to reply — you're welcome anytime.",
              { name: guestName }
            )
          : t(
              "guestPortal.maybe.body",
              "We've saved your reply, {{name}}. Come back anytime to confirm if your plans change.",
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
