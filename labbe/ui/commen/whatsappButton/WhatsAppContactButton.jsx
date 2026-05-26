"use client";

/**
 * WhatsApp customer-service contact button (Phase 3c.3).
 *
 * Reusable across the failure UI (Phase 3c.4), Phase 4 mobile-parity work,
 * and Phase 5 polish. Generates a `wa.me/<number>?text=<msg>` link.
 *
 * The customer-service number is centralized here. The current value
 * matches the placeholder used elsewhere in landing UI; replace
 * `WHATSAPP_CONTACT_NUMBER` with the production number when known.
 */

import React from "react";
import { FaWhatsapp } from "react-icons/fa";
import styles from "./whatsAppContactButton.module.css";

const WHATSAPP_CONTACT_NUMBER = process.env.NEXT_PUBLIC_HALLA_WHATSAPP_NUMBER || "966551324939";

export default function WhatsAppContactButton({
  contextMessage = "",
  label,
  className = "",
  variant = "filled",
}) {
  const text = encodeURIComponent(contextMessage || "");
  const href = `https://wa.me/${WHATSAPP_CONTACT_NUMBER}${text ? `?text=${text}` : ""}`;
  const buttonClass = `${styles.button} ${styles[variant] || styles.filled} ${className}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClass}
      data-testid="whatsapp-contact-button"
    >
      <FaWhatsapp className={styles.icon} aria-hidden />
      <span>{label || "تواصل معنا عبر واتساب"}</span>
    </a>
  );
}

export { WHATSAPP_CONTACT_NUMBER };
