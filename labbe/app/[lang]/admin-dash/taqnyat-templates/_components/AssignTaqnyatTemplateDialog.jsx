"use client";
/**
 * AssignTaqnyatTemplateDialog — Phase 4c W1-TAQNYAT-ADMIN
 *
 * Modal that lets admin set:
 *   - category    (which category-of-event this template fits)
 *   - varMapping  (for each `{{N}}` in the body, which event-data
 *                  source key resolves it at send time)
 *   - active      (soft-disable in our UI without touching Meta)
 *   - sortOrder
 *
 * The source-key dropdown lists the canonical paths the dynamic
 * `_getEventBodyParams` resolver supports:
 *   guest.name | eventDetails.title | eventDetails.dateFormatted |
 *   eventDetails.time | eventDetails.location.address | host.name |
 *   hostNote | invitationMessage
 */

import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "@/ui/commen/button/Button";
import { useAssignTaqnyat } from "@/hooks/queries/useTaqnyatTemplates";
import { toastUtils } from "@/utils/toastUtils";

const SOURCE_KEY_OPTIONS = [
  { value: "guest.name", label: "guest.name (الضيف)" },
  { value: "eventDetails.title", label: "eventDetails.title (اسم المناسبة)" },
  { value: "eventDetails.dateFormatted", label: "eventDetails.dateFormatted (التاريخ)" },
  { value: "eventDetails.time", label: "eventDetails.time (الوقت)" },
  { value: "eventDetails.location.address", label: "eventDetails.location.address (العنوان)" },
  { value: "host.name", label: "host.name (المضيف)" },
  { value: "hostNote", label: "hostNote (ملاحظة المضيف)" },
  { value: "invitationMessage", label: "invitationMessage (نص الدعوة)" },
];

function detectPlaceholders(bodyText) {
  if (!bodyText) return [];
  const matches = bodyText.match(/\{\{\d+\}\}/g) || [];
  // dedupe while preserving order
  const seen = new Set();
  return matches.filter((m) => (seen.has(m) ? false : seen.add(m)));
}

export default function AssignTaqnyatTemplateDialog({ template, categories, onClose, lang }) {
  const { t } = useTranslation("admin");
  const assign = useAssignTaqnyat();

  const placeholders = useMemo(() => detectPlaceholders(template.bodyText), [template.bodyText]);

  const [category, setCategory] = useState(template.category || "");
  const [active, setActive] = useState(template.active !== false);
  const [sortOrder, setSortOrder] = useState(template.sortOrder || 0);
  const [mapping, setMapping] = useState(() => {
    // Seed from existing mapping; fill in any newly detected placeholders.
    const byPlaceholder = Object.fromEntries(
      (template.varMapping || []).map((m) => [m.placeholder, m])
    );
    return placeholders.map((ph) => byPlaceholder[ph] || {
      placeholder: ph,
      sourceKey: "",
      fallback: "",
    });
  });

  // Re-seed if template changes
  useEffect(() => {
    setCategory(template.category || "");
    setActive(template.active !== false);
    setSortOrder(template.sortOrder || 0);
    const byPlaceholder = Object.fromEntries(
      (template.varMapping || []).map((m) => [m.placeholder, m])
    );
    setMapping(
      placeholders.map((ph) => byPlaceholder[ph] || { placeholder: ph, sourceKey: "", fallback: "" })
    );
  }, [template, placeholders]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Strip empty mappings before sending.
    const cleaned = mapping.filter((m) => m.sourceKey);
    try {
      await assign.mutateAsync({
        id: template._id,
        body: { category: category || null, active, sortOrder, varMapping: cleaned },
      });
      toastUtils.success(t("taqnyat.saved") || "تم الحفظ");
      onClose();
    } catch (err) {
      toastUtils.error(err.message || "Save failed");
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          width: "min(720px, 92vw)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h2 style={{ marginBottom: 12 }}>{template.templateName}</h2>
        {template.bodyText && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: "#f7f7f7",
              fontSize: 13,
              marginBottom: 16,
              whiteSpace: "pre-wrap",
            }}
          >
            {template.bodyText}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label>
            <small>{t("taqnyat.fieldCategory") || "الفئة"}</small>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ display: "block", width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6 }}
            >
              <option value="">{t("taqnyat.unassigned") || "بدون فئة"}</option>
              {categories.map((c) => (
                <option key={c._id || c.code} value={c.code}>
                  {lang === "ar" ? c.nameAr : c.nameEn}
                </option>
              ))}
            </select>
          </label>

          <h3 style={{ marginTop: 8 }}>{t("taqnyat.varMapping") || "ربط المتغيرات"}</h3>
          {placeholders.length === 0 ? (
            <p style={{ color: "#666" }}>
              {t("taqnyat.noPlaceholders") || "هذا القالب لا يحتوي على متغيرات {{N}}"}
            </p>
          ) : (
            mapping.map((m, idx) => (
              <div
                key={m.placeholder}
                style={{ display: "grid", gridTemplateColumns: "80px 1fr 200px", gap: 8, alignItems: "center" }}
              >
                <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{m.placeholder}</span>
                <select
                  value={m.sourceKey}
                  onChange={(e) => {
                    const next = [...mapping];
                    next[idx] = { ...next[idx], sourceKey: e.target.value };
                    setMapping(next);
                  }}
                  style={{ padding: 6, border: "1px solid #ddd", borderRadius: 6 }}
                >
                  <option value="">— {t("taqnyat.pickSource") || "اختر المصدر"} —</option>
                  {SOURCE_KEY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder={t("taqnyat.fallback") || "قيمة افتراضية"}
                  value={m.fallback || ""}
                  onChange={(e) => {
                    const next = [...mapping];
                    next[idx] = { ...next[idx], fallback: e.target.value };
                    setMapping(next);
                  }}
                  style={{ padding: 6, border: "1px solid #ddd", borderRadius: 6 }}
                />
              </div>
            ))
          )}

          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              {t("taqnyat.active") || "نشط"}
            </label>
            <label>
              <small>{t("taqnyat.sortOrder") || "ترتيب"}</small>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                style={{ display: "block", padding: 6, border: "1px solid #ddd", borderRadius: 6, width: 100 }}
              />
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <Button type="button" variant="secondary" title={t("cancel") || "إلغاء"} onClick={onClose} />
            <Button
              type="submit"
              variant="primary"
              title={assign.isPending ? "..." : t("save") || "حفظ"}
              disabled={assign.isPending}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
