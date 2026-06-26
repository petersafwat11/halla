"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiUserPlus } from "react-icons/fi";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import Button from "@/ui/commen/button/Button";
import Table from "@/ui/commen/new-table/Table";
import { useMyContacts } from "@/hooks/guests/queries";
import styles from "../guestPicker.module.css";

/**
 * "Add from your guests" — pick from the host's reusable guest book (past
 * guests across all their events) using the shared Table (search + category
 * filter + checkboxes). Selection is added via the Table's bulk action and
 * returned through `onAdd`; persistence flows through the normal Step-2 save.
 * Guests already on the current list are hidden.
 */
const ReuseGuestsModal = ({ isOpen, onClose, onAdd, existingMobiles = [] }) => {
  const { t } = useTranslation("createEvent");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (!isOpen) setCategory("");
  }, [isOpen]);

  const { data, isLoading, isError } = useMyContacts(
    { page: 1, limit: 200, category: category || undefined },
    { enabled: isOpen }
  );

  const categories = data?.data?.categories || [];
  const existingSet = useMemo(() => new Set(existingMobiles), [existingMobiles]);
  const rows = useMemo(() => {
    const contacts = data?.data?.contacts || [];
    return contacts
      .filter((c) => !existingSet.has(c.phone))
      .map((c) => ({ id: c.phone, name: c.name, phone: c.phone, category: c.category || "" }));
  }, [data, existingSet]);

  const addByIds = (ids) => {
    const byId = new Map(rows.map((r) => [r.id, r]));
    const list = ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((r) => ({ name: r.name, mobile: r.phone, category: r.category }));
    if (list.length) onAdd(list);
    onClose();
  };

  const filterOptions = [
    { label: t("reuse_guests_all_categories"), value: "", onClick: () => setCategory("") },
    ...categories.map((c) => ({ label: c, value: c, onClick: () => setCategory(c) })),
  ];

  const renderCell = (key, value) => {
    if (key === "category") return value ? <span className={styles.badge}>{value}</span> : "-";
    if (key === "phone") {
      return <span style={{ direction: "ltr", display: "inline-block" }}>{value}</span>;
    }
    return value || "-";
  };

  return (
    <PopupWrapper isOpen={isOpen} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t("reuse_guests_title")}</h2>
          <button className={styles.closeButton} onClick={onClose} type="button" aria-label={t("close")}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.subtitle}>{t("reuse_guests_subtitle")}</p>

          {isLoading ? (
            <div className={styles.state}>{t("loading")}</div>
          ) : isError ? (
            <div className={styles.state}>{t("reuse_guests_error")}</div>
          ) : rows.length === 0 ? (
            <div className={styles.state}>{t("reuse_guests_empty")}</div>
          ) : (
            <Table
              headers={[t("name"), t("mobile"), t("category")]}
              headerKeys={["name", "phone", "category"]}
              data={rows}
              showSearch
              showFilter={categories.length > 0}
              filterOptions={filterOptions}
              activeFilter={category}
              showExport={false}
              showCheckboxes
              inlineBulkActions
              searchPlaceholder={t("reuse_guests_search_placeholder")}
              renderCell={renderCell}
              bulkActions={[
                {
                  text: t("reuse_guests_add_selected"),
                  icon: <FiUserPlus size={16} />,
                  onClick: addByIds,
                },
              ]}
            />
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerActions}>
            <Button variant="secondary" title={t("close")} onClick={onClose} type="button" />
          </div>
        </div>
      </div>
    </PopupWrapper>
  );
};

export default ReuseGuestsModal;
