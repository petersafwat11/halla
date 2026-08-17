"use client";

import React from "react";
import Link from "next/link";
import styles from "./TemplatesPageContent.module.css";

export default function TemplateGridCard({
  tpl,
  lang,
  langParam,
  t,
  onDuplicate,
  onDelete,
  dupPending,
  delPending,
}) {
  return (
    <article key={tpl._id} className={styles.card}>
      <Link
        href={`/${langParam}/admin-dash/templates/${tpl._id}`}
        className={styles.cardLink}
      >
        <div
          className={styles.cardThumb}
          style={{
            background:
              tpl.thumbnailUrl || tpl.imageUrl
                ? `url(${tpl.thumbnailUrl || tpl.imageUrl}) center/cover no-repeat`
                : "var(--color-natural-100, #f5f5f5)",
          }}
        >
          {!tpl.thumbnailUrl && !tpl.imageUrl && (
            <div className={styles.cardThumbPlaceholder}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="2" />
                <circle cx="18" cy="18" r="3" fill="currentColor" />
                <path d="M8 32L18 22L26 30L32 24L40 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          {!tpl.active && (
            <div className={styles.cardInactiveBadge}>
              {t("templates.inactive", "غير نشط")}
            </div>
          )}
        </div>
        <div className={styles.cardBody}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardName}>
              {lang === "ar" ? tpl.nameAr : tpl.nameEn}
            </h3>
            {tpl.deletedAt && (
              <span className={styles.cardDeletedBadge}>
                {t("templates.deleted", "محذوف")}
              </span>
            )}
          </div>
          {tpl.categories && tpl.categories.length > 0 && (
            <div className={styles.cardCategories}>
              {tpl.categories.map((cat, i) => (
                <span key={i} className={styles.cardCategoryTag}>
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
      <div className={styles.cardFooter}>
        <div className={styles.cardActions}>
          <Link
            href={`/${langParam}/admin-dash/templates/${tpl._id}`}
            className={styles.cardActionLink}
            title={t("edit", "تعديل")}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M12.9136 2.58579C13.3041 2.19526 13.9373 2.19526 14.3278 2.58579L15.4136 3.67157C15.8041 4.0621 15.8041 4.69526 15.4136 5.08579L6.49997 14.0001L2.99997 15.0001L3.99997 11.5001L12.9136 2.58579Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <button
            type="button"
            className={styles.cardActionBtn}
            onClick={() => onDuplicate(tpl._id)}
            disabled={dupPending}
            title={t("duplicate", "تكرار")}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="6" y="6" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M12 6V4.5C12 3.67157 11.3284 3 10.5 3H4.5C3.67157 3 3 3.67157 3 4.5V10.5C3 11.3284 3.67157 12 4.5 12H6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.cardActionBtn} ${styles.cardActionBtnDanger}`}
            onClick={() => onDelete(tpl)}
            disabled={delPending}
            title={t("delete", "حذف")}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3.75 5.25L14.25 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M6.75 5.25V3.75C6.75 3.33579 7.08579 3 7.5 3H10.5C10.9142 3 11.25 3.33579 11.25 3.75V5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M5.25 5.25L5.625 13.875C5.64453 14.3062 6.00078 14.625 6.375 14.625H11.625C11.9992 14.625 12.3555 14.3062 12.375 13.875L12.75 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M7.5 7.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10.5 7.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <span
          className={`${styles.cardStatus} ${
            tpl.active ? styles.cardStatusActive : styles.cardStatusInactive
          }`}
        >
          {tpl.active
            ? t("templates.active", "نشط")
            : t("templates.inactive", "غير نشط")}
        </span>
      </div>
    </article>
  );
}
