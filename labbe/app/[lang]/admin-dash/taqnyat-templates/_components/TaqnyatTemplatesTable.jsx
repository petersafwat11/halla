"use client";

import { useTranslation } from "react-i18next";
import { usePageAccess } from "@/hooks/usePageAccess";
import {
  useAdminTaqnyatTemplates,
  useSyncTaqnyat,
  useDeleteTaqnyatTemplate,
} from "@/hooks/queries/useTaqnyatTemplates";
import { useTemplateCategories } from "@/hooks/queries/useTemplates";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import Table from "@/ui/commen/new-table/Table";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
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
  const { data, isLoading } = useAdminTaqnyatTemplates();
  const { data: catData } = useTemplateCategories({ admin: true });
  const sync = useSyncTaqnyat();
  const deleteTpl = useDeleteTaqnyatTemplate();

  const templates = data?.data?.templates || data?.templates || [];
  const categories = catData?.data?.categories || catData?.categories || [];

  const handleSync = async () => {
    try {
      const res = await sync.mutateAsync();
      const count = res?.data?.count || res?.count || 0;
      toastUtils.success(`${t("taqnyat.synced")}: ${count}`);
    } catch (err) {
      handleError(err, t, { fallbackMessage: "taqnyat.synced" });
    }
  };

  const handleDelete = async (row) => {
    const confirmed = window.confirm(
      t("taqnyat.deleteConfirm", { name: row.templateName })
    );
    if (!confirmed) return;
    try {
      await deleteTpl.mutateAsync(row.id);
      toastUtils.success(t("taqnyat.deleted", "تم حذف القالب"));
    } catch (err) {
      handleError(err, t, { fallbackMessage: "taqnyat.deleteFailed" });
    }
  };

  // The Table component hands the row's flattened tableData object back to
  // action handlers. The Assign popup needs the full Mongo doc (it reads
  // _id, varMapping, sortOrder — none of which are in tableData), so we
  // look the original template up by id before opening the popup.
  const handleAssignFromRow = (row) => {
    const original = templates.find((tpl) => tpl._id === row.id);
    onAssignClick(original || row);
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
        onClick: (r) => handleDelete(r),
      });
    }
    return actions;
  };

  const renderCell = (key, value, row) => {
    if (key === "name") {
      return (
        <div>
          <strong>{row.templateName || "-"}</strong>
          <div className={styles.templateBody}>
            {row.bodyText?.substring(0, 80) || ""}
            {row.bodyText && row.bodyText.length > 80 ? "…" : ""}
          </div>
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

    if (key === "active") {
      return value ? (
        <span className={styles.activeYes}>✓</span>
      ) : (
        <span className={styles.activeNo}>—</span>
      );
    }

    return value;
  };

  const tableData = templates.map((tpl) => ({
    id: tpl._id,
    name: tpl.templateName,
    language: tpl.language || "ar",
    status: tpl.status,
    category: tpl.category,
    mappingCount: tpl.varMapping?.length || 0,
    active: tpl.active !== false,
    bodyText: tpl.bodyText,
    templateName: tpl.templateName,
  }));

  if (isLoading) return <SimpleLoading />;

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
            t("taqnyat.col.lang", "اللغة"),
            t("taqnyat.col.status", "الحالة"),
            t("taqnyat.col.category", "الفئة"),
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
    </>
  );
}
