"use client";

import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FiEye, FiUserPlus, FiCheckSquare, FiAlertTriangle, FiTrash2 } from "react-icons/fi";
import Table from "@/ui/commen/new-table/Table";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import styles from "./TicketsTable.module.css";

const STATUS_CLASS_MAP = {
  open: styles.statusOpen,
  in_progress: styles.statusInProgress,
  waiting_response: styles.statusWaitingResponse,
  resolved: styles.statusResolved,
  closed: styles.statusClosed,
};

const PRIORITY_CLASS_MAP = {
  low: styles.priorityLow,
  medium: styles.priorityMedium,
  high: styles.priorityHigh,
};

export default function TicketTableContent({
  t, tableData, canUpdate, canDelete, filters, data,
  handlePageChange, handleExport, handleDelete, handleStatusChange,
  handleMarkUrgent, handleAssignClick, handleResponseClick, handleViewResolutionClick,
}) {
  const { t: tHook } = useTranslation("adminTickets");
  const i18nT = t || tHook;

  const handleStatusBadgeClick = useCallback((row, value) => {
    if (!canUpdate) return;
    const newStatus = value === "open" ? "in_progress" : value === "in_progress" ? "resolved" : "open";
    handleStatusChange(row.id, newStatus);
  }, [canUpdate, handleStatusChange]);

  const getRowActions = useCallback((row) => {
    const actions = [];
    if (row.status === "resolved") {
      actions.push({ type: "dropdown", icon: <FiEye size={16} />, text: i18nT("actions.viewResolution"), onClick: () => handleViewResolutionClick(row) });
    }
    if (canUpdate) {
      actions.push({ type: "dropdown", icon: <FiUserPlus size={16} />, text: i18nT("actions.assign"), onClick: () => handleAssignClick(row) });
      if (row.status !== "resolved") {
        actions.push({ type: "dropdown", icon: <FiCheckSquare size={16} />, text: i18nT("actions.resolve"), onClick: () => handleResponseClick(row) });
      }
      if (row.priority !== "high") {
        actions.push({ type: "dropdown", icon: <FiAlertTriangle size={16} />, text: i18nT("actions.markUrgent"), onClick: () => handleMarkUrgent(row.id) });
      }
    }
    if (canDelete) {
      actions.push({ type: "dropdown", icon: <FiTrash2 size={16} />, text: i18nT("actions.delete"), onClick: () => handleDelete(row.id) });
    }
    return actions;
  }, [canUpdate, canDelete, i18nT, handleViewResolutionClick, handleAssignClick, handleResponseClick, handleMarkUrgent, handleDelete]);

  const bulkActions = useMemo(() => {
    const actions = [];
    if (canUpdate) {
      actions.push({
        icon: <FiCheckSquare size={16} />,
        text: i18nT("bulkActions.resolve"),
        onClick: async (ids) => {
          if (!ids?.length) { toastUtils.warning(i18nT("messages.selectRows", "Please select rows")); return; }
          for (const id of ids) { await handleStatusChange(id, "resolved"); }
        },
      });
    }
    if (canDelete) {
      actions.push({
        icon: <FiTrash2 size={16} />,
        text: i18nT("bulkActions.delete"),
        onClick: async (ids) => {
          if (!ids?.length) { toastUtils.warning(i18nT("messages.selectRows", "Please select rows")); return; }
          if (!confirm(i18nT("messages.confirmBulkDelete"))) return;
          try {
            for (const id of ids) { await handleDelete(id); }
            toastUtils.success(i18nT("messages.bulkDeleteSuccess"));
          } catch (err) {
            handleError(err, i18nT, { fallbackMessage: "messages.bulkDeleteError" });
          }
        },
      });
    }
    return actions;
  }, [canUpdate, canDelete, i18nT, handleStatusChange, handleDelete]);

  const renderCell = useCallback((key, value, row) => {
    if (key === "status") {
      const colorClass = STATUS_CLASS_MAP[value] || styles.statusOpen;
      return (
        <div className={`${styles.statusBadge} ${colorClass} ${canUpdate ? styles.clickableIf : ""}`} onClick={() => handleStatusBadgeClick(row, value)}>
          <span>{i18nT(`status.${value}`, value)}</span>
        </div>
      );
    }
    if (key === "priority") {
      const colorClass = PRIORITY_CLASS_MAP[value] || styles.priorityMedium;
      return (
        <div className={`${styles.priorityBadge} ${colorClass}`}>
          <span>{i18nT(`priority.${value}`, value)}</span>
        </div>
      );
    }
    if (key === "subject") {
      return <span className={styles.clickable} onClick={() => handleResponseClick(row)}>{value}</span>;
    }
    if (key === "assignedTo") {
      return value ? <span>{value}</span> : (
        canUpdate ? <span className={styles.assignClickable} onClick={() => handleAssignClick(row)}>{i18nT("actions.assign")}</span> : <span>-</span>
      );
    }
    if (key === "createdAt" && value) return new Date(value).toLocaleDateString();
    return value;
  }, [canUpdate, i18nT, handleStatusBadgeClick, handleResponseClick, handleAssignClick]);

  return (
    <Table
      title={i18nT("table.title")}
      headers={[
        i18nT("table.columns.ticketType"),
        i18nT("table.columns.submittedBy"),
        i18nT("table.columns.priority"),
        i18nT("table.columns.status"),
        i18nT("table.columns.assignedTo"),
        i18nT("table.columns.createdAt"),
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
        { label: i18nT("dateRange.all"), value: "" },
        { label: i18nT("status.open"), value: "open" },
        { label: i18nT("status.inProgress"), value: "in_progress" },
        { label: i18nT("status.waitingResponse"), value: "waiting_response" },
        { label: i18nT("status.resolved"), value: "resolved" },
        { label: i18nT("status.closed"), value: "closed" },
      ]}
      pagination={{
        currentPage: parseInt(filters.page),
        totalPages: data?.pagination?.pages || data?.pagination?.totalPages || 1,
        totalItems: data?.pagination?.total || 0,
        onPageChange: handlePageChange,
      }}
    />
  );
}
