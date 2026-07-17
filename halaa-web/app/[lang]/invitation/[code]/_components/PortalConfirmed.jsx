"use client";
import React from "react";
import { QRCodeCanvas } from "qrcode.react";
import styles from "../page.module.css";

// Our platform logo (same asset as the landing page header).
const DEFAULT_LOGO = "/logo.png";

export default function PortalConfirmed({
  guestName,
  event,
  code,
  guestsCount = 1,
  formatDate,
  onChangeResponse,
  // "confirmed" → post-RSVP confirmation; "pass" → a no-reply (qr_only)
  // invitation where the pass is shown directly with a neutral heading.
  mode = "confirmed",
  // Whether to render the QR entry pass. reply_only (02) confirmations pass
  // false so a confirmed guest sees the message but no QR.
  showQr = true,
  t,
}) {
  const passLogo = DEFAULT_LOGO;
  const dateLine = event.date
    ? `${formatDate(event.date)}${event.time ? ` · ${event.time}` : ""}`
    : "";
  const venue = event.location?.name || event.location?.address || "";
  const isPass = mode === "pass";

  return (
    <div className={styles.card}>
      {/* Heading + welcome message */}
      <h1 className={styles.successHeading}>
        {isPass
          ? t("guestPortal.pass.title", "Your entry pass · بطاقة دخولك")
          : t("guestPortal.confirmed.title", "You're confirmed!")}
      </h1>
      <p className={styles.message}>
        {isPass
          ? t(
              "guestPortal.pass.welcome",
              "Welcome, {{name}} — here is your entry pass.",
              { name: guestName }
            )
          : t(
              "guestPortal.confirmed.welcome",
              "Welcome, {{name}} — we're delighted you'll be joining us.",
              { name: guestName }
            )}
      </p>

      {/* Entry pass (only when this invitation type includes a QR) */}
      {showQr ? (
        <div className={styles.pass}>
          <div className={styles.passHeader}>
            {t("guestPortal.pass.label", "Entry Pass · بطاقة الدخول")}
          </div>

          <p className={styles.passShowCode}>
            {t(
              "guestPortal.pass.showCode",
              "Please show this code to enter · يُرجى إبراز الكود للدخول"
            )}
          </p>

          {/* Logo beside the QR */}
          <div className={styles.passMain}>
            <div className={styles.passLogoWrap}>
              <img
                src={passLogo}
                alt={event.title || "logo"}
                className={styles.passLogo}
              />
            </div>
            <div className={styles.passQr}>
              <QRCodeCanvas value={code} size={168} includeMargin />
            </div>
          </div>

          {/* Guest count below the QR */}
          <div className={styles.passCount}>
            <span className={styles.passCountLabel}>
              {t("guestPortal.pass.guests", "Guests · ضيوف")}
            </span>
            <span className={styles.passCountValue}>{guestsCount}</span>
          </div>

          <div className={styles.passPerforation}>
            <span className={styles.passDashes} />
          </div>

          {/* Event data */}
          <div className={styles.passStub}>
            <p className={styles.passEventTitle}>{event.title}</p>
            {dateLine ? <p className={styles.passEventMeta}>{dateLine}</p> : null}
            {venue ? <p className={styles.passEventMeta}>{venue}</p> : null}
          </div>
        </div>
      ) : (
        /* reply_only confirmation — event details, no QR */
        <div className={styles.pass}>
          <div className={styles.passStub}>
            <p className={styles.passEventTitle}>{event.title}</p>
            {dateLine ? <p className={styles.passEventMeta}>{dateLine}</p> : null}
            {venue ? <p className={styles.passEventMeta}>{venue}</p> : null}
          </div>
        </div>
      )}

      {showQr ? (
        <p className={styles.passNote}>
          {t(
            "guestPortal.pass.keepHandy",
            "Keep this code handy and show it at the door · يُرجى الاحتفاظ بهذا الرمز لإبرازه عند الدخول"
          )}
        </p>
      ) : null}

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
