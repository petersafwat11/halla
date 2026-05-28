"use client";

import { FiMail, FiPhone, FiClock } from "react-icons/fi";
import styles from "./WhitelabelDetailsContent.module.css";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" }) : "\u2014";

export default function WhitelabelContactInfo({ wl, t }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>{t("info.contactInfo", "Contact Information")}</h3>
      <div className={styles.infoList}>
        <div className={styles.infoRow}>
          <div className={styles.infoIcon}><FiPhone size={15} /></div>
          <div>
            <div className={styles.infoLabel}>{t("info.phoneNumber", "Phone Number")}</div>
            <div className={styles.infoValue} dir="ltr" style={{ unicodeBidi: "embed" }}>{wl?.phoneNumber || "\u2014"}</div>
          </div>
        </div>
        <div className={styles.infoRow}>
          <div className={styles.infoIcon}><FiMail size={15} /></div>
          <div>
            <div className={styles.infoLabel}>{t("info.email", "Email")}</div>
            <div className={styles.infoValue}>{wl?.email || "\u2014"}</div>
          </div>
        </div>
        <div className={styles.infoRow}>
          <div className={styles.infoIcon}><FiClock size={15} /></div>
          <div>
            <div className={styles.infoLabel}>{t("info.joinDate", "Join Date")}</div>
            <div className={styles.infoValue}>{fmtDate(wl?.createdAt)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
