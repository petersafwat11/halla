import React from "react";
import styles from "./header.module.css";

export default function Header({ eventName }) {
  return (
    <div className={styles.headerContainer}>
      <div className={styles.headerCard}>
        <h1 className={styles.eventTitle}>{eventName}</h1>
      </div>
    </div>
  );
}
