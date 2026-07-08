"use client";

import React from "react";
import styles from "./PageLoading.module.css";

/**
 * Page Loading Component
 * Shows skeleton screens matching the host dashboard layout
 */
const PageLoading = () => {
  return (
    <div className={styles.container}>
      {/* Header Skeleton */}
      <div className={styles.headerSkeleton}>
        <div className={`${styles.skeleton} ${styles.title}`} />
        <div className={`${styles.skeleton} ${styles.subtitle}`} />
      </div>

      {/* Stats Cards Skeleton */}
      <div className={styles.statsGrid}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.cardSkeleton}>
            <div className={`${styles.skeleton} ${styles.icon}`} />
            <div className={`${styles.skeleton} ${styles.value}`} />
            <div className={`${styles.skeleton} ${styles.label}`} />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className={styles.tableSkeleton}>
        <div className={`${styles.skeleton} ${styles.tableHeader}`} />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={styles.tableRow}>
            <div className={`${styles.skeleton} ${styles.cell}`} />
            <div className={`${styles.skeleton} ${styles.cell}`} />
            <div className={`${styles.skeleton} ${styles.cell}`} />
            <div className={`${styles.skeleton} ${styles.cell}`} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PageLoading;
