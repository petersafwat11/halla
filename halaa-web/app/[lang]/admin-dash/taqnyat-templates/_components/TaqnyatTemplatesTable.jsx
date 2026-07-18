"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePageAccess } from "@/hooks/usePageAccess";
import {
  useAdminTaqnyatTemplates,
  useSyncTaqnyat,
  useDeleteTaqnyatTemplate,
} from "@/hooks/taqnyatTemplates";
import { useTemplateCategories } from "@/hooks/templates";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import Table from "@/ui/commen/new-table/Table";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import DeleteConfirmation from "@/ui/vendor/modals/DeleteConfirmation";
import { FiRefreshCw, FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";
import AssignTaqnyatTemplatePopup from "./AssignTaqnyatTemplatePopup";
import CreateTaqnyatTemplatePopup from "./CreateTaqnyatTemplatePopup";
import styles from "./TaqnyatTemplatesTable.module.css";

export default function TaqnyatTemplatesTable({
  onAssignClick,
  showAssignPopup,
  setShowAssignPopup,
  selectedTemplate,
  setSelectedTemplate,
  showCreatePopup,
  setShowCreatePopup,
  lang,
}) {
  const { t } = useTranslation("admin");
  const { canUpdate } = usePageAccess("taqnyat_templates");
  const { data, isLoading, error } = useAdminTaqnyatTemplates();
  const { data: catData } = useTemplateCategories({ admin: true });
  const sync = useSyncTaqnyat();
  const deleteTpl = useDeleteTaqnyatTemplate();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const templates = data?.data?.templates || [];
  const categories = catData?.data?.categories || [];

  const handleSync = async () => {
    try {
      const res = await sync.mutateAsync();
      const count = res?.data?.count || 0;
      toastUtils.success(`${t("taqnyat.synced")}: ${count}`);
    } catch (err) {
      handleError(err, t, { fallbackMessage: "taqnyat.syncFailed" });
    }
  };

  const performDelete = async (id) => {
    try {
      await deleteTpl.mutateAsync(id);
      toastUtils.success(t("taqnyat.deleted", "تم حذف القالب"));
    } catch (err) {
      handleError(err, t, { fallbackMessage: "taqnyat.deleteFailed" });
    }
  };

  // The Table component hands the row's flattened tableData object back
  // to action handlers. The Assign popup needs the full Mongo doc (it
  // reads _id, varMapping, sortOrder), so we look up the original
  // template by id before opening — and bail loudly if it's missing
  // rather than silently feeding the lossy row shape forward.
  const handleAssignFromRow = (row) => {
    const original = templates.find((tpl) => tpl._id === row.id);
    if (!original) {
      toastUtils.error(t("taqnyat.assignLookupFailed", "تعذّر فتح نافذة التعيين"));
      return;
    }
    onAssignClick(original);
  };

  const getRowActions = (row) => {
    const actions = [];
    if (canUpdate) {
      actions.push({
        type: "dropdown",
        icon: <FiEdit2 size={16} />,
        text: t("taqnyat.assignBtn", "تعيين"),
        onClick: handleAssignFromRow,
      });
      actions.push({
        type: "dropdown",
        icon: <FiTrash2 size={16} />,
        text: t("taqnyat.deleteBtn", "حذف من Taqnyat"),
        danger: true,
        onClick: (r) => setDeleteTarget(r),
      });
    }
    return actions;
  };

  const renderCell = (key, value, row) => {
    if (key === "name") {
      return <strong>{value || "-"}</strong>;
    }

    if (key === "body") {
      if (!value) return "-";
      return (
        <div className={styles.templateBody}>
          {value.substring(0, 120)}
          {value.length > 120 ? "…" : ""}
        </div>
      );
    }

    if (key === "status") {
      const isApproved = value === "APPROVED";
      return (
        <span
          className={`${styles.statusBadge} ${
            isApproved ? styles.statusApproved : styles.statusPending
          }`}
        >
          {value}
        </span>
      );
    }

    if (key === "category") {
      return value ? (
        <span className={styles.categoryAssigned}>{value}</span>
      ) : (
        <span className={styles.categoryUnassigned}>
          {t("taqnyat.unassigned", "غير معين")}
        </span>
      );
    }

    if (key === "type") {
      return value ? (
        <span className={styles.categoryAssigned}>
          {t(`taqnyat.types.${value}`, value)}
        </span>
      ) : (
        <span className={styles.categoryUnassigned}>
          {t("taqnyat.unassignedType", "غير معيّن")}
        </span>
      );
    }

    if (key === "active") {
      return value ? (
        <span className={styles.activeYes}>✓</span>
      ) : (
        <span className={styles.activeNo}>—</span>
      );
    }

    if (key === "invitationMode") {
      return value ? (
        <span className={styles.categoryAssigned}>
          {t(`taqnyat.invitationModes.${value}`, value)}
        </span>
      ) : "—";
    }

    return value;
  };

  const tableData = templates.map((tpl) => ({
    id: tpl._id,
    name: tpl.templateName,
    body: tpl.bodyText,
    language: tpl.language || "ar",
    status: tpl.status,
    category: tpl.category,
    type: tpl.type || null,
    invitationMode: tpl.type === "invite" ? tpl.invitationMode : null,
    mappingCount: tpl.varMapping?.length || 0,
    active: tpl.active !== false,
  }));

  if (isLoading) return <SimpleLoading />;
  if (error) {
    return (
      <div className={styles.errorState}>
        {t("taqnyat.loadFailed", "تعذّر تحميل القوالب — حاول لاحقاً")}
      </div>
    );
  }

  return (
    <>
      <div className={styles.container}>
      <div className={styles.syncWrapper}>
        {canUpdate && (
          <button
            className={styles.createBtn}
            onClick={() => setShowCreatePopup(true)}
            type="button"
          >
            <FiPlus size={16} />
            <span>{t("taqnyat.createBtn", "إنشاء قالب جديد")}</span>
          </button>
        )}
        <button
          className={styles.syncBtn}
          onClick={handleSync}
          disabled={sync.isPending}
        >
          <FiRefreshCw size={16} className={sync.isPending ? styles.spinning : ""} />
          <span>{sync.isPending ? t("taqnyat.syncing", "جاري المزامنة...") : t("taqnyat.syncBtn", "مزامنة")}</span>
        </button>
      </div>
        <Table
          title={t("taqnyat.tableTitle", "قوالب Taqnyat")}
          headers={[
            t("taqnyat.col.name", "الاسم"),
            t("taqnyat.col.body", "نص القالب"),
            t("taqnyat.col.lang", "اللغة"),
            t("taqnyat.col.status", "الحالة"),
            t("taqnyat.col.category", "الفئة"),
            t("taqnyat.col.type", "النوع"),
            t("taqnyat.col.invitationMode", "وضع الدعوة"),
            t("taqnyat.col.mappingCount", "المتغيرات"),
            t("taqnyat.col.active", "نشط"),
          ]}
          data={tableData}
          renderCell={renderCell}
          getRowActions={getRowActions}
          showCheckboxes={false}
          showExport={false}
          showFilter={false}
        />
      </div>

      {showAssignPopup && selectedTemplate && (
        <AssignTaqnyatTemplatePopup
          template={selectedTemplate}
          categories={categories}
          onClose={() => {
            setShowAssignPopup(false);
            setSelectedTemplate?.(null);
          }}
          lang={lang}
        />
      )}

      {showCreatePopup && (
        <CreateTaqnyatTemplatePopup
          onClose={() => setShowCreatePopup(false)}
        />
      )}

      <DeleteConfirmation
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          const id = deleteTarget?.id;
          setDeleteTarget(null);
          if (id) await performDelete(id);
        }}
        title={t("taqnyat.deleteBtn", "حذف من Taqnyat")}
        message={t("taqnyat.deleteConfirm", {
          name: deleteTarget?.templateName,
        })}
        itemName={deleteTarget?.templateName}
        confirmText={t("taqnyat.deleteBtn", "حذف من Taqnyat")}
        cancelText={t("common.cancel", "إلغاء")}
        isLoading={deleteTpl.isPending}
      />
    </>
  );
}
