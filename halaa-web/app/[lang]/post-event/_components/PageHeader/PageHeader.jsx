"use client";
import React from "react";
import styles from "./pageHeader.module.css";

const PageHeader = ({ title }) => {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
    </div>
  );
};

export default PageHeader;
