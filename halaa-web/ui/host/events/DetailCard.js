"use client";
import React from "react";
import styles from "./StatCard.module.css";
import CardLayout from "../../commen/card/CardLayout";

function DetailCard({ icon, label, value, sublabel }) {
  return (
    <CardLayout
      style={{
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div className={styles.iconBox}>
        <img src={icon} alt={label} />
      </div>
      {/* <div className={styles.info}>
        <div className={styles.sublabel}>{sublabel}</div>
      </div> */}
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
    </CardLayout>
  );
}

export default DetailCard;
