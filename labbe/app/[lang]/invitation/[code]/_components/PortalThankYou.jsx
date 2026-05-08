"use client";
import React from "react";
import styles from "../page.module.css";

export default function PortalThankYou({
  response,
  event,
  whitelabel,
  logoUrl,
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
          : t("guestPortal.maybe.title", "Thank you for your response")}
      </h1>
      <p className={styles.message}>
        {isDeclined
          ? t(
              "guestPortal.declined.body",
              "We'll miss you. Thank you for replying."
            )
          : t(
              "guestPortal.maybe.body",
              "We've noted your response. You can update it later if you change your mind."
            )}
      </p>
    </div>
  );
}
