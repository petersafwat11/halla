"use client";
import React from "react";
import styles from "../page.module.css";

/**
 * Info-only invitation view (invitationType === "none"). No RSVP, no QR —
 * just a warm "you're invited" message and the event details.
 */
export default function PortalInfoOnly({ guestName, event, formatDate, t }) {
  const dateLine = event.date
    ? `${formatDate(event.date)}${event.time ? ` · ${event.time}` : ""}`
    : "";
  const venue = event.location?.name || event.location?.address || "";

  return (
    <div className={styles.card}>
      <h1 className={styles.successHeading}>
        {t("guestPortal.info.title", "You're invited!")}
      </h1>
      <p className={styles.message}>
        {t(
          "guestPortal.info.body",
          "Welcome, {{name}} — we'd be delighted to have you with us.",
          { name: guestName }
        )}
      </p>

      <div className={styles.pass}>
        <div className={styles.passStub}>
          <p className={styles.passEventTitle}>{event.title}</p>
          {dateLine ? <p className={styles.passEventMeta}>{dateLine}</p> : null}
          {venue ? <p className={styles.passEventMeta}>{venue}</p> : null}
        </div>
      </div>
    </div>
  );
}
