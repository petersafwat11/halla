"use client";

import { useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useMyTickets, useTicketMutation } from "@/hooks/reactQueryHooks/useTickets";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import { FiEye, FiUserPlus, FiCheckSquare, FiAlertTriangle, FiTrash2 } from "react-icons/fi";
import { ticketsAPI } from "@/services/adminDashboard";
import styles from "./TicketsTable.module.css";

export function useTicketsTableData() {
  const { t } = useTranslation("adminTickets");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canUpdate, canDelete } = usePageAccess("tickets");

  const filters = useMemo(() => ({
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 10,
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    priority: searchParams.get("priority"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  }), [searchParams]);

  const { data, isLoading, error } = useMyTickets(filters);

  const deleteMutation = useTicketMutation("deleteTicket");
  const statusMutation = useTicketMutation("updateStatus");
  const updateMutation = useTicketMutation("updateTicket");

  const handleDelete = useCallback(async (ticketId) => {
    if (!confirm(t("messages.confirmDelete"))) return;
    try {
      await deleteMutation.mutateAsync(ticketId);
      toastUtils.success(t("messages.deleteSuccess"));
    } catch (err) {
      handleError(err, t, { fallbackMessage: "messages.deleteError" });
    }
  }, [deleteMutation, t]);

  const handleStatusChange = useCallback(async (ticketId, newStatus) => {
    try {
      await statusMutation.mutateAsync({ ticketId, status: newStatus });
      toastUtils.success(t("messages.statusUpdateSuccess", "Status updated successfully"));
    } catch (err) {
      handleError(err, t, { fallbackMessage: "messages.updateError" });
    }
  }, [statusMutation, t]);

  const handleMarkUrgent = useCallback(async (ticketId) => {
    try {
      await updateMutation.mutateAsync({ ticketId, priority: "high" });
      toastUtils.success(t("messages.markUrgentSuccess"));
    } catch (err) {
      handleError(err, t, { fallbackMessage: "messages.updateError" });
    }
  }, [updateMutation, t]);

  const handleExport = useCallback(async () => {
    try {
      await ticketsAPI.export({
        search: filters.search,
        status: filters.status,
        priority: filters.priority,
        from: filters.from,
        to: filters.to,
      });
    } catch (err) {
      handleError(err, t, { fallbackMessage: "messages.updateError" });
    }
  }, [filters, t]);

  const handlePageChange = useCallback((page) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleStatusBadgeClick = useCallback((row, value) => {
    if (!canUpdate) return;
    const newStatus = value === "open" ? "in_progress" : value === "in_progress" ? "resolved" : "open";
    handleStatusChange(row.id, newStatus);
  }, [canUpdate, handleStatusChange]);

  const getRowActions = useCallback((row) => {
    const actions = [];
    if (row.status === "resolved") {
      actions.push({ type: "dropdown", icon: <FiEye size={16} />, text: t("actions.viewResolution"), onClick: () => row });
    }
    if (canUpdate) {
      actions.push({ type: "dropdown", icon: <FiUserPlus size={16} />, text: t("actions.assign"), onClick: () => row });
      if (row.status !== "resolved") {
        actions.push({ type: "dropdown", icon: <FiCheckSquare size={16} />, text: t("actions.resolve"), onClick: () => row });
      }
      if (row.priority !== "high") {
        actions.push({ type: "dropdown", icon: <FiAlertTriangle size={16} />, text: t("actions.markUrgent"), onClick: () => handleMarkUrgent(row.id) });
      }
    }
    if (canDelete) {
      actions.push({ type: "dropdown", icon: <FiTrash2 size={16} />, text: t("actions.delete"), onClick: () => handleDelete(row.id) });
    }
    return actions;
  }, [canUpdate, canDelete, t, handleMarkUrgent, handleDelete]);

  const bulkActions = useMemo(() => {
    const actions = [];
    if (canUpdate) {
      actions.push({
        icon: <FiCheckSquare size={16} />,
        text: t("bulkActions.resolve"),
        onClick: async (ids) => {
          if (!ids?.length) { toastUtils.warning(t("messages.selectRows", "Please select rows")); return; }
          for (const id of ids) { await handleStatusChange(id, "resolved"); }
        },
      });
    }
    if (canDelete) {
      actions.push({
        icon: <FiTrash2 size={16} />,
        text: t("bulkActions.delete"),
        onClick: async (ids) => {
          if (!ids?.length) { toastUtils.warning(t("messages.selectRows", "Please select rows")); return; }
          if (!confirm(t("messages.confirmBulkDelete"))) return;
          try {
            for (const id of ids) { await deleteMutation.mutateAsync(id); }
            toastUtils.success(t("messages.bulkDeleteSuccess"));
          } catch (err) {
            handleError(err, t, { fallbackMessage: "messages.bulkDeleteError" });
          }
        },
      });
    }
    return actions;
  }, [canUpdate, canDelete, t, handleStatusChange, deleteMutation]);

  const tableData = useMemo(() => (data?.data?.tickets || []).map((ticket) => ({
    id: ticket.id || ticket._id,
    subject: ticket.subject || ticket.type || "-",
    user: ticket.user?.username || ticket.user?.name || ticket.userName || "-",
    priority: ticket.priority || "medium",
    status: ticket.status || "open",
    assignedTo: ticket.assignedTo?.username || ticket.assignedTo?.name || "",
    createdAt: ticket.createdAt || ticket.created_at,
    message: ticket.message || "",
    resolution: ticket.resolution || null,
  })), [data]);

  return {
    data, isLoading, error, filters, tableData, canUpdate, canDelete,
    handleDelete, handleStatusChange, handleMarkUrgent, handleExport,
    handlePageChange, handleStatusBadgeClick, getRowActions, bulkActions,
  };
}

export function useTicketCellRenderer(handlers) {
  const { t } = useTranslation("adminTickets");
  const { canUpdate, handleStatusBadgeClick, handleResponseClick, handleAssignClick } = handlers;

  return useCallback((key, value, row) => {
    if (key === "status") {
      const colorClass = STATUS_CLASS_MAP[value] || styles.statusOpen;
      return (
        <div className={`${styles.statusBadge} ${colorClass} ${canUpdate ? styles.clickableIf : ""}`} onClick={() => handleStatusBadgeClick(row, value)}>
          <span>{t(`status.${value}`, value)}</span>
        </div>
      );
    }
    if (key === "priority") {
      const colorClass = PRIORITY_CLASS_MAP[value] || styles.priorityMedium;
      return (
        <div className={`${styles.priorityBadge} ${colorClass}`}>
          <span>{t(`priority.${value}`, value)}</span>
        </div>
      );
    }
    if (key === "subject") {
      return <span className={styles.clickable} onClick={() => handleResponseClick(row)}>{value}</span>;
    }
    if (key === "assignedTo") {
      return value ? <span>{value}</span> : (
        canUpdate ? <span className={styles.assignClickable} onClick={() => handleAssignClick(row)}>{t("actions.assign")}</span> : <span>-</span>
      );
    }
    if (key === "createdAt" && value) return new Date(value).toLocaleDateString();
    return value;
  }, [canUpdate, t, handleStatusBadgeClick, handleResponseClick, handleAssignClick]);
}

const STATUS_CLASS_MAP = {
  open: styles.statusOpen,
  in_progress: styles.statusInProgress,
  resolved: styles.statusResolved,
  closed: styles.statusClosed,
};

const PRIORITY_CLASS_MAP = {
  low: styles.priorityLow,
  medium: styles.priorityMedium,
  high: styles.priorityHigh,
};
