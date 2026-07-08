"use client";
import React, { useMemo, useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import Button from "@/ui/commen/button/Button";
import Table from "@/ui/commen/new-table/Table";
import { parseVCards } from "@halla/shared/utils/vcard";
import { normalizeSaudiMobile } from "@/utils/contacts/phoneContacts";
import styles from "../guestPicker.module.css";

const PLATFORMS = ["apple", "android", "computer"];

const detectPlatform = () => {
  if (typeof navigator === "undefined") return "computer";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "apple";
  if (/Android/i.test(ua)) return "android";
  return "computer";
};

/**
 * Import guests from an uploaded contacts file (.vcf / vCard). The universal,
 * all-browser way to bring real phone contacts onto the web: the user exports
 * a .vcf (clear per-platform instructions shown here), uploads it, and picks
 * who to invite via the shared Table. Parsed in-browser — the file never
 * leaves the device; only selected guests are kept.
 */
const VCardImportModal = ({ isOpen, onClose, onAdd, existingMobiles = [] }) => {
  const { t } = useTranslation("createEvent");
  const fileInputRef = useRef(null);

  const [platform, setPlatform] = useState("computer");
  const [parsed, setParsed] = useState(null); // null = instructions | [] = none | [{name,mobile}]
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  // Bumped on each file parse so the Table fully remounts (and clears its
  // internal checkbox state) when a different file is chosen.
  const [importNonce, setImportNonce] = useState(0);

  const existingSet = useMemo(() => new Set(existingMobiles), [existingMobiles]);

  useEffect(() => {
    if (isOpen) {
      setPlatform(detectPlatform());
    } else {
      setParsed(null);
      setError("");
      setCategory("");
      setSelectedIds([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [isOpen]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setSelectedIds([]);
    setImportNonce((n) => n + 1);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const cards = parseVCards(String(ev.target?.result || ""));
        const seen = new Set();
        const contacts = [];
        for (const c of cards) {
          let mobile = null;
          for (const p of c.phones) {
            const norm = normalizeSaudiMobile(p);
            if (norm) { mobile = norm; break; }
          }
          if (!mobile || seen.has(mobile) || existingSet.has(mobile)) continue;
          seen.add(mobile);
          contacts.push({ id: mobile, name: (c.name || "").trim() || mobile, phone: mobile });
        }
        setParsed(contacts);
      } catch (_) {
        setError(t("vcard_parse_error"));
      }
    };
    reader.onerror = () => setError(t("vcard_parse_error"));
    reader.readAsText(file);
  };

  const handleConfirm = () => {
    const byId = new Map((parsed || []).map((r) => [r.id, r]));
    const cat = category.trim();
    const list = selectedIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((r) => ({ name: r.name, mobile: r.phone, category: cat }));
    if (list.length) onAdd(list);
    onClose();
  };

  const renderCell = (key, value) => {
    if (key === "phone") {
      return <span style={{ direction: "ltr", display: "inline-block" }}>{value}</span>;
    }
    return value || "-";
  };

  return (
    <PopupWrapper isOpen={isOpen} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t("vcard_title")}</h2>
          <button className={styles.closeButton} onClick={onClose} type="button" aria-label={t("close")}>×</button>
        </div>

        <div className={styles.content}>
          {parsed === null ? (
            <>
              <p className={styles.subtitle}>{t("vcard_subtitle")}</p>
              <div className={styles.tabs}>
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`${styles.tab} ${platform === p ? styles.tabActive : ""}`}
                    onClick={() => setPlatform(p)}
                  >
                    {t(`vcard_platform_${p}`)}
                  </button>
                ))}
              </div>
              <ol className={styles.steps}>
                {t(`vcard_steps_${platform}`).split("\n").filter(Boolean).map((step, i) => (
                  <li key={i} className={styles.step}>{step}</li>
                ))}
              </ol>
              {error ? <p className={styles.error}>{error}</p> : null}
              <div className={styles.pickArea}>
                <Button variant="primary" title={t("vcard_choose_file")} onClick={() => fileInputRef.current?.click()} type="button" />
                <p className={styles.hint}>{t("vcard_privacy_note")}</p>
              </div>
            </>
          ) : parsed.length === 0 ? (
            <>
              <div className={styles.state}>{t("vcard_none_found")}</div>
              <div className={styles.pickArea}>
                <Button variant="secondary" title={t("vcard_choose_another")} onClick={() => fileInputRef.current?.click()} type="button" />
              </div>
            </>
          ) : (
            <>
              <div className={styles.foundBar}>
                <span className={styles.foundText}>{t("vcard_found", { count: parsed.length })}</span>
                <button type="button" className={styles.linkBtn} onClick={() => fileInputRef.current?.click()}>
                  {t("vcard_choose_another")}
                </button>
              </div>
              <input
                className={styles.search}
                placeholder={t("contacts_category_placeholder")}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                maxLength={60}
              />
              <Table
                key={importNonce}
                headers={[t("name"), t("mobile")]}
                headerKeys={["name", "phone"]}
                data={parsed}
                showSearch
                showFilter={false}
                showExport={false}
                showCheckboxes
                searchPlaceholder={t("reuse_guests_search_placeholder")}
                renderCell={renderCell}
                onSelectionChange={setSelectedIds}
              />
            </>
          )}
        </div>

        <div className={styles.footer}>
          {parsed && parsed.length > 0 && (
            <Button
              variant="primary"
              className={styles.footerBtn}
              title={t("confirm")}
              onClick={handleConfirm}
              disabled={selectedIds.length === 0}
              type="button"
            />
          )}
          <Button
            variant="secondary"
            className={styles.footerBtn}
            title={t("cancel")}
            onClick={onClose}
            type="button"
          />
        </div>

        <input ref={fileInputRef} type="file" accept=".vcf,text/vcard,text/x-vcard" onChange={handleFile} style={{ display: "none" }} />
      </div>
    </PopupWrapper>
  );
};

export default VCardImportModal;
