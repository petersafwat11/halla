"use client";
/**
 * CategoryManager — Phase 4c W1-VISUAL
 *
 * Per v4.1 §A-11. Simple CRUD over TemplateCategoryModel.
 */

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "@/ui/commen/button/Button";
import {
  useTemplateCategories,
} from "@/hooks/queries/useTemplates";
import {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/mutations/useTemplateMutations";
import { toastUtils } from "@/utils/toastUtils";

export default function CategoryManager({ lang }) {
  const { t } = useTranslation("admin");
  const { data, isLoading } = useTemplateCategories({ admin: true });
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const del = useDeleteCategory();

  const [form, setForm] = useState({ code: "", nameEn: "", nameAr: "", sortOrder: 0 });

  const cats = data?.data?.categories || data?.categories || [];

  const submit = async (e) => {
    e.preventDefault();
    try {
      await create.mutateAsync(form);
      setForm({ code: "", nameEn: "", nameAr: "", sortOrder: 0 });
      toastUtils.success(t("templates.categoryCreated") || "Category created");
    } catch (err) {
      toastUtils.error(err.message || "Failed");
    }
  };

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>
        {t("templates.categoriesTitle") || "فئات القوالب"}
      </h1>

      <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 100px auto", gap: 8, alignItems: "end" }}>
        <label>
          <small>code</small>
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="wedding"
            required
            style={{ display: "block", width: "100%", padding: 6, border: "1px solid #ddd", borderRadius: 6 }}
          />
        </label>
        <label>
          <small>name (EN)</small>
          <input
            value={form.nameEn}
            onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
            required
            style={{ display: "block", width: "100%", padding: 6, border: "1px solid #ddd", borderRadius: 6 }}
          />
        </label>
        <label>
          <small>name (AR)</small>
          <input
            value={form.nameAr}
            onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            required
            dir="rtl"
            style={{ display: "block", width: "100%", padding: 6, border: "1px solid #ddd", borderRadius: 6 }}
          />
        </label>
        <label>
          <small>sort</small>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
            style={{ display: "block", width: "100%", padding: 6, border: "1px solid #ddd", borderRadius: 6 }}
          />
        </label>
        <Button type="submit" variant="primary" title="إضافة" disabled={create.isPending} />
      </form>

      {isLoading && <p>{t("loading") || "..."}</p>}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f7f7f7", textAlign: lang === "ar" ? "right" : "left" }}>
            <th style={{ padding: 8 }}>code</th>
            <th style={{ padding: 8 }}>name EN</th>
            <th style={{ padding: 8 }}>name AR</th>
            <th style={{ padding: 8 }}>sort</th>
            <th style={{ padding: 8 }}>active</th>
            <th style={{ padding: 8 }}></th>
          </tr>
        </thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c._id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: 8 }}>{c.code}</td>
              <td style={{ padding: 8 }}>{c.nameEn}</td>
              <td style={{ padding: 8 }}>{c.nameAr}</td>
              <td style={{ padding: 8 }}>{c.sortOrder ?? 0}</td>
              <td style={{ padding: 8 }}>
                <input
                  type="checkbox"
                  defaultChecked={c.active !== false}
                  onChange={(e) =>
                    update.mutate({ id: c._id, body: { active: e.target.checked } })
                  }
                />
              </td>
              <td style={{ padding: 8 }}>
                <Button
                  variant="danger"
                  size="small"
                  title="حذف"
                  onClick={() => {
                    if (confirm(t("templates.confirmDelete") || "Delete?")) {
                      del.mutate(c._id);
                    }
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
