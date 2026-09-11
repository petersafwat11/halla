"use client";
import React, { useEffect, useState, useRef, useId } from "react";
import { useTranslation } from "react-i18next";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import Button from "@/ui/commen/button/Button";
import CategorySelect from "@/ui/commen/inputs/CategorySelect/CategorySelect";
import styles from "../guestPicker.module.css";

/**
 * Link/change category for a set of selected guests. A small focused popup that
 * wraps the shared CategorySelect (pick an existing label or create a new one)
 * and returns the chosen value via `onConfirm`. Used by every guest table — the
 * Step-2 list, the reuse/vCard pickers — so adding & changing a category is the
 * same professional flow everywhere.
 */
const CategoryAssignModal = ({
  isOpen,
  onClose,
  onConfirm,
  options = [],
  count = 0,
  initialValue = "",
  isLoading = false,
  closeOnConfirm = true,
  onValueChange,
}) => {
  const { t } = useTranslation("createEvent");
  const dialogRef = useRef(null);
  const titleId = useId();
  const [value, setValue] = useState(initialValue);

  // Seed from the (possibly shared) initial value each time it opens.
  useEffect(() => {
    if (isOpen) setValue(initialValue || "");
  }, [isOpen, initialValue]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    dialogRef.current?.focus();
    return () => previous?.focus?.();
  }, [isOpen]);
  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && !isLoading) { event.stopPropagation(); onClose(); }
    if (event.key !== 'Tab') return;
    const controls = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')];
    const first = controls[0], last = controls[controls.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const handleConfirm = () => {
    onConfirm(value.trim());
    if (closeOnConfirm) onClose();
  };

  return (
    <PopupWrapper isOpen={isOpen} onClose={isLoading ? undefined : onClose}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={isLoading} onKeyDown={handleKeyDown} className={styles.popup}>
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>{t("link_to_category_title")}</h2>
          <button className={styles.closeButton} disabled={isLoading} onClick={onClose} type="button" aria-label={t("cancel")}>×</button>
        </div>

        <div className={styles.content} style={{ minHeight: "22rem" }}>
          <p className={styles.subtitle}>{t("link_to_category_subtitle", { count })}</p>
          <CategorySelect
            label={t("category")}
            placeholder={t("category_placeholder")}
            searchPlaceholder={t("category_search")}
            noneLabel={t("category_none")}
            createLabel={(q) => t("category_create", { q })}
            value={value}
            onChange={(next) => { setValue(next); onValueChange?.(next); }}
            options={options}
          />
        </div>

        <div className={styles.footer}>
          <Button
            variant="primary"
            className={styles.footerBtn}
            title={t("confirm")}
            onClick={handleConfirm}
            disabled={isLoading || value.trim().length > 60}
            type="button"
          />
          <Button
            variant="secondary"
            className={styles.footerBtn}
            title={t("cancel")}
            onClick={onClose}
            disabled={isLoading}
            type="button"
          />
        </div>
      </div>
    </PopupWrapper>
  );
};

export default CategoryAssignModal;
