"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toast } from "react-toastify";
import { FiEye, FiUserPlus, FiCheckSquare, FiAlertTriangle, FiTrash2 } from "react-icons/fi";
import Table from "@/ui/commen/new-table/Table";
import { ticketsAPI } from "@/services/adminDashboard";
import AssignTicketPopup from "./AssignTicketPopup";
import TicketResponsePopup from "./TicketResponsePopup";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./TicketsTable.module.css";

export default function TicketsTable() {
  const { t } = useTranslation("adminDashboard");
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { canUpdate, canDelete } = usePageAccess("tickets");
  const [showAssignPopup, setShowAssignPopup] = useState(false);
  const [showResponsePopup, setShowResponsePopup] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);

  const filters = {
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 10,
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    priority: searchParams.get("priority"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", filters],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.tickets.getMyTickets,
        params: filters,
      }),
    staleTime: 5 * 60 * 1000,
  });

  const deleteTicket = useMutation({
    mutationFn: (ticketId) =>
      apiRequest({ method: "DELETE", path: API_PATHS.tickets.deleteTicket(ticketId) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ ticketId, status }) =>
      apiRequest({ method: "PATCH", path: API_PATHS.tickets.updateTicketStatus(ticketId), data: { status } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const updatePriority = useMutation({
    mutationFn: ({ ticketId, priority }) =>
      apiRequest({ method: "PATCH", path: API_PATHS.tickets.updateTicket(ticketId), data: { priority } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const handleDelete = async (ticketId) => {
    if (!confirm(t("tickets.confirmDelete", "هل أنت متأكد من حذف هذه الشكوى؟"))) return;
    try {
      await deleteTicket.mutateAsync(ticketId);
      toast.success(t("tickets.deleteSuccess", "تم حذف الشكوى بنجاح"));
    } catch (error) {
      toast.error(error.message || t("tickets.deleteError", "فشل حذف الشكوى"));
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await updateStatus.mutateAsync({ ticketId, status: newStatus });
      toast.success(t("tickets.statusUpdateSuccess", "تم تحديث الحالة بنجاح"));
    } catch (error) {
      toast.error(error.message || t("tickets.statusUpdateError", "فشل تحديث الحالة"));
    }
  };

  const handleMarkUrgent = async (ticketId) => {
    try {
      await updatePriority.mutateAsync({ ticketId, priority: "high" });
      toast.success(t("tickets.markedUrgent", "تم تحديد الشكوى كعاجلة"));
    } catch (error) {
      toast.error(error.message || t("tickets.markUrgentError", "فشل تحديد الأولوية"));
    }
  };

  const handleAssignClick = (ticket) => { setSelectedTicket(ticket); setShowAssignPopup(true); };
  const handleResponseClick = (ticket) => { setSelectedTicket(ticket); setViewOnly(false); setShowResponsePopup(true); };
  const handleViewResolutionClick = (ticket) => { setSelectedTicket(ticket); setViewOnly(true); setShowResponsePopup(true); };

  const handleExport = async () => {
    try {
      await ticketsAPI.export({
        search: filters.search,
        status: filters.status,
        priority: filters.priority,
        from: filters.from,
        to: filters.to,
      });
    } catch (error) {
      toast.error(t("tickets.exportError", "فشل تصدير البيانات"));
    }
  };

  const getRowActions = (row) => {
    const actions = [];

    if (row.status === "resolved") {
      actions.push({
        type: "dropdown",
        icon: <FiEye size={16} />,
        text: t("tickets.viewResolution", "عرض الحل"),
        onClick: (r) => handleViewResolutionClick(r),
      });
    }

    if (canUpdate) {
      actions.push({
        type: "dropdown",
        icon: <FiUserPlus size={16} />,
        text: t("tickets.assign", "تعيين"),
        onClick: (r) => handleAssignClick(r),
      });

      if (row.status !== "resolved") {
        actions.push({
          type: "dropdown",
          icon: <FiCheckSquare size={16} />,
          text: t("tickets.resolve", "حل الشكوى"),
          onClick: (r) => handleResponseClick(r),
        });
      }

      if (row.priority !== "high") {
        actions.push({
          type: "dropdown",
          icon: <FiAlertTriangle size={16} />,
          text: t("tickets.markUrgent", "تحديد كعاجل"),
          onClick: (r) => handleMarkUrgent(r.id),
        });
      }
    }

    if (canDelete) {
      actions.push({
        type: "dropdown",
        icon: <FiTrash2 size={16} />,
        text: t("tickets.delete", "حذف"),
        onClick: (r) => handleDelete(r.id),
      });
    }

    return actions;
  };

  const bulkActions = [];
  if (canUpdate) {
    bulkActions.push({
      icon: <FiCheckSquare size={16} />,
      text: t("tickets.bulkResolve", "حل المحدد"),
      onClick: async (ids) => {
        if (!ids?.length) { toast.warning(t("tickets.selectRows", "الرجاء تحديد شكاوى")); return; }
        for (const id of ids) { await handleStatusChange(id, "resolved"); }
      },
    });
  }
  if (canDelete) {
    bulkActions.push({
      icon: <FiTrash2 size={16} />,
      text: t("tickets.bulkDelete", "حذف المحدد"),
      onClick: async (ids) => {
        if (!ids?.length) { toast.warning(t("tickets.selectRows", "الرجاء تحديد شكاوى")); return; }
        if (!confirm(t("tickets.confirmBulkDelete", `هل أنت متأكد من حذف ${ids.length} شكوى؟`))) return;
        for (const id of ids) { await deleteTicket.mutateAsync(id); }
        toast.success(t("tickets.bulkDeleteSuccess", "تم حذف الشكاوى بنجاح"));
      },
    });
  }

  const renderCell = (key, value, row) => {
    if (key === "status") {
      const statusConfig = {
        open: { bg: "#FBF3E6", color: "#D38200", text: t("tickets.status.open", "مفتوح") },
        in_progress: { bg: "#E8F4FD", color: "#3498DB", text: t("tickets.status.inProgress", "قيد المعالجة") },
        resolved: { bg: "#EAF4EF", color: "#2A8C5B", text: t("tickets.status.resolved", "محلول") },
        closed: { bg: "#F5F5F5", color: "#666666", text: t("tickets.status.closed", "مغلق") },
      };
      const config = statusConfig[value] || statusConfig.open;
      return (
        <div
          style={{
            display: "inline-flex", padding: "0.3rem 1.2rem", justifyContent: "center",
            alignItems: "center", borderRadius: "9999px", background: config.bg,
            cursor: canUpdate ? "pointer" : "default",
          }}
          onClick={() => {
            if (!canUpdate) return;
            const newStatus = value === "open" ? "in_progress" : value === "in_progress" ? "resolved" : "open";
            handleStatusChange(row.id, newStatus);
          }}
        >
          <span style={{ color: config.color, fontFamily: "Cairo", fontSize: "1.2rem" }}>{config.text}</span>
        </div>
      );
    }

    if (key === "priority") {
      const priorityConfig = {
        low: { bg: "#F5F5F5", color: "#666666", text: t("tickets.priority.low", "منخفض") },
        medium: { bg: "#FBF3E6", color: "#D38200", text: t("tickets.priority.medium", "متوسط") },
        high: { bg: "#F9EBEA", color: "#C0392B", text: t("tickets.priority.high", "عالي") },
      };
      const config = priorityConfig[value] || priorityConfig.medium;
      return (
        <div style={{ display: "inline-flex", padding: "0.3rem 1.2rem", justifyContent: "center", alignItems: "center", borderRadius: "9999px", background: config.bg }}>
          <span style={{ color: config.color, fontFamily: "Cairo", fontSize: "1.2rem" }}>{config.text}</span>
        </div>
      );
    }

    if (key === "subject") {
      return (
        <span style={{ color: "#3498DB", cursor: "pointer", textDecoration: "underline" }} onClick={() => handleResponseClick(row)}>
          {value}
        </span>
      );
    }

    if (key === "assignedTo") {
      return value ? <span>{value}</span> : (
        canUpdate ? (
          <span style={{ color: "#D38200", cursor: "pointer", textDecoration: "underline" }} onClick={() => handleAssignClick(row)}>
            {t("tickets.assign", "تعيين")}
          </span>
        ) : <span>-</span>
      );
    }

    if (key === "createdAt" && value) return new Date(value).toLocaleDateString("ar-SA");
    return value;
  };

  const tableData = (data?.data || []).map((ticket) => ({
    id: ticket.id || ticket._id,
    subject: ticket.subject || ticket.type || "-",
    user: ticket.user?.username || ticket.user?.name || ticket.userName || "-",
    priority: ticket.priority || "medium",
    status: ticket.status || "open",
    assignedTo: ticket.assignedTo?.username || ticket.assignedTo?.name || "",
    createdAt: ticket.createdAt || ticket.created_at,
    // hidden — used by popups, not rendered as table columns
    message: ticket.message || "",
    resolution: ticket.resolution || null,
  }));

  if (isLoading) return <SimpleLoading />;

  return (
    <>
      <div className={styles.container}>
        <Table
          title={t("tickets.title", "إدارة الشكاوى")}
          headers={[
            t("tickets.columns.subject", "الموضوع"),
            t("tickets.columns.user", "المستخدم"),
            t("tickets.columns.priority", "الأولوية"),
            t("tickets.columns.status", "الحالة"),
            t("tickets.columns.assignedTo", "المعين إلى"),
            t("tickets.columns.createdAt", "تاريخ الإنشاء"),
          ]}
          data={tableData}
          headerKeys={["subject", "user", "priority", "status", "assignedTo", "createdAt"]}
          renderCell={renderCell}
          getRowActions={getRowActions}
          showCheckboxes={canUpdate || canDelete}
          bulkActions={bulkActions}
          showExport={true}
          onExportClick={handleExport}
          filterOptions={[
            { label: t("tickets.filter.all", "الكل"), value: "" },
            { label: t("tickets.filter.open", "مفتوح"), value: "open" },
            { label: t("tickets.filter.inProgress", "قيد المعالجة"), value: "in_progress" },
            { label: t("tickets.filter.resolved", "محلول"), value: "resolved" },
            { label: t("tickets.filter.closed", "مغلق"), value: "closed" },
          ]}
          pagination={{
            currentPage: parseInt(filters.page),
            totalPages: data?.pagination?.pages || data?.pagination?.totalPages || 1,
            totalItems: data?.pagination?.total || 0,
            onPageChange: (page) => {
              const params = new URLSearchParams(searchParams);
              params.set("page", page);
              router.push(`?${params.toString()}`);
            },
          }}
        />
      </div>

      {showAssignPopup && selectedTicket && (
        <AssignTicketPopup ticket={selectedTicket} onClose={() => { setShowAssignPopup(false); setSelectedTicket(null); }} />
      )}
      {showResponsePopup && selectedTicket && (
        <TicketResponsePopup
          ticket={selectedTicket}
          viewOnly={viewOnly}
          onClose={() => { setShowResponsePopup(false); setSelectedTicket(null); setViewOnly(false); }}
        />
      )}
    </>
  );
}
