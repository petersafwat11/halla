"use client";
import React from "react";
import styles from "./header.module.css";

export default function Header({ eventName = "مناسبة زفاف ابراهيم كامل" }) {
  return (
    <div className={styles.headerContainer}>
      <div className={styles.headerCard}>
        <h1 className={styles.eventTitle}>{eventName}</h1>
      </div>
    </div>
  );
}
