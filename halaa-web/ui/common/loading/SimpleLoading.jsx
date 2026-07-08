"use client";

import React from "react";
import styles from "./SimpleLoading.module.css";

/**
 * Simple Loading Spinner Component
 * A clean, minimal loading spinner using brand colors
 */
const SimpleLoading = ({ message }) => {
  return (
    <div className={styles.container}>
      <div className={styles.spinner} />
      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
};

export default SimpleLoading;
