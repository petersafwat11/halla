"use client";
/**
 * TaqnyatTemplatesTable — Phase 4c W1-TAQNYAT-ADMIN
 *
 * Per Phase 4c prompt §W1-TAQNYAT-ADMIN: table + Sync button +
 * AssignTaqnyatTemplateDialog (category + per-`{{N}}` source-key
 * dropdown).
 *
 * Sync = POST /admin/taqnyat-templates/sync (super-admin only — backend
 * enforces).
 *
 * RBAC view-level: super_admin/admin can see this page; moderator/host
 * are blocked at the server-guarded page.js. The Sync button is shown
 * to all viewers but the backend will 403 non-super-admins.
 */

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "@/ui/commen/button/Button";
import {
  useAdminTaqnyatTemplates,
  useSyncTaqnyat,
} from "@/hooks/queries/useTaqnyatTemplates";
import { useTemplateCategories } from "@/hooks/queries/useTemplates";
import AssignTaqnyatTemplateDialog from "./AssignTaqnyatTemplateDialog";
import { toastUtils } from "@/utils/toastUtils";

export default function TaqnyatTemplatesTable({ lang }) {
  const { t } = useTranslation("admin");
  const { data, isLoading, error } = useAdminTaqnyatTemplates();
  const { data: catData } = useTemplateCategories({ admin: true });
  const sync = useSyncTaqnyat();
  const [assignTarget, setAssignTarget] = useState(null);

  const templates = data?.data?.templates || data?.templates || [];
  const categories = catData?.data?.categories || catData?.categories || [];

  const handleSync = async () => {
    try {
      const res = await sync.mutateAsync();
      const count = res?.data?.count || res?.count || 0;
      toastUtils.success(`${t("taqnyat.synced") || "تم التحديث"}: ${count}`);
    } catch (err) {
      toastUtils.error(err.message || "Sync failed");
    }
  };

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>
            {t("taqnyat.title") || "قوالب واتساب (Taqnyat)"}
          </h1>
          <p style={{ color: "#666" }}>
            {t("taqnyat.subtitle") || "إدارة قوالب واتساب المعتمدة من Meta وتعيين الفئات والمتغيرات"}
          </p>
        </div>
        <Button
          variant="primary"
          title={sync.isPending ? "..." : t("taqnyat.syncBtn") || "تحديث من Taqnyat"}
          onClick={handleSync}
          disabled={sync.isPending}
        />
      </header>

      {isLoading && <p>{t("loading") || "..."}</p>}
      {error && <p style={{ color: "red" }}>{error.message}</p>}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f7f7f7", textAlign: lang === "ar" ? "right" : "left" }}>
            <th style={{ padding: 8 }}>{t("taqnyat.col.name") || "اسم القالب"}</th>
            <th style={{ padding: 8 }}>{t("taqnyat.col.lang") || "اللغة"}</th>
            <th style={{ padding: 8 }}>{t("taqnyat.col.status") || "الحالة"}</th>
            <th style={{ padding: 8 }}>{t("taqnyat.col.category") || "الفئة"}</th>
            <th style={{ padding: 8 }}>{t("taqnyat.col.mappingCount") || "المتغيرات"}</th>
            <th style={{ padding: 8 }}>{t("taqnyat.col.active") || "نشط"}</th>
            <th style={{ padding: 8 }}></th>
          </tr>
        </thead>
        <tbody>
          {templates.map((tpl) => (
            <tr key={tpl._id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: 8 }}>
                <strong>{tpl.templateName}</strong>
                <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                  {tpl.bodyText?.substring(0, 80) || ""}
                  {tpl.bodyText && tpl.bodyText.length > 80 ? "…" : ""}
                </div>
              </td>
              <td style={{ padding: 8 }}>{tpl.language || "ar"}</td>
              <td style={{ padding: 8 }}>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: tpl.status === "APPROVED" ? "#e8f5e9" : "#fff3e0",
                    color: tpl.status === "APPROVED" ? "#2e7d32" : "#e65100",
                    fontSize: 12,
                  }}
                >
                  {tpl.status}
                </span>
              </td>
              <td style={{ padding: 8 }}>
                {tpl.category ? (
                  <span style={{ color: "#2a8c5b" }}>{tpl.category}</span>
                ) : (
                  <span style={{ color: "#aaa" }}>{t("taqnyat.unassigned") || "غير معينة"}</span>
                )}
              </td>
              <td style={{ padding: 8 }}>
                {tpl.varMapping?.length ? `${tpl.varMapping.length}` : "—"}
              </td>
              <td style={{ padding: 8 }}>
                {tpl.active ? "✓" : "—"}
              </td>
              <td style={{ padding: 8 }}>
                <Button
                  variant="secondary"
                  size="small"
                  title={t("taqnyat.assignBtn") || "تعيين"}
                  onClick={() => setAssignTarget(tpl)}
                />
              </td>
            </tr>
          ))}
          {!isLoading && templates.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#666" }}>
                {t("taqnyat.empty") || "لا توجد قوالب — اضغط 'تحديث من Taqnyat' لجلبها"}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {assignTarget && (
        <AssignTaqnyatTemplateDialog
          template={assignTarget}
          categories={categories}
          onClose={() => setAssignTarget(null)}
          lang={lang}
        />
      )}
    </div>
  );
}
