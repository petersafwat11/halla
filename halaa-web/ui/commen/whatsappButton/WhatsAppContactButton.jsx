"use client";

/**
 * WhatsApp customer-service contact button — web.
 *
 * Delegates to canonical buildSupportRequest from @halaa/shared/support.
 */

import React from "react";
import { FaWhatsapp } from "react-icons/fa";
import { buildSupportRequest, SUPPORT_SOURCE } from "@halaa/shared/support";
import styles from "./whatsAppContactButton.module.css";

export default function WhatsAppContactButton({
  language = "ar",
  source = SUPPORT_SOURCE.GENERAL,
  reference = null,
  label,
  className = "",
  variant = "filled",
}) {
  const { webUrl } = buildSupportRequest({ language, source, reference });
  const buttonClass = `${styles.button} ${styles[variant] || styles.filled} ${className}`;

  return (
    <a
      href={webUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClass}
      data-testid="whatsapp-contact-button"
    >
      <FaWhatsapp className={styles.icon} aria-hidden />
      <span>{label || (language === "en" ? "Contact us on WhatsApp" : "تواصل معنا عبر واتساب")}</span>
    </a>
  );
}
