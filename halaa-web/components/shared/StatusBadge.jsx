"use client";
import React from "react";
import { getStatusVisual } from "@/utils/statusColors";
import styles from "./StatusBadge.module.css";

/**
 * StatusBadge — unified status pill.
 *
 * Colors come from the shared status→tone map (utils/statusColors.js), so a
 * given status renders the SAME color here and on mobile. Pass the raw status
 * for color resolution and a human label as `text`/children for display.
 *
 * @param {string} props.status  Raw status value (e.g. "confirmed", "completed").
 * @param {string} [props.domain] Optional domain for overrides ("payment" | "subscription" | "delivery").
 * @param {React.ReactNode} [props.text] Display label (falls back to children, then status).
 */
const StatusBadge = ({ status, domain, text, children, className = "", style }) => {
  const { fg, bg } = getStatusVisual(status, domain);
  return (
    <div
      className={`${styles.badge} ${className}`.trim()}
      style={{ background: bg, ...style }}
    >
      <span style={{ color: fg }}>{text ?? children ?? status}</span>
    </div>
  );
};

export default StatusBadge;
