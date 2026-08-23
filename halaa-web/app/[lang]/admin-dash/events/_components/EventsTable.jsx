"use client";

import { useMemo, useCallback } from "react";
import {
  useAdminEvents,
  useAdminEventMutation,
  useAdminEventsExport,
} from "@/hooks/admin";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { FiEye, FiCheckCircle, FiSlash, FiTrash2 } from "react-icons/fi";
import Table from "@/ui/commen/new-table/Table";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { getStatusVisual } from "@/utils/statusColors";
import styles from "./EventsTable.module.css";

export default function EventsTable() {
  const { t } = useTranslation("adminEvents");
  const router = useRouter();
  const pathname = usePathname();
  const lang = pathname?.split("/")[1] === "en" ? "en" : "ar";
  const searchParams = useSearchParams();
  const { canCreate, canUpdate, canDelete } = usePageAccess("events");

  const filters = useMemo(() => ({
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 10,
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "",
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  }), [searchParams]);

  const { data, isLoading, error } = useAdminEvents(filters);

  const deleteEvent = useAdminEventMutation("delete");
  const bulkDelete = useAdminEventMutation("bulkDelete");
  const updateStatus = useAdminEventMutation("updateStatus");
  const exportEvents = useAdminEventsExport();

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
    const confirmMessage = newStatus === "cancelled"
      ? t("events.confirmSuspend", "هل أنت متأكد من إيقاف هذه المناسبة؟")
      : t("events.confirmActivate", "هل أنت متأكد من تفعيل هذه المناسبة؟");
    if (!confirm(confirmMessage)) return;
    try {
      await updateStatus.mutateAsync({ eventId, status: newStatus });
      toastUtils.success(t("events.statusUpdateSuccess", "تم تحديث الحالة بنجاح"));
    } catch (error) {
      toastUtils.error(t("events.statusUpdateError", "فشل تحديث الحالة"));
    }
  };

  const handleExport = async () => {
    try {
      await exportEvents.mutateAsync({
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
        onClick: (r) => router.push(`/${lang}/admin-dash/events/${r.id}`),
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
      const statusText = {
        scheduled: t("events.status.scheduled", "مجدول"),
        live: t("events.status.live", "مباشر"),
        completed: t("events.status.completed", "منتهي"),
        pending_scheduling: t("events.status.pending_scheduling", "في انتظار الجدولة"),
        cancelled: t("events.status.cancelled", "ملغي"),
      };
      // Unknown status falls back to the pending_scheduling label/colors,
      // matching the previous behavior.
      const resolvedStatus = statusText[value] ? value : "pending_scheduling";
      const { fg, bg } = getStatusVisual(resolvedStatus);
      const text = statusText[resolvedStatus];
      return (
        <div
          style={{
            display: "inline-flex",
            padding: "0.3rem 1.2rem",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "9999px",
            background: bg,
          }}
        >
          <span style={{ color: fg, fontFamily: "Cairo", fontSize: "1.2rem" }}>
            {text}
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
          onClick={() => router.push(`/${lang}/admin-dash/events/${row.id}`)}
        >
          {value}
        </span>
      );
    }

    return value;
  };

  const rawEvents = Array.isArray(data?.data) ? data.data : (data?.data?.events || []);
  const tableData = rawEvents.map((event) => ({
    id: event.id || event._id,
    title: event.title || "-",
    host: event.host?.name || event.host?.username || event.hostName || "-",
    date: event.date || event.eventDate,
    guests: event.guestCount || 0,
    status: event.status || "pending_scheduling",
  }));

  const handlePageChange = useCallback((page) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`?${params.toString()}`);
  }, [searchParams, router]);

  const handleSearchChange = useCallback((query) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set("search", query);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }, [searchParams, router]);

  const handleFilterChange = useCallback((statusValue) => {
    const params = new URLSearchParams(searchParams.toString());
    if (statusValue) {
      params.set("status", statusValue);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
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
        mode="server"
        title={t("events.title", "إدارة المناسبات")}
        headers={[
          t("events.columns.title", "العنوان"),
          t("events.columns.host", "المضيف"),
          t("events.columns.date", "التاريخ"),
          t("events.columns.guests", "الضيوف"),
          t("events.columns.status", "الحالة"),
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
          { label: t("events.filter.all", "الكل"), value: "" },
          { label: t("events.filter.pending_scheduling", "في انتظار الجدولة"), value: "pending_scheduling" },
          { label: t("events.filter.scheduled", "مجدول"), value: "scheduled" },
          { label: t("events.filter.live", "مباشر"), value: "live" },
          { label: t("events.filter.completed", "منتهي"), value: "completed" },
          { label: t("events.filter.cancelled", "ملغي"), value: "cancelled" },
        ]}
        pagination={{
          currentPage: parseInt(filters.page, 10) || 1,
          totalPages: data?.pagination?.pages || 1,
          totalItems: data?.pagination?.total || 0,
          onPageChange: handlePageChange,
        }}
      />
    </div>
  );
}
