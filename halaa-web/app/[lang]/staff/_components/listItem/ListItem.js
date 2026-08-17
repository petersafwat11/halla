"use client";
import React from "react";
import { getStatusVisual } from "@/utils/statusColors";
import styles from "./listItem.module.css";

const STATUS_CONFIG = {
  checked_in: { labelKey: "filters.checkedIn" },
  confirmed: { labelKey: "filters.confirmed" },
  declined: { labelKey: "filters.declined" },
  invited: { labelKey: "filters.invited" },
};

export default function ListItem({ guest, onGuestClick, t }) {
  const { name, phone, email, status, checkIn } = guest || {};

  const effectiveStatus = checkIn?.checkedInAt ? "checked_in" : status;
  const statusConfig = STATUS_CONFIG[effectiveStatus];
  const statusVisual = statusConfig ? getStatusVisual(effectiveStatus) : null;

  return (
    <div className={styles.guestCard}>
      <div onClick={() => onGuestClick(guest)} className={styles.cardContainer}>
        <div className={styles.contentWrapper}>
          <div className={styles.infoColumn}>
            <div className={styles.nameContainer}>
              <h3 className={styles.guestName}>{name}</h3>
            </div>
            <div className={styles.contactInfo}>
              {phone && (
                <span
                  className={styles.phone}
                  dir="ltr"
                  style={{ unicodeBidi: "embed", display: "inline-block" }}
                >
                  {phone}
                </span>
              )}
              {phone && email && (
                <span className={styles.dividerText}>|</span>
              )}
              {email && <span className={styles.email}>{email}</span>}
            </div>
          </div>
        </div>

        {statusConfig && t && (
          <span
            className={styles.statusBadge}
            style={{
              background: statusVisual.bg,
              color: statusVisual.fg,
            }}
          >
            {t(statusConfig.labelKey)}
          </span>
        )}
      </div>
    </div>
  );
}
