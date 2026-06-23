"use client";
import React from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import styles from "./settingsPrimitives.module.css";

/**
 * Shared presentational primitives for the vendor settings read views.
 * They carry no business logic — every section keeps its own handlers,
 * hooks, schemas and edit popups. These just give the page one consistent,
 * token-based, responsive look so individual sections don't each re-invent
 * (and break) the card / field / thumbnail markup.
 */

/** White card with a title + optional edit button, and a body slot. */
export const SectionCard = ({ title, onEdit, children, className = "" }) => {
  const { t } = useTranslation("vendorSettings");
  return (
    <section className={`${styles.card} ${className}`}>
      <header className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{title}</h2>
        {onEdit && (
          <button
            type="button"
            className={styles.editBtn}
            onClick={onEdit}
            aria-label={t("buttons.edit")}
          >
            <Image src="/svg/vendor/edit.svg" alt="" width={18} height={18} />
            <span className={styles.editBtnText}>{t("buttons.edit")}</span>
          </button>
        )}
      </header>
      <div className={styles.cardBody}>{children}</div>
    </section>
  );
};

/** Responsive grid of read fields — 2 columns on desktop, 1 on mobile. */
export const FieldGrid = ({ children, className = "" }) => (
  <div className={`${styles.fieldGrid} ${className}`}>{children}</div>
);

/**
 * A labelled, read-only value box.
 * - `icon`   optional leading node (next/image or a react-icon).
 * - `block`  true for long/multiline text (description) — taller, top-aligned.
 */
export const ReadField = ({
  label,
  value,
  icon = null,
  block = false,
  placeholder = "-",
  className = "",
}) => (
  <div
    className={`${styles.field} ${block ? styles.fieldBlock : ""} ${className}`}
  >
    {label && <span className={styles.fieldLabel}>{label}</span>}
    <div className={styles.fieldValue}>
      {icon && <span className={styles.fieldIcon}>{icon}</span>}
      <span className={styles.fieldText}>
        {value || <span className={styles.placeholder}>{placeholder}</span>}
      </span>
    </div>
  </div>
);

/**
 * Image thumbnail with click-to-view and an optional inline delete button.
 * Used for the logo, document scans, and gallery/pricing images.
 */
export const DocThumb = ({
  src,
  onView,
  onDelete,
  isDeleting = false,
  viewLabel,
}) => {
  const { t } = useTranslation("vendorSettings");
  return (
    <div className={styles.thumb}>
      <button
        type="button"
        className={styles.thumbView}
        onClick={onView}
        disabled={!onView}
      >
        <Image
          src={src}
          alt=""
          width={96}
          height={80}
          className={styles.thumbImg}
          unoptimized
        />
        {viewLabel && <span className={styles.thumbHint}>{viewLabel}</span>}
      </button>
      {onDelete && (
        <button
          type="button"
          className={styles.thumbDelete}
          onClick={onDelete}
          disabled={isDeleting}
          aria-label={t("buttons.delete", "حذف")}
        >
          {isDeleting ? "…" : "×"}
        </button>
      )}
    </div>
  );
};

/** Muted placeholder box shown where there is no image / no data. */
export const EmptyState = ({ children }) => (
  <div className={styles.empty}>{children}</div>
);

/** Row of thumbnails (gallery). Wraps and scrolls gracefully on small screens. */
export const ThumbRow = ({ children }) => (
  <div className={styles.thumbRow}>{children}</div>
);
