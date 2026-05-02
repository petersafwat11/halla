"use client";
import React from "react";
import styles from "./listItem.module.css";

export default function ListItem({ guest, handleGuestClick }) {
  const { name = "احمد كمال سمير", phone = "966656555", email = "ads@outlook.com" } = guest || {};

  return (
    <div className={styles.guestCard}>
      <div onClick={() => handleGuestClick(guest)} className={styles.cardContainer}>
        <div className={styles.contentWrapper}>
          <div className={styles.infoColumn}>
            <div className={styles.nameContainer}>
              <h3 className={styles.guestName}>{name}</h3>
            </div>
            <div className={styles.contactInfo}>
              <div className={styles.contactGroup}>
                <div className={styles.phoneContainer}>
                  <span className={styles.phone}>{phone}</span>
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
