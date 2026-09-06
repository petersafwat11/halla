import React from "react";
import styles from "./title.module.css";
import AuthIcon from "../icons/AuthIcon";
import { FaArrowRightLong } from "react-icons/fa6";

const SectionTitle = ({ title, icon, height, width }) => {
  const IconComponent = typeof icon === "function" ? icon : null;
  return (
    <h3 className={styles.section_title}>
      {IconComponent ? (
        <IconComponent
          className={styles.section_icon}
          size={width || height || 24}
          aria-hidden="true"
        />
      ) : icon ? (
        <AuthIcon
          src={icon ?? "/svg/auth/document-copy.svg"}
          alt=""
          width={width}
          height={height}
        />
      ) : null}
      {title}
    </h3>
  );
};

export default SectionTitle;

export const StepTitle = ({ title, description, onArrowClick }) => {
  return (
    <div className={styles.step_text}>
      <h3 className={styles.step_title}>
        {onArrowClick && (
          <button
            type="button"
            className={styles.step_arrow_button}
            onClick={onArrowClick}
            aria-label={title}
          >
            <FaArrowRightLong className={styles.step_arrow_icon} />
          </button>
        )}
        {title}
      </h3>
      <p className={styles.step_description}>{description}</p>
    </div>
  );
};
