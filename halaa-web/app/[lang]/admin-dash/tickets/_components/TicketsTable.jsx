"use client";

import { useMemo, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useMyTickets, useTicketMutation, useExportTickets } from "@/hooks/tickets";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import { normalizeTicketsFilters } from "@/utils/filterNormalizer";
import Table from "@/ui/commen/new-table/Table";
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

  const filters = useMemo(() => normalizeTicketsFilters(searchParams, { limit: 10 }), [searchParams]);

  const { data, isLoading, error } = useMyTickets(filters);
  const deleteMutation = useTicketMutation("deleteTicket");
  const statusMutation = useTicketMutation("updateStatus");
  const bulkDeleteMutation = useTicketMutation("bulkDelete");
  const bulkStatusMutation = useTicketMutation("bulkStatus");
  const exportMutation = useExportTickets();

  const handleDelete = useCallback(async (ticketId) => {
    if (!confirm(t("messages.confirmDelete"))) return;
    try {
      await deleteMutation.mutateAsync(ticketId);
      toastUtils.success(t("messages.deleteSuccess"));
    } catch (err) {
      handleError(err, t, { fallbackMessage: "messages.deleteError" });
    }
  }, [deleteMutation, t]);

  const handleBulkDelete = useCallback(async (ids) => {
    if (!ids?.length) {
      toastUtils.warning(t("messages.selectRows", "Please select rows"));
      return;
    }
    if (!confirm(t("messages.confirmBulkDelete"))) return;
    try {
      const result = await bulkDeleteMutation.mutateAsync(ids);
      if (result?.failed?.length > 0 && result?.succeeded?.length > 0) {
        toastUtils.info(
          t("messages.bulkPartialSuccess", `${result.succeeded.length} succeeded, ${result.failed.length} failed`)
        );
      } else if (result?.failed?.length > 0) {
        toastUtils.error(result.failed[0]?.error || t("messages.bulkDeleteError"));
      } else {
        toastUtils.success(t("messages.bulkDeleteSuccess"));
      }
    } catch (err) {
      handleError(err, t, { fallbackMessage: "messages.bulkDeleteError" });
    }
  }, [bulkDeleteMutation, t]);

  const handleBulkResolve = useCallback(async (ids) => {
    if (!ids?.length) {
      toastUtils.warning(t("messages.selectRows", "Please select rows"));
      return;
    }
    try {
      const result = await bulkStatusMutation.mutateAsync({ ids, status: "resolved" });
      if (result?.failed?.length > 0 && result?.succeeded?.length > 0) {
        toastUtils.info(
          t("messages.bulkPartialSuccess", `${result.succeeded.length} succeeded, ${result.failed.length} failed`)
        );
      } else if (result?.failed?.length > 0) {
        toastUtils.error(result.failed[0]?.error || t("messages.updateError"));
      } else {
        toastUtils.success(t("messages.statusUpdateSuccess", "Status updated successfully"));
      }
    } catch (err) {
      handleError(err, t, { fallbackMessage: "messages.updateError" });
    }
  }, [bulkStatusMutation, t]);

  const handleStatusChange = useCallback(async (ticketId, newStatus) => {
    try {
      await statusMutation.mutateAsync({ ticketId, status: newStatus });
      toastUtils.success(t("messages.statusUpdateSuccess", "Status updated successfully"));
    } catch (err) {
      handleError(err, t, { fallbackMessage: "messages.updateError" });
    }
  }, [statusMutation, t]);

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
      await exportMutation.mutateAsync({
        search: filters.search, status: filters.status,
        priority: filters.priority, from: filters.from, to: filters.to,
      });
    } catch (err) {
      handleError(err, t, { fallbackMessage: "messages.updateError" });
    }
  }, [exportMutation, filters, t]);

  const handlePageChange = useCallback((page) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleSearchChange = useCallback((query) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set("search", query);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleFilterChange = useCallback((statusValue) => {
    const params = new URLSearchParams(searchParams.toString());
    if (statusValue) {
      params.set("status", statusValue);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const tableData = useMemo(() => (data?.data || []).map((ticket) => ({
    id: ticket.id || ticket._id,
    subject: ticket.subject || ticket.type || "-",
    user: ticket.user?.name || ticket.user?.email || "-",
    priority: ticket.priority || "medium",
    status: ticket.status || "open",
    assignedTo: ticket.assignedTo?.name || "",
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
          handleSearchChange={handleSearchChange}
          handleFilterChange={handleFilterChange}
          handleExport={handleExport}
          handleDelete={handleDelete}
          handleBulkDelete={handleBulkDelete}
          handleBulkResolve={handleBulkResolve}
          handleStatusChange={handleStatusChange}
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
