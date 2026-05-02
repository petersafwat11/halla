"use client";
import React from "react";
import styles from "./ServiceSkeleton.module.css";

const ServiceSkeleton = () => {
  return (
    <div className={styles.skeleton}>
      <div className={styles.image} />
      <div className={styles.content}>
        <div className={styles.rating}>
          <div className={styles.stars} />
          <div className={styles.reviews} />
        </div>
        <div className={styles.title} />
        <div className={styles.location} />
        <div className={styles.tags}>
          <div className={styles.tag} />
          <div className={styles.tag} />
        </div>
        <div className={styles.footer}>
          <div className={styles.price} />
          <div className={styles.button} />
        </div>
      </div>
    </div>
  );
};

export default ServiceSkeleton;
