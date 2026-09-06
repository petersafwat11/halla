"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import DeleteConfirmation from "@/ui/vendor/modals/DeleteConfirmation";
import SendActionPopup from "../sendActions/SendActionPopup";
import { toast } from "react-toastify";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useEvent } from "@/hooks/events";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import AddGuestPopup from "@/ui/host/popups/addGuestPopup/AddGuestPopup";
import { useGuestMutation } from "@/hooks/guests";
import { useEventGuests } from "@/hooks/events/queries/useEventGuests";
import { useLocalizedDate } from "@/utils/date/useLocalizedDate";
import styles from "@/app/[lang]/host/events/[id]/singleEvent.module.css";
import peopleStyles from "./people.module.css";
import GuestRows from "./GuestRows";
import GuestPopups from "./GuestPopups";
import useGuestTableActions from "./useGuestTableActions";

const STATUS_FILTER_MAP = {
  confirmed: ["confirmed", "checked_in"],
  declined: ["declined"],
  noResponse: ["invited", "pending"],
  checkedIn: ["checked_in"],
};

export default function GuestTable({ eventId, statusFilter, onStatusFilterChange }) {
  const { t } = useTranslation("home-events");
  const { formatDate, formatDateTime } = useLocalizedDate();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const page = Math.max(1, Number(searchParams.get("guestPage")) || 1);
  const search = searchParams.get("guestSearch") || "";
  const setQuery = (values) => {
    const query = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value) query.set(key, String(value)); else query.delete(key);
    }
    router.replace(pathname + "?" + query.toString(), { scroll: false });
  };
  const { data: guestsData, isPending, error, refetch } = useEventGuests(eventId, {
    params: { page, limit: 50, search, status: STATUS_FILTER_MAP[statusFilter]?.join(","), deliveryStatus: statusFilter === "failedDelivery" ? "failed" : undefined },
  });
  const { data: eventData } = useEvent(eventId);
  const event = eventData?.data?.event || eventData?.event;
  const caps = event?.capabilities || {};
  const [showAddPopup, setShowAddPopup] = useState(false);
  const addGuestMutation = useGuestMutation("add");
  const bulkMutation = useGuestMutation("bulk");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionVersion, setSelectionVersion] = useState(0);
  const [bulkAction, setBulkAction] = useState(null);
  const [category, setCategory] = useState("");
  const [bulkKey, setBulkKey] = useState(null);
  useEffect(() => { setSelectedIds([]); setBulkAction(null); }, [page, search, statusFilter]);
  const openBulk = (action) => { setBulkKey(crypto.randomUUID()); setBulkAction(action); };
  const performBulk = async () => {
    try {
      const result = await bulkMutation.mutateAsync({ eventId,
        data: { action: bulkAction, category, guestIds: selectedIds }, idempotencyKey: bulkKey });
      const summary = result?.data || result;
      toast.success(t("people.bulkResult", summary));
      setSelectedIds(summary.failedIds || []);
      setBulkAction(null);
      setSelectionVersion(value => value + 1);
    } catch (error) { toast.error(error?.message || t("people.retry")); }
  };
  const deleteGuestMutation = useGuestMutation("delete");
  const updateGuestMutation = useGuestMutation("update");
  const rotateGuestMutation = useGuestMutation("rotateQr");
  const revokeAccessMutation = useGuestMutation("revokeAccess");

  const guests = guestsData?.data || [];

  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, guest: null });

  const actions = useGuestTableActions({
    t,
    eventId,
    deleteGuestMutation,
    updateGuestMutation,
    rotateGuestMutation,
    revokeAccessMutation,
    deleteModal,
    setDeleteModal,
    setShowEditPopup,
    setEditingGuest,
  });

  return (
    <>
      <DeleteConfirmation isOpen={bulkAction === "remove"} onClose={() => setBulkAction(null)}
        onConfirm={performBulk} isLoading={bulkMutation.isPending}
        title={t("people.remove")} message={t("people.confirmRemove", { count: selectedIds.length })}
        confirmText={t("people.remove")} cancelText={t("people.cancel")} />
      <PopupWrapper isOpen={bulkAction === "category"} onClose={() => setBulkAction(null)}>
        <form className={peopleStyles.bulkForm} onSubmit={(e) => { e.preventDefault(); performBulk(); }}>
          <label htmlFor="bulk-category">{t("people.category")}</label>
          <input id="bulk-category" value={category} maxLength={60} onChange={(e) => { setCategory(e.target.value); setBulkKey(crypto.randomUUID()); }} />
          <p>{t("people.selected", { count: selectedIds.length })}</p>
          <button type="submit" disabled={bulkMutation.isPending}>{t("people.save")}</button>
        </form>
      </PopupWrapper>
      <SendActionPopup isOpen={bulkAction === "resend"} action="resend" eventId={eventId}
        guests={guests.filter(guest => selectedIds.includes(guest.id))}
        invitationBalance={event?.invitationBalance} invitesRemaining={event?.invitationBalance?.remaining}
        onClose={() => setBulkAction(null)} />
      <PopupWrapper isOpen={showAddPopup} onClose={() => setShowAddPopup(false)}>
        <AddGuestPopup eventId={eventId} onCancel={() => setShowAddPopup(false)}
          onConfirm={(data, idempotencyKey) => addGuestMutation.mutateAsync({ eventId, data, idempotencyKey })} />
      </PopupWrapper>
      <div className={styles.rightCol}>
        {caps.canAddGuest && <button className={peopleStyles.addButton} type="button" onClick={() => setShowAddPopup(true)}>{t("singleEvent.addGuest.title")}</button>}
        {selectedIds.length > 0 && <div className={peopleStyles.toolbar} role="toolbar" aria-label={t("people.selected", { count: selectedIds.length })}>
          <button type="button" onClick={() => { setSelectedIds([]); setSelectionVersion(value => value + 1); }}>{t("people.clear")}</button>
          <span aria-live="polite">{t("people.selected", { count: selectedIds.length })}</span>
          {caps.canEditGuest && <button type="button" onClick={() => openBulk("category")}>{t("people.category")}</button>}
          {caps.canDeleteGuest && <button type="button" onClick={() => openBulk("remove")}>{t("people.remove")}</button>}
          {caps.canSendLiveMessages && <button type="button" onClick={() => openBulk("resend")}>{t("singleEvent.sendActions.items.resend")}</button>}
        </div>}
        {error && <button type="button" onClick={() => refetch()}>{t("people.retry")}</button>}
        <GuestRows
          key={page + search + statusFilter + selectionVersion}
          guests={guests}
          onSelectionChange={setSelectedIds}
          searchValue={search}
          onSearchChange={(value) => setQuery({ guestSearch: value, guestPage: 1 })}
          pagination={{ currentPage: page, totalPages: guestsData?.pagination?.pages || 1,
            totalItems: guestsData?.pagination?.total || 0, itemsPerPage: 50,
            onPageChange: (value) => setQuery({ guestPage: value }) }}
          emptyMessage={isPending ? t("people.loading") : undefined}
          t={t}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
          statusFilter={statusFilter}
          onStatusFilterChange={(value) => { setQuery({ guestPage: 1 }); onStatusFilterChange?.(value); }}
          onEditGuest={caps.canEditGuest ? actions.handleEditGuest : null}
          onDeleteGuest={caps.canDeleteGuest ? actions.handleDeleteGuest : null}
          onRotateQr={caps.canManageGuestAccess ? actions.handleRotateQr : null}
          onRevokeAccess={caps.canManageGuestAccess ? actions.handleRevokeAccess : null}
          onExportGuests={actions.handleExportGuests}
        />
      </div>

      <GuestPopups
        eventId={eventId}
        showEditPopup={showEditPopup}
        editingGuest={editingGuest}
        deleteModal={deleteModal}
        isDeleting={deleteGuestMutation.isPending}
        onCloseEditPopup={actions.handleCloseEditPopup}
        onUpdateGuest={actions.handleUpdateGuest}
        onCloseDeleteModal={actions.handleCloseDeleteModal}
        onConfirmDelete={actions.handleConfirmDelete}
        t={t}
      />
    </>
  );
}
