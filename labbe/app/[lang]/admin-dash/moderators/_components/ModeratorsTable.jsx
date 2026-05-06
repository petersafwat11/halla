"use client";

import { useAdminModerators, useAdminModeratorMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import { FiEdit2, FiCheckCircle, FiSlash, FiTrash2 } from "react-icons/fi";
import Table from "@/ui/commen/new-table/Table";
import { moderatorsAPI } from "@/services/adminDashboard";
import AddModeratorPopup from "./AddModeratorPopup";
import EditModeratorPopup from "./EditModeratorPopup";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./ModeratorsTable.module.css";

export default function ModeratorsTable({ showAddPopup: externalShowAdd, setShowAddPopup: externalSetShowAdd }) {
  const { t } = useTranslation("adminDashboard");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canCreate, canUpdate, canDelete } = usePageAccess("moderators");
  const [internalShowAdd, setInternalShowAdd] = useState(false);
  const showAddPopup = externalShowAdd !== undefined ? externalShowAdd : internalShowAdd;
  const setShowAddPopup = externalSetShowAdd || setInternalShowAdd;
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [selectedModerator, setSelectedModerator] = useState(null);

  const filters = {
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 10,
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  };

  const { data, isLoading } = useAdminModerators(filters);
  const deleteModerator = useAdminModeratorMutation("delete");
  const bulkDelete = useAdminModeratorMutation("bulkDelete");
  const updateStatus = useAdminModeratorMutation("updateStatus");

  const handleDelete = async (moderatorId) => {
    if (!confirm(t("confirmDelete.message", "Are you sure you want to delete this moderator?"))) return;
    try {
      await deleteModerator.mutateAsync(moderatorId);
      toastUtils.success(t("deleteModerator.success", "Moderator deleted successfully"));
    } catch (error) {
      handleError(error, t);
    }
  };

  const handleBulkDelete = async (ids) => {
    if (!ids?.length) { toastUtils.warning(t("table.selectRows", "Please select moderators to delete")); return; }
    if (!confirm(t("confirmDelete.message", "Are you sure you want to delete these moderators?"))) return;
    try {
      await bulkDelete.mutateAsync(ids);
      toastUtils.success(t("deleteModerator.success", "Moderators deleted successfully"));
    } catch (error) {
      handleError(error, t);
    }
  };

  const handleStatusChange = async (moderatorId, newStatus) => {
    try {
      await updateStatus.mutateAsync({ moderatorId, status: newStatus });
      toastUtils.success(t("table.statusUpdated", "Status updated successfully"));
    } catch (error) {
      handleError(error, t);
    }
  };

  const handleEditClick = (moderator) => {
    setSelectedModerator(moderator);
    setShowEditPopup(true);
  };

  const handleExport = async () => {
    try {
      await moderatorsAPI.export({
        search: filters.search,
        status: filters.status,
        from: filters.from,
        to: filters.to,
      });
    } catch (error) {
      handleError(error, t);
    }
  };

  const getRowActions = (row) => {
    const actions = [];

    if (canUpdate) {
      actions.push({
        type: "dropdown",
        icon: <FiEdit2 size={16} />,
        text: t("moderators.edit", "تعديل"),
        onClick: (r) => {
          const mod = (data?.moderators || []).find(m => (m.id || m._id) === r.id);
          if (mod) handleEditClick(mod);
        },
      });
      actions.push({
        type: "dropdown",
        icon: row.status === "active" ? <FiSlash size={16} /> : <FiCheckCircle size={16} />,
        text: row.status === "active"
          ? t("moderators.suspend", "إيقاف")
          : t("moderators.activate", "تفعيل"),
        onClick: (r) => handleStatusChange(r.id, r.status === "active" ? "inactive" : "active"),
      });
    }

    if (canDelete) {
      actions.push({
        type: "dropdown",
        icon: <FiTrash2 size={16} />,
        text: t("moderators.delete", "حذف"),
        onClick: (r) => handleDelete(r.id),
      });
    }

    return actions;
  };

  const bulkActions = [];
  if (canDelete) {
    bulkActions.push({
      icon: <FiTrash2 size={16} />,
      text: t("moderators.bulkDelete", "حذف المحدد"),
      onClick: (ids) => handleBulkDelete(ids),
    });
  }

  const renderCell = (key, value, row) => {
    if (key === "status") {
      const statusConfig = {
        active: { bg: "#EAF4EF", color: "#2A8C5B", text: t("table.status.active", "Active") },
        inactive: { bg: "#F9EBEA", color: "#C0392B", text: t("table.status.inactive", "Inactive") },
        pending: { bg: "#FBF3E6", color: "#D38200", text: t("table.status.pending", "Pending") },
      };
      const config = statusConfig[value] || statusConfig.pending;
      return (
        <div
          className={`${styles.statusBadge} ${canUpdate ? styles.statusBadgeClickable : styles.statusBadgeReadonly}`}
          style={{ background: config.bg }}
          onClick={() => {
            if (!canUpdate) return;
            handleStatusChange(row.id, value === "active" ? "inactive" : "active");
          }}
        >
          <span className={styles.statusBadgeText} style={{ color: config.color }}>{config.text}</span>
        </div>
      );
    }

    if (key === "name") {
      return (
        <span
          className={canUpdate ? styles.linkCell : styles.plainCell}
          onClick={() => canUpdate && handleEditClick(row)}
        >
          {value}
        </span>
      );
    }

    if (key === "createdAt" && value) return new Date(value).toLocaleDateString("ar-SA");
    return value;
  };

  const tableData = (data?.moderators || []).map((moderator) => ({
    id: moderator.id || moderator._id,
    name: moderator.name || moderator.username || "-",
    email: moderator.email || "-",
    phone: moderator.phoneNumber || moderator.phone || "-",
    role: moderator.role || "moderator",
    status: moderator.status || "pending",
    createdAt: moderator.createdAt || moderator.created_at,
  }));

  if (isLoading) return <SimpleLoading />;

  return (
    <>
      <div className={styles.container}>
        <Table
          title={t("moderators.title", "إدارة المشرفين")}
          headers={[
            t("moderators.columns.name", "الاسم"),
            t("moderators.columns.email", "البريد الإلكتروني"),
            t("moderators.columns.phone", "الهاتف"),
            t("moderators.columns.role", "الدور"),
            t("moderators.columns.status", "الحالة"),
            t("moderators.columns.createdAt", "تاريخ الإضافة"),
          ]}
          data={tableData}
          renderCell={renderCell}
          getRowActions={getRowActions}
          showCheckboxes={canDelete}
          bulkActions={bulkActions}
          showExport={true}
          onExportClick={handleExport}
          filterOptions={[
            { label: t("moderators.filter.all", "الكل"), value: "" },
            { label: t("moderators.filter.active", "نشط"), value: "active" },
            { label: t("moderators.filter.inactive", "غير نشط"), value: "inactive" },
          ]}
          pagination={{
            currentPage: parseInt(filters.page),
            totalPages: data?.pagination?.pages || 1,
            totalItems: data?.pagination?.total || 0,
            onPageChange: (page) => {
              const params = new URLSearchParams(searchParams);
              params.set("page", page);
              router.push(`?${params.toString()}`);
            },
          }}
        />
      </div>

      {showAddPopup && <AddModeratorPopup onClose={() => setShowAddPopup(false)} />}
      {showEditPopup && selectedModerator && (
        <EditModeratorPopup moderator={selectedModerator} onClose={() => { setShowEditPopup(false); setSelectedModerator(null); }} />
      )}
    </>
  );
}
