"use client";
import React from "react";
import styles from "./listItem.module.css";

export default function ListItem({ guest, onGuestClick }) {
  const { name, phone, email } = guest || {};

  return (
    <div className={styles.guestCard}>
      <div onClick={() => onGuestClick(guest)} className={styles.cardContainer}>
        <div className={styles.contentWrapper}>
          <div className={styles.infoColumn}>
            <div className={styles.nameContainer}>
              <h3 className={styles.guestName}>{name}</h3>
            </div>
            <div className={styles.contactInfo}>
              <div className={styles.contactGroup}>
                <div className={styles.phoneContainer}>
                  <span className={styles.phone} dir="ltr" style={{ unicodeBidi: "embed", display: "inline-block" }}>{phone}</span>
                </div>
                <div className={styles.divider}>
                  <span className={styles.dividerText}>|</span>
                </div>
              </div>
              <div className={styles.emailContainer}>
                <span className={styles.email}>{email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
