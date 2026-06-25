"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import Button from "@/ui/commen/button/Button";
import { useMyContacts } from "@/hooks/guests/queries";
import styles from "./reuseGuests.module.css";

/**
 * "Add from your guests" — pick from the host's reusable guest book (past
 * guests across all their events), filtered by category + search. Selected
 * contacts are merged into the current Step-2 guest list via `onAdd`; this
 * modal never persists anything itself (persistence flows through the normal
 * create/step2 save). Rows already on the current list are disabled.
 */
const ReuseGuestsModal = ({
  isOpen,
  onClose,
  onAdd,
  existingMobiles = [],
  remainingCapacity = Infinity,
}) => {
  const { t } = useTranslation("createEvent");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState({}); // mobile -> { name, mobile, category }

  const limit = 20;
  const existingSet = useMemo(
    () => new Set(existingMobiles),
    [existingMobiles]
  );

  // Debounce the search box so we don't refetch on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Reset paging when filters change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category]);

  // Clear transient state whenever the modal closes.
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setDebouncedSearch("");
      setCategory("");
      setPage(1);
      setSelected({});
    }
  }, [isOpen]);

  const { data, isLoading, isError } = useMyContacts(
    { search: debouncedSearch || undefined, category: category || undefined, page, limit },
    { enabled: isOpen }
  );

  const contacts = data?.data?.contacts || [];
  const categories = data?.data?.categories || [];
  const pagination = data?.data?.pagination || { page: 1, pages: 1, total: 0 };

  const selectedCount = Object.keys(selected).length;
  const atCapacity =
    Number.isFinite(remainingCapacity) && selectedCount >= remainingCapacity;

  const toggle = (contact) => {
    if (existingSet.has(contact.phone)) return;
    setSelected((prev) => {
      const next = { ...prev };
      if (next[contact.phone]) {
        delete next[contact.phone];
      } else {
        if (atCapacity) return prev; // capacity guard
        next[contact.phone] = {
          name: contact.name || "",
          mobile: contact.phone,
          category: contact.category || "",
        };
      }
      return next;
    });
  };

  const handleAdd = () => {
    const list = Object.values(selected);
    if (list.length > 0) onAdd(list);
    onClose();
  };

  return (
    <PopupWrapper isOpen={isOpen} onClose={onClose}>
      <div className={styles.modal} dir="rtl">
        <div className={styles.header}>
          <h3 className={styles.title}>{t("reuse_guests_title")}</h3>
          <button className={styles.close} onClick={onClose} aria-label="close">
            ✕
          </button>
        </div>

        <p className={styles.subtitle}>{t("reuse_guests_subtitle")}</p>

        <div className={styles.filters}>
          <input
            className={styles.search}
            placeholder={t("reuse_guests_search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.categorySelect}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">{t("reuse_guests_all_categories")}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.list}>
          {isLoading && <div className={styles.state}>{t("loading")}</div>}
          {isError && <div className={styles.state}>{t("reuse_guests_error")}</div>}
          {!isLoading && !isError && contacts.length === 0 && (
            <div className={styles.state}>{t("reuse_guests_empty")}</div>
          )}
          {!isLoading &&
            !isError &&
            contacts.map((c) => {
              const already = existingSet.has(c.phone);
              const isSelected = !!selected[c.phone];
              const disabled = already || (!isSelected && atCapacity);
              return (
                <label
                  key={c.phone}
                  className={`${styles.row} ${disabled ? styles.rowDisabled : ""} ${
                    isSelected ? styles.rowSelected : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={disabled}
                    onChange={() => toggle(c)}
                  />
                  <span className={styles.rowMain}>
                    <span className={styles.rowName}>{c.name}</span>
                    <span className={styles.rowPhone}>{c.phone}</span>
                  </span>
                  <span className={styles.rowMeta}>
                    {c.category && <span className={styles.badge}>{c.category}</span>}
                    {already && (
                      <span className={styles.added}>{t("reuse_guests_added")}</span>
                    )}
                  </span>
                </label>
              );
            })}
        </div>

        {pagination.pages > 1 && (
          <div className={styles.pager}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("previous")}
            </button>
            <span>
              {pagination.page} / {pagination.pages}
            </span>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("next")}
            </button>
          </div>
        )}

        <div className={styles.footer}>
          <span className={styles.count}>
            {t("reuse_guests_selected", { count: selectedCount })}
            {Number.isFinite(remainingCapacity) && (
              <span className={styles.capacity}>
                {" "}
                · {t("reuse_guests_remaining", { count: remainingCapacity })}
              </span>
            )}
          </span>
          <div className={styles.actions}>
            <Button variant="secondary" title={t("close")} onClick={onClose} />
            <Button
              variant="primary"
              title={t("reuse_guests_add", { count: selectedCount })}
              onClick={handleAdd}
              disabled={selectedCount === 0}
            />
          </div>
        </div>
      </div>
    </PopupWrapper>
  );
};

export default ReuseGuestsModal;
