"use client";

import { useMemo, useCallback } from "react";
import { useAdminEvents, useAdminEventMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { FiEye, FiCheckCircle, FiSlash, FiTrash2 } from "react-icons/fi";
import Table from "@/ui/commen/new-table/Table";
import { eventsAPI } from "@/services/adminDashboard";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./EventsTable.module.css";

export default function EventsTable() {
  const { t } = useTranslation("adminDashboard");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canCreate, canUpdate, canDelete } = usePageAccess("events");

  const filters = useMemo(() => ({
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 10,
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  }), [searchParams]);

  const { data, isLoading, error } = useAdminEvents(filters);

  const deleteEvent = useAdminEventMutation("delete");
  const bulkDelete = useAdminEventMutation("bulkDelete");
  const updateStatus = useAdminEventMutation("updateStatus");

  const handleDelete = async (eventId) => {
    if (!confirm(t("events.confirmDelete", "هل أنت متأكد من حذف هذه المناسبة؟"))) return;
    try {
      await deleteEvent.mutateAsync(eventId);
      toastUtils.success(t("events.deleteSuccess", "تم حذف المناسبة بنجاح"));
    } catch (error) {
      toastUtils.error(t("events.deleteError", "فشل حذف المناسبة"));
    }
  };

  const handleBulkDelete = async (ids) => {
    if (!ids?.length) { toastUtils.warning(t("events.selectRows", "الرجاء تحديد مناسبات للحذف")); return; }
    if (!confirm(t("events.confirmBulkDelete", `هل أنت متأكد من حذف ${ids.length} مناسبة؟`))) return;
    try {
      await bulkDelete.mutateAsync(ids);
      toastUtils.success(t("events.bulkDeleteSuccess", "تم حذف المناسبات بنجاح"));
    } catch (error) {
      toastUtils.error(t("events.bulkDeleteError", "فشل حذف المناسبات"));
    }
  };

  const handleStatusChange = async (eventId, newStatus) => {
    try {
      await updateStatus.mutateAsync({ eventId, status: newStatus });
      toastUtils.success(t("events.statusUpdateSuccess", "تم تحديث الحالة بنجاح"));
    } catch (error) {
      toastUtils.error(t("events.statusUpdateError", "فشل تحديث الحالة"));
    }
  };

  const handleExport = async () => {
    try {
      await eventsAPI.export({
        search: filters.search,
        status: filters.status,
        from: filters.from,
        to: filters.to,
      });
    } catch (error) {
      toastUtils.error(t("events.exportError", "فشل تصدير البيانات"));
    }
  };

  const getRowActions = (row) => {
    const actions = [
      {
        type: "dropdown",
        icon: <FiEye size={16} />,
        text: t("events.viewDetails", "عرض التفاصيل"),
        onClick: (r) => router.push(`/admin-dash/events/${r.id}`),
      },
    ];

    if (canUpdate) {
      actions.push({
        type: "dropdown",
        icon: row.status === "cancelled" ? <FiCheckCircle size={16} /> : <FiSlash size={16} />,
        text: row.status === "cancelled"
          ? t("events.activate", "تفعيل")
          : t("events.suspend", "إيقاف"),
        onClick: (r) => handleStatusChange(r.id, r.status === "cancelled" ? (r.previousStatus || "published") : "cancelled"),
      });
    }

    if (canDelete) {
      actions.push({
        type: "dropdown",
        icon: <FiTrash2 size={16} />,
        text: t("events.delete", "حذف"),
        onClick: (r) => handleDelete(r.id),
      });
    }

    return actions;
  };

  const bulkActions = [];
  if (canDelete) {
    bulkActions.push({
      icon: <FiTrash2 size={16} />,
      text: t("events.bulkDelete", "حذف المحدد"),
      onClick: (ids) => handleBulkDelete(ids),
    });
  }

  const renderCell = (key, value, row) => {
    if (key === "status") {
      const statusConfig = {
        scheduled: { bg: "#E8F4FD", color: "#3498DB", text: t("events.status.scheduled", "مجدول") },
        live: { bg: "#EAF4EF", color: "#2A8C5B", text: t("events.status.live", "مباشر") },
        completed: { bg: "#F5F5F5", color: "#666666", text: t("events.status.completed", "منتهي") },
        draft: { bg: "#FBF3E6", color: "#D38200", text: t("events.status.draft", "مسودة") },
        cancelled: { bg: "#F9EBEA", color: "#C0392B", text: t("events.status.cancelled", "ملغي") },
      };
      const config = statusConfig[value] || statusConfig.draft;
      return (
        <div
          style={{
            display: "inline-flex",
            padding: "0.3rem 1.2rem",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "9999px",
            background: config.bg,
            cursor: canUpdate ? "pointer" : "default",
          }}
          onClick={() => {
            if (!canUpdate) return;
            const newStatus = value === "cancelled" ? (row.previousStatus || "published") : "cancelled";
            handleStatusChange(row.id, newStatus);
          }}
        >
          <span style={{ color: config.color, fontFamily: "Cairo", fontSize: "1.2rem" }}>
            {config.text}
          </span>
        </div>
      );
    }

    if (key === "date" && value) {
      return new Date(value).toLocaleDateString("ar-SA");
    }

    if (key === "title") {
      return (
        <span
          style={{ color: "#3498DB", cursor: "pointer", textDecoration: "underline" }}
          onClick={() => router.push(`/admin-dash/events/${row.id}`)}
        >
          {value}
        </span>
      );
    }

    return value;
  };

  const tableData = (data?.data || []).map((event) => ({
    id: event.id || event._id,
    title: event.title || "-",
    host: event.host?.name || event.host?.username || event.hostName || "-",
    date: event.date || event.eventDate,
    guests: event.guestCount || 0,
    status: event.status || "draft",
  }));

  const handlePageChange = useCallback((page) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page);
    router.push(`?${params.toString()}`);
  }, [searchParams, router]);

  if (isLoading) return <SimpleLoading />;
  if (error) return (
    <div className={styles.container}>
      <p className={styles.error}>{t("events.loadError", "فشل في تحميل المناسبات")}</p>
    </div>
  );

  return (
    <div className={styles.container}>
      <Table
        title={t("events.title", "إدارة المناسبات")}
        headers={[
          t("events.columns.title", "العنوان"),
          t("events.columns.host", "المضيف"),
          t("events.columns.date", "التاريخ"),
          t("events.columns.guests", "الضيوف"),
          t("events.columns.status", "الحالة"),
        ]}
        data={tableData}
        renderCell={renderCell}
        getRowActions={getRowActions}
        showCheckboxes={canDelete}
        bulkActions={bulkActions}
        showExport={true}
        onExportClick={handleExport}
        filterOptions={[
          { label: t("events.filter.all", "الكل"), value: "" },
          { label: t("events.filter.draft", "مسودة"), value: "draft" },
          { label: t("events.filter.scheduled", "مجدول"), value: "scheduled" },
          { label: t("events.filter.live", "مباشر"), value: "live" },
          { label: t("events.filter.completed", "منتهي"), value: "completed" },
          { label: t("events.filter.cancelled", "ملغي"), value: "cancelled" },
        ]}
        pagination={{
          currentPage: parseInt(filters.page),
          totalPages: data?.pagination?.pages || 1,
          totalItems: data?.pagination?.total || 0,
          onPageChange: handlePageChange,
        }}
      />
    </div>
  );
}
