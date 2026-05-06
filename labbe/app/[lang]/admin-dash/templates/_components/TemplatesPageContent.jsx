"use client";
/**
 * TemplatesPageContent — Phase 4c W1-VISUAL
 *
 * Admin templates list. Search by name, filter by category, toggle
 * inactive visibility, link to editor + duplicate + delete.
 *
 * Per v4.1 §A-1 list page features. Action buttons use the catalogued
 * `Button` component — no raw `<button>` per [PATCH 14] forbidden
 * patterns rule.
 */

import React, { useCallback, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Button from "@/ui/commen/button/Button";
import {
  useAdminTemplates,
  useTemplateCategories,
} from "@/hooks/queries/useTemplates";
import {
  useDeleteTemplate,
  useDuplicateTemplate,
} from "@/hooks/mutations/useTemplateMutations";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./TemplatesPageContent.module.css";

function SearchInput({ value, onChange, placeholder }) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e) => {
    const next = e.target.value;
    setLocalValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next), 300);
  };

  return (
    <div className={styles.searchWrapper}>
      <svg
        className={styles.searchIcon}
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.7541 13.7541L17.4999 17.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <input
        type="search"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        className={styles.searchInput}
      />
    </div>
  );
}

function CategoryFilter({ categories, value, onChange, t, lang }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = categories.filter((c) => {
    const name = lang === "ar" ? c.nameAr : c.nameEn;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const selectedLabel = value
    ? categories.find((c) => c.code === value)?.[lang === "ar" ? "nameAr" : "nameEn"] || ""
    : "";

  return (
    <div className={styles.filterSelect} ref={ref}>
      <button
        type="button"
        className={`${styles.filterButton} ${isOpen ? styles.filterButtonOpen : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.filterButtonText}>
          {selectedLabel || t("templates.allCategories")}
        </span>
        <svg
          className={`${styles.filterArrow} ${isOpen ? styles.filterArrowUp : ""}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {isOpen && (
        <div className={styles.filterDropdown}>
          <div className={styles.filterDropdownSearch}>
            <svg
              className={styles.filterDropdownSearchIcon}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M7.25 12.5C10.1495 12.5 12.5 10.1495 12.5 7.25C12.5 4.35051 10.1495 2 7.25 2C4.35051 2 2 4.35051 2 7.25C2 10.1495 4.35051 12.5 7.25 12.5Z"
                stroke="#929FA5"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10.9624 10.9625L13.9999 14"
                stroke="#929FA5"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              type="text"
              placeholder={t("templates.searchCategories")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.filterDropdownInput}
              autoFocus
            />
          </div>
          <div className={styles.filterDropdownOptions}>
            <button
              type="button"
              className={`${styles.filterOption} ${!value ? styles.filterOptionSelected : ""}`}
              onClick={() => { onChange(""); setIsOpen(false); setSearch(""); }}
            >
              {t("templates.allCategories")}
              {!value && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M13.3334 4L6.00008 11.3333L2.66675 8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            {options.map((c) => {
              const name = lang === "ar" ? c.nameAr : c.nameEn;
              const isSelected = value === c.code;
              return (
                <button
                  key={c._id || c.code}
                  type="button"
                  className={`${styles.filterOption} ${isSelected ? styles.filterOptionSelected : ""}`}
                  onClick={() => { onChange(c.code); setIsOpen(false); setSearch(""); }}
                >
                  {name}
                  {isSelected && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M13.3334 4L6.00008 11.3333L2.66675 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
            {options.length === 0 && (
              <div className={styles.filterDropdownEmpty}>
                {t("templates.noCategoriesFound")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function IncludeInactiveToggle({ checked, onChange, label }) {
  return (
    <label className={styles.toggleLabel}>
      <div
        className={`${styles.toggle} ${checked ? styles.toggleActive : ""}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
      >
        <div className={styles.toggleSlider} />
      </div>
      <span className={styles.toggleText}>{label}</span>
    </label>
  );
}

export default function TemplatesPageContent({ lang }) {
  const { t } = useTranslation("admin");
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const langParam = lang || params.lang;

  // Rule 14: filter state lives in URL params
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  // Absent param → default true; explicit "false" turns it off
  const includeInactive = searchParams.get("includeInactive") !== "false";

  const { data, isLoading, error } = useAdminTemplates({
    search: search || undefined,
    category: category || undefined,
    includeInactive: includeInactive ? "true" : "false",
  });
  const { data: catData } = useTemplateCategories({ admin: true });

  const del = useDeleteTemplate();
  const dup = useDuplicateTemplate();

  const templates = data?.data?.templates || data?.templates || [];
  const categories = catData?.data?.categories || catData?.categories || [];

  /** Update one URL param while preserving all others */
  const updateParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === "" || value === null || value === undefined) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      router.push(`?${next.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearchChange = useCallback(
    (value) => updateParam("search", value),
    [updateParam]
  );

  const handleCategoryChange = useCallback(
    (value) => updateParam("category", value),
    [updateParam]
  );

  const handleInactiveToggle = useCallback(
    (checked) => updateParam("includeInactive", checked ? "true" : "false"),
    [updateParam]
  );

  const handleDelete = useCallback(
    async (id) => {
      if (!confirm(t("templates.confirmDelete"))) return;
      try {
        await del.mutateAsync(id);
        toastUtils.success(t("templates.templateDeleted"));
      } catch (e) {
        handleError(e, t, { fallbackMessage: "errors.operation_failed" });
      }
    },
    [del, t]
  );

  const handleDuplicate = useCallback(
    async (id) => {
      try {
        const res = await dup.mutateAsync(id);
        const newId = res?.data?.template?._id || res?.template?._id;
        toastUtils.success(t("templates.duplicated"));
        if (newId) router.push(`/${langParam}/admin-dash/templates/${newId}`);
      } catch (e) {
        handleError(e, t, { fallbackMessage: "errors.operation_failed" });
      }
    },
    [dup, t, router, langParam]
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("templates.title")}</h1>
          <p className={styles.subtitle}>{t("templates.subtitle")}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/${langParam}/admin-dash/templates/categories`}>
            <Button variant="secondary" title={t("templates.manageCategories")} />
          </Link>
          <Link href={`/${langParam}/admin-dash/templates/new`}>
            <Button variant="primary" title={t("templates.createNew")} />
          </Link>
        </div>
      </header>

      <div className={styles.filters}>
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder={t("templates.searchPlaceholder")}
        />
        <CategoryFilter
          categories={categories}
          value={category}
          onChange={handleCategoryChange}
          t={t}
          lang={lang}
        />
        <IncludeInactiveToggle
          checked={includeInactive}
          onChange={handleInactiveToggle}
          label={t("templates.includeInactive")}
        />
      </div>

      {isLoading && <SimpleLoading />}
      {error && <p className={styles.error}>{t("templates.fetchError")}</p>}

      <div className={styles.grid}>
        {templates.map((tpl) => (
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
                      <rect
                        x="8"
                        y="8"
                        width="32"
                        height="32"
                        rx="4"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <circle cx="18" cy="18" r="3" fill="currentColor" />
                      <path
                        d="M8 32L18 22L26 30L32 24L40 32"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
                {!tpl.active && (
                  <div className={styles.cardInactiveBadge}>
                    {t("templates.inactive")}
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
                      {t("templates.deleted")}
                    </span>
                  )}
                </div>
                {(tpl.categories && tpl.categories.length > 0) && (
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
                  title={t("edit")}
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
                  onClick={() => handleDuplicate(tpl._id)}
                  disabled={dup.isPending}
                  title={t("duplicate")}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect
                      x="6"
                      y="6"
                      width="9"
                      height="9"
                      rx="1.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
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
                  onClick={() => handleDelete(tpl._id)}
                  disabled={del.isPending}
                  title={t("delete")}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M3.75 5.25L14.25 5.25"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M6.75 5.25V3.75C6.75 3.33579 7.08579 3 7.5 3H10.5C10.9142 3 11.25 3.33579 11.25 3.75V5.25"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M5.25 5.25L5.625 13.875C5.64453 14.3062 6.00078 14.625 6.375 14.625H11.625C11.9992 14.625 12.3555 14.3062 12.375 13.875L12.75 5.25"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M7.5 7.5V12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M10.5 7.5V12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <span
                className={`${styles.cardStatus} ${
                  tpl.active ? styles.cardStatusActive : styles.cardStatusInactive
                }`}
              >
                {tpl.active ? t("templates.active") : t("templates.inactive")}
              </span>
            </div>
          </article>
        ))}
        {!isLoading && templates.length === 0 && (
          <div className={styles.empty}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect
                x="12"
                y="12"
                width="40"
                height="40"
                rx="8"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M24 24H40"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M24 32H36"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M24 40H32"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <p>{t("templates.empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
