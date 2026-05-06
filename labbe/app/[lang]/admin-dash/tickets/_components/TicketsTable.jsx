"use client";

import { useMemo, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useMyTickets, useTicketMutation } from "@/hooks/reactQueryHooks/useTickets";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import Table from "@/ui/commen/new-table/Table";
import { ticketsAPI } from "@/services/adminDashboard";
import AssignTicketPopup from "./AssignTicketPopup";
import TicketResponsePopup from "./TicketResponsePopup";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import TicketTableContent from "./TicketTableContent";
import styles from "./TicketsTable.module.css";

export default function TicketsTable() {
  const { t } = useTranslation("adminTickets");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canUpdate, canDelete } = usePageAccess("tickets");
  const [showAssignPopup, setShowAssignPopup] = useState(false);
  const [showResponsePopup, setShowResponsePopup] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);

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

  const handleAssignClick = useCallback((ticket) => {
    setSelectedTicket(ticket);
    setShowAssignPopup(true);
  }, []);

  const handleResponseClick = useCallback((ticket) => {
    setSelectedTicket(ticket);
    setViewOnly(false);
    setShowResponsePopup(true);
  }, []);

  const handleViewResolutionClick = useCallback((ticket) => {
    setSelectedTicket(ticket);
    setViewOnly(true);
    setShowResponsePopup(true);
  }, []);

  const handleExport = useCallback(async () => {
    try {
      await ticketsAPI.export({
        search: filters.search, status: filters.status,
        priority: filters.priority, from: filters.from, to: filters.to,
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

  if (isLoading) return <SimpleLoading />;

  if (error) {
    return (
      <div className={styles.errorState}>
        <p>{t("errors.loadFailed", "Failed to load tickets")}</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.container}>
        <TicketTableContent
          t={t}
          tableData={tableData}
          canUpdate={canUpdate}
          canDelete={canDelete}
          filters={filters}
          data={data}
          handlePageChange={handlePageChange}
          handleExport={handleExport}
          handleDelete={handleDelete}
          handleStatusChange={handleStatusChange}
          handleMarkUrgent={handleMarkUrgent}
          handleAssignClick={handleAssignClick}
          handleResponseClick={handleResponseClick}
          handleViewResolutionClick={handleViewResolutionClick}
        />
      </div>

      {showAssignPopup && selectedTicket && (
        <AssignTicketPopup
          ticket={selectedTicket}
          onClose={() => { setShowAssignPopup(false); setSelectedTicket(null); }}
        />
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
