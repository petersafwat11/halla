"use client";

import {
  useAdminModerators,
  useAdminModeratorMutation,
  useAdminModeratorsExport,
} from "@/hooks/admin";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import { FiEdit2, FiCheckCircle, FiSlash, FiTrash2 } from "react-icons/fi";
import { normalizeAdminFilters } from "@/utils/filterNormalizer";
import Table from "@/ui/commen/new-table/Table";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { getStatusVisual } from "@/utils/statusColors";
import AddModeratorPopup from "./AddModeratorPopup";
import EditModeratorPopup from "./EditModeratorPopup";
import styles from "./ModeratorsTable.module.css";

export default function ModeratorsTable({ showAddPopup: externalShowAdd, setShowAddPopup: externalSetShowAdd }) {
  const { t } = useTranslation("adminModerators");
  const router = useRouter();
  const pathname = usePathname();
  const lang = pathname?.split("/")[1] === "en" ? "en" : "ar";
  const searchParams = useSearchParams();
  const { canCreate, canUpdate, canDelete } = usePageAccess("moderators");
  const [internalShowAdd, setInternalShowAdd] = useState(false);
  const showAddPopup = externalShowAdd !== undefined ? externalShowAdd : internalShowAdd;
  const setShowAddPopup = externalSetShowAdd || setInternalShowAdd;
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [selectedModerator, setSelectedModerator] = useState(null);

  const filters = useMemo(() => normalizeAdminFilters(searchParams, { limit: 10 }), [searchParams]);

  const { data, isLoading } = useAdminModerators(filters);
  const deleteModerator = useAdminModeratorMutation("delete");
  const bulkDelete = useAdminModeratorMutation("bulkDelete");
  const updateStatus = useAdminModeratorMutation("updateStatus");
  const exportModerators = useAdminModeratorsExport();

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
      await exportModerators.mutateAsync({
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
          const mod = (data?.data?.moderators || []).find(m => (m.id || m._id) === r.id);
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
      const labels = {
        active: t("table.status.active", "Active"),
        inactive: t("table.status.inactive", "Inactive"),
        pending: t("table.status.pending", "Pending"),
      };
      const { fg, bg } = getStatusVisual(value);
      return (
        <div
          className={`${styles.statusBadge} ${styles.statusBadgeReadonly}`}
          style={{ background: bg }}
        >
          <span className={styles.statusBadgeText} style={{ color: fg }}>{labels[value] || labels.pending}</span>
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
    if (key === "phone") {
      return <span dir="ltr" style={{ unicodeBidi: "embed", display: "inline-block" }}>{value}</span>;
    }
    return value;
  };

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`?${params.toString()}`);
  };

  const handleSearchChange = (query) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set("search", query);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handleFilterChange = (statusValue) => {
    const params = new URLSearchParams(searchParams.toString());
    if (statusValue) {
      params.set("status", statusValue);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const tableData = (data?.data?.moderators || []).map((moderator) => ({
    id: moderator.id || moderator._id,
    name: moderator.name || "-",
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
          mode="server"
          title={t("moderators.title", "إدارة المشرفين")}
          headers={[
            t("moderators.columns.name", "الاسم"),
            t("moderators.columns.email", "البريد الإلكتروني"),
            t("moderators.columns.phone", "الجوال"),
            t("moderators.columns.role", "الدور"),
            t("moderators.columns.status", "الحالة"),
            t("moderators.columns.createdAt", "تاريخ الإضافة"),
          ]}
          data={tableData}
          searchValue={filters.search}
          onSearchChange={handleSearchChange}
          activeFilter={filters.status}
          onFilterChange={handleFilterChange}
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
            currentPage: parseInt(filters.page, 10) || 1,
            totalPages: data?.data?.pagination?.pages || 1,
            totalItems: data?.data?.pagination?.total || 0,
            onPageChange: handlePageChange,
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
