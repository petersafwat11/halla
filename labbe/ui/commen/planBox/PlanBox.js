import React from "react";
import styles from "./planBox.module.css";

const PlanBox = ({ title, description, buttonText, noicon }) => {
  return (
    <div className={styles.planBox}>
      {/* No crown icon available, use emoji as placeholder */}
      <div className={styles.planHeader}>
        {!noicon && (
          <span role="img" aria-label="crown">
            <img src="/svg/events/crown.svg" alt="crown" />
          </span>
        )}
        <span>{title}</span>
      </div>
      <div className={styles.planDesc}>{description}</div>
      <button className={styles.upgradeBtn}>{buttonText}</button>
    </div>
  );
};

export default PlanBox;
