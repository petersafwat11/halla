"use client";
import React from "react";
import styles from "./mobilePreviewButton.module.css";
import Image from "next/image";
import { useTranslation } from 'react-i18next';

const MobilePreviewButton = ({ onClick }) => {
  const { t } = useTranslation('createEvent');
  return (
    <button
      type="button"
      className={styles.mobile_preview_button}
      onClick={onClick}
    >
      <div className={styles.button_content}>
        <h3 className={styles.button_title}>{t('preview_title', 'معاينة الدعوة')}</h3>
      </div>
      <Image
        src="/svg/events/eye.svg"
        alt="preview"
        width={20}
        height={20}
        className={styles.eye_icon}
      />
    </button>
  );
};

export default MobilePreviewButton;
