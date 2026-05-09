"use client";
import React, { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import styles from "./page.module.css";
import TicketsHeader from "./_components/TicketsHeader";
import TicketCard from "./_components/TicketCard";
import SendTicketPopup from "./_components/SendTicketPopup";
import EmptyState from "./_components/EmptyState";
import { useMyTickets, useTicketMutation } from "@/hooks/reactQueryHooks/useTickets";
import DeleteConfirmation from "@/ui/vendor/modals/DeleteConfirmation";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

const TicketsPage = () => {
  const { t } = useTranslation("tickets");
  const queryClient = useQueryClient();

  // React Query hooks
  const { data: ticketsData, isLoading, error } = useMyTickets();
  const deleteTicketMutation = useTicketMutation("deleteTicket");

  // Local UI state
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    ticketId: null,
  });

  // Extract tickets from response
  const tickets = useMemo(() => {
    return ticketsData?.data || [];
  }, [ticketsData]);

  // Filter tickets based on search query
  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;

    const query = searchQuery.toLowerCase();
    return tickets.filter((ticket) => {
      const typeLabel = t(`types.${ticket.type}`) || ticket.type;
      const statusLabel = t(`status.${ticket.status}`) || ticket.status;

      return (
        ticket.message?.toLowerCase().includes(query) ||
        typeLabel.toLowerCase().includes(query) ||
        statusLabel.toLowerCase().includes(query)
      );
    });
  }, [tickets, searchQuery, t]);

  const handleCreateTicket = () => {
    setEditingTicket(null);
    setIsPopupOpen(true);
  };

  const handleEditTicket = (ticket) => {
    setEditingTicket(ticket);
    setIsPopupOpen(true);
  };

  const handleDeleteClick = (ticketId) => {
    setDeleteModal({ isOpen: true, ticketId });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.ticketId) return;

    // Optimistic update
    const previousTickets = queryClient.getQueryData(["tickets", "my-tickets", {}]);

    queryClient.setQueryData(["tickets", "my-tickets", {}], (old) => {
      if (!old) return old;
      const oldData = old?.data || old;
      return {
        ...old,
        data: oldData.filter((t) => t.id !== deleteModal.ticketId),
      };
    });

    try {
      await deleteTicketMutation.mutateAsync(deleteModal.ticketId);
      toast.success(t("messages.deleteSuccess"));
    } catch (error) {
      // Rollback on error
      queryClient.setQueryData(["tickets", "my-tickets", {}], previousTickets);
      console.error("Error deleting ticket:", error);
      toast.error(t("messages.deleteError"));
    } finally {
      setDeleteModal({ isOpen: false, ticketId: null });
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteModal({ isOpen: false, ticketId: null });
  };

  const handlePopupSuccess = () => {
    // Popup component handles its own mutation and cache invalidation
    // Data will auto-refresh via React Query
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setEditingTicket(null);
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <TicketsHeader
          onCreateTicket={handleCreateTicket}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          t={t}
        />
        <SimpleLoading message={t("loading")} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <ErrorBoundary
          onRetry={() => queryClient.invalidateQueries({ queryKey: ["tickets"] })}
          fallbackMessage={t("errors.loadFailed") || "Failed to load tickets"}
        >
          <div />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <TicketsHeader
        onCreateTicket={handleCreateTicket}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        t={t}
      />
      <div className={styles.ticketsContainer}>
        {tickets.length === 0 ? (
          <EmptyState onCreateTicket={handleCreateTicket} t={t} />
        ) : filteredTickets.length === 0 ? (
          <div className={styles.noResults}>
            <p>{t("search.noResults", "No results found")} &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          <div className={styles.ticketsList}>
            {filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onDelete={handleDeleteClick}
                onEdit={handleEditTicket}
              />
            ))}
          </div>
        )}
      </div>

      <SendTicketPopup
        isOpen={isPopupOpen}
        onClose={handleClosePopup}
        onSuccess={handlePopupSuccess}
        editTicket={editingTicket}
        t={t}
      />

      <DeleteConfirmation
        isOpen={deleteModal.isOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title={t("actions.deleteTitle") || "Delete Ticket"}
        message={t("actions.deleteConfirm") || "Are you sure you want to delete this ticket?"}
        confirmText={t("actions.confirmDelete") || "Delete"}
        cancelText={t("actions.cancelDelete") || "Cancel"}
        isLoading={deleteTicketMutation.isPending}
      />
    </div>
  );
};

export default TicketsPage;
