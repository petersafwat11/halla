"use client";
import { useTranslation } from "react-i18next";
import { FaHandshake, FaStar } from "react-icons/fa";
import styles from "./PlanTypeSelector.module.css";

const PlanTypeSelector = ({ value, onChange }) => {
  const { t } = useTranslation("plans");
  return (
    <div className={styles.planTypeTabs}>
      <button
        type="button"
        className={`${styles.planTypeTab} ${value === "direct" ? styles.active : ""}`}
        onClick={() => onChange("direct")}
      >
        <FaHandshake />
        <span>{t("planTypes.direct")}</span>
      </button>
      <button
        type="button"
        className={`${styles.planTypeTab} ${value === "managed" ? styles.active : ""}`}
        onClick={() => onChange("managed")}
      >
        <FaStar />
        <span>{t("planTypes.managed")}</span>
      </button>
    </div>
  );
};

export default PlanTypeSelector;
