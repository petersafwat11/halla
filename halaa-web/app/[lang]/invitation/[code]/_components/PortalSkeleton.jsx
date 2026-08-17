"use client";
import React from "react";
import styles from "../page.module.css";

export default function PortalSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonBlock} style={{ width: "60%" }} />
      <div className={styles.skeletonBlock} style={{ width: "80%" }} />
      <div className={styles.skeletonBlock} style={{ width: "40%" }} />
      <div className={styles.skeletonBlock} style={{ width: "70%" }} />
    </div>
  );
}
