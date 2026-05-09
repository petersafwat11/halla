"use client";
import React, { useState, useMemo } from "react";
import styles from "@/app/[lang]/host/tickets/page.module.css";
import TicketsHeader from "@/app/[lang]/host/tickets/_components/TicketsHeader";
import TicketCard from "@/app/[lang]/host/tickets/_components/TicketCard";
import SendTicketPopup from "@/app/[lang]/host/tickets/_components/SendTicketPopup";
import EmptyState from "@/app/[lang]/host/tickets/_components/EmptyState";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useMyTickets, useTicketMutation } from "@/hooks/reactQueryHooks/useTickets";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

const VendorTicketsPage = () => {
  const { t } = useTranslation("tickets");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error, refetch } = useMyTickets();
  const deleteMutation = useTicketMutation("deleteTicket");

  const tickets = data?.data || [];

  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;

    const query = searchQuery.toLowerCase();
    return tickets.filter((ticket) => {
      const typeLabel = t(`types.${ticket.type}`) || ticket.type;
      const statusLabel = t(`status.${ticket.status}`) || ticket.status;

      return (
        ticket.message.toLowerCase().includes(query) ||
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

  const handleDeleteTicket = async (ticketId) => {
    if (
      !confirm(t("actions.deleteConfirm") || "هل أنت متأكد من حذف هذه الشكوى؟")
    ) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(ticketId);
      toast.success(t("messages.deleteSuccess") || "تم حذف الشكوى بنجاح");
    } catch (error) {
      toast.error(t("messages.deleteError") || "فشل في حذف الشكوى");
    }
  };

  const handlePopupSuccess = () => {
    refetch();
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setEditingTicket(null);
  };

  return (
    <ErrorBoundary fallbackMessage={t("errors.boundary", "Failed to load tickets")}>
      <div className={styles.page}>
        <TicketsHeader
          onCreateTicket={handleCreateTicket}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          t={t}
        />
        <div className={styles.ticketsContainer}>
          {isLoading ? (
            <SimpleLoading />
          ) : error ? (
            <div className={styles.noResults}>
              <p>{t("errors.loadFailed", "Failed to load tickets")}</p>
              <button onClick={() => refetch()}>{t("actions.retry", "Retry")}</button>
            </div>
          ) : tickets.length === 0 ? (
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
                  onDelete={handleDeleteTicket}
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
      </div>
    </ErrorBoundary>
  );
};

export default VendorTicketsPage;
