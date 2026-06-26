"use client";
import React, { useEffect, useState } from "react";
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
}) => {
  const { t } = useTranslation("createEvent");
  const [value, setValue] = useState(initialValue);

  // Seed from the (possibly shared) initial value each time it opens.
  useEffect(() => {
    if (isOpen) setValue(initialValue || "");
  }, [isOpen, initialValue]);

  const handleConfirm = () => {
    onConfirm(value.trim());
    onClose();
  };

  return (
    <PopupWrapper isOpen={isOpen} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t("link_to_category_title")}</h2>
          <button className={styles.closeButton} onClick={onClose} type="button" aria-label={t("cancel")}>×</button>
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
            onChange={setValue}
            options={options}
          />
        </div>

        <div className={styles.footer}>
          <Button
            variant="primary"
            className={styles.footerBtn}
            title={t("confirm")}
            onClick={handleConfirm}
            type="button"
          />
          <Button
            variant="secondary"
            className={styles.footerBtn}
            title={t("cancel")}
            onClick={onClose}
            type="button"
          />
        </div>
      </div>
    </PopupWrapper>
  );
};

export default CategoryAssignModal;
