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

import React, { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
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

export default function TemplatesPageContent({ lang }) {
  const { t } = useTranslation("admin");
  const router = useRouter();
  const params = useParams();
  const langParam = lang || params.lang;

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);

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

  const handleDelete = async (id) => {
    if (!confirm(t("templates.confirmDelete") || "Delete this template?")) return;
    try {
      await del.mutateAsync(id);
      toastUtils.success(t("templates.deleted") || "Template deleted");
    } catch (e) {
      toastUtils.error(e.message || "Failed");
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await dup.mutateAsync(id);
      const newId = res?.data?.template?._id || res?.template?._id;
      toastUtils.success(t("templates.duplicated") || "Duplicated");
      if (newId) router.push(`/${langParam}/admin-dash/templates/${newId}`);
    } catch (e) {
      toastUtils.error(e.message || "Failed");
    }
  };

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>
            {t("templates.title") || "قوالب الدعوات"}
          </h1>
          <p style={{ color: "#666" }}>
            {t("templates.subtitle") || "إدارة قوالب الدعوات المرئية"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/${langParam}/admin-dash/templates/categories`}>
            <Button variant="secondary" title={t("templates.manageCategories") || "إدارة الفئات"} />
          </Link>
          <Link href={`/${langParam}/admin-dash/templates/new`}>
            <Button variant="primary" title={t("templates.createNew") || "قالب جديد"} />
          </Link>
        </div>
      </header>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="search"
          placeholder={t("templates.searchPlaceholder") || "بحث بالاسم"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: 8, border: "1px solid #ddd", borderRadius: 8, minWidth: 240 }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ padding: 8, border: "1px solid #ddd", borderRadius: 8 }}
        >
          <option value="">{t("templates.allCategories") || "كل الفئات"}</option>
          {categories.map((c) => (
            <option key={c._id || c.code} value={c.code}>
              {lang === "ar" ? c.nameAr : c.nameEn}
            </option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          {t("templates.includeInactive") || "أظهر غير النشطة"}
        </label>
      </div>

      {isLoading && <p>{t("loading") || "..."}</p>}
      {error && <p style={{ color: "red" }}>{error.message}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {templates.map((tpl) => (
          <article
            key={tpl._id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              overflow: "hidden",
              background: "#fff",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                width: "100%",
                aspectRatio: tpl.naturalWidth && tpl.naturalHeight
                  ? `${tpl.naturalWidth} / ${tpl.naturalHeight}`
                  : "4/5",
                background: tpl.thumbnailUrl || tpl.imageUrl
                  ? `url(${tpl.thumbnailUrl || tpl.imageUrl}) center/cover no-repeat`
                  : "#eee",
              }}
            />
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <strong>{lang === "ar" ? tpl.nameAr : tpl.nameEn}</strong>
              <small style={{ color: "#666" }}>
                {(tpl.categories || []).join(", ")}
              </small>
              <small style={{ color: tpl.active ? "#2a8c5b" : "#999" }}>
                {tpl.active ? t("templates.active") || "نشط" : t("templates.inactive") || "غير نشط"}
                {tpl.deletedAt ? ` · ${t("templates.deleted") || "محذوف"}` : ""}
              </small>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <Link href={`/${langParam}/admin-dash/templates/${tpl._id}`} style={{ flex: 1 }}>
                  <Button variant="primary" size="small" title={t("edit") || "تعديل"} />
                </Link>
                <Button
                  variant="secondary"
                  size="small"
                  title={t("duplicate") || "نسخ"}
                  onClick={() => handleDuplicate(tpl._id)}
                  disabled={dup.isPending}
                />
                <Button
                  variant="danger"
                  size="small"
                  title={t("delete") || "حذف"}
                  onClick={() => handleDelete(tpl._id)}
                  disabled={del.isPending}
                />
              </div>
            </div>
          </article>
        ))}
        {!isLoading && templates.length === 0 && (
          <p style={{ gridColumn: "1/-1", color: "#666" }}>
            {t("templates.empty") || "لا توجد قوالب — أنشئ أول قالب الآن"}
          </p>
        )}
      </div>
    </div>
  );
}
