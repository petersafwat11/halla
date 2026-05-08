"use client";
import React from "react";
import { QRCodeCanvas } from "qrcode.react";
import styles from "../page.module.css";

export default function PortalConfirmed({
  guestName,
  event,
  whitelabel,
  logoUrl,
  code,
  formatDate,
  t,
}) {
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
        {t("guestPortal.confirmed.title", "You're confirmed!")}
      </h1>
      <p className={styles.message}>
        {t(
          "guestPortal.confirmed.welcome",
          "Welcome, {{name}}! We can't wait to see you. Show this QR at the door.",
          { name: guestName }
        )}
      </p>
      <div className={styles.qrWrap}>
        <QRCodeCanvas value={code} size={208} includeMargin />
      </div>
      <p className={styles.message}>
        <strong>{event.title}</strong>
        {event.date ? ` · ${formatDate(event.date)}` : ""}
      </p>
    </div>
  );
}
