"use client";
import React from "react";
import styles from "./stepTitleAndDesc.module.css";

const StepTitleAndDesc = ({ title, Button }) => {
  return (
    <div className={styles.step_header}>
      <div className={styles.content}>
        {/* <h2 className={styles.title}>{title}</h2> */}
        {Button && Button}
      </div>
    </div>
  );
};

export default StepTitleAndDesc;
