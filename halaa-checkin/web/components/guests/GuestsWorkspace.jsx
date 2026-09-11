'use client';

import React, { useState } from 'react';
import { useEvent } from '../../hooks/useEvent.jsx';
import { useSession } from '../../hooks/useSession.jsx';
import { useStats } from '../../hooks/useStats.js';
import { useGuests } from '../../hooks/useGuests.js';
import { useEventSettings } from '../../hooks/useEventSettings.js';
import { useAdmissionCorrection } from '../../hooks/useExports.js';
import { EventHeaderBar } from './EventHeaderBar.jsx';
import { StatsStrip } from './StatsStrip.jsx';
import { GuestTable } from './GuestTable.jsx';
import { EventDialog } from './EventDialog.jsx';
import { EventLifecycleDialog } from './EventLifecycleDialog.jsx';
import { GuestForm } from './GuestForm.jsx';
import { GuestDeleteDialog } from './GuestDeleteDialog.jsx';
import { QrPreviewDialog } from './QrPreviewDialog.jsx';
import { ImportDialog } from './ImportDialog.jsx';
import { ExportPanel } from './ExportPanel.jsx';
import { AdmissionCorrectionDialog } from './AdmissionCorrectionDialog.jsx';
import { Button } from '../ui/Button.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { getDictionary, t } from '../../lib/locale.js';
import styles from './GuestsWorkspace.module.css';

/**
 * Main Guests Workspace Component.
 * Integrates event header, lifecycle transitions, live statistics strip,
 * and paginated/searchable guest table with all CRUD and import dialogs.
 */
export function GuestsWorkspace({ lang = 'ar' }) {
  const dict = getDictionary(lang);
  const { role } = useSession();
  const isAdmin = role === 'admin';

  const {
    events,
    selectedEvent,
    selectedEventId,
    selectEvent,
    refetchEvents,
    hasEvents,
    isLoadingEvents,
  } = useEvent();

  const activeEventRef = React.useRef(selectedEventId);
  activeEventRef.current = selectedEventId;

  // Stats query (error is surfaced, never rendered as zeros)
  const { stats, isFetching: isFetchingStats, error: statsError, refetch: refetchStats } = useStats(selectedEventId);

  // Table pagination and filters state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Reset table state when the event changes (spec: clear selections/search/dialogs)
  React.useEffect(() => {
    setPage(1);
    setSearch('');
    setStatusFilter('all');
    setExportPanel({ isOpen: false, singleGuest: null });
    setQrDialog({ isOpen: false, guest: null });
    setGuestFormDialog({ isOpen: false, guest: null });
    setGuestDeleteDialog({ isOpen: false, guest: null });
    setCorrectionDialog({ isOpen: false, guest: null, mode: 'correct' });
    setImportDialog({ isOpen: false });
    setEventDialog({ isOpen: false, mode: 'create' });
    setLifecycleDialog({ isOpen: false, targetStatus: 'live' });
  }, [selectedEventId]);

  // Guests query & CRUD mutations
  const {
    guests,
    meta,
    isLoading: isLoadingGuests,
    isFetching: isFetchingGuests,
    error: guestsError,
    refetch: refetchGuests,
    selectedGuestIds,
    selectedCount,
    toggleSelect,
    selectAllCurrentPage,
    clearSelection,
    createGuest,
    isCreating: isCreatingGuest,
    createError: guestCreateError,
    updateGuest,
    isUpdating: isUpdatingGuest,
    updateError: guestUpdateError,
    deleteGuest,
    isDeleting: isDeletingGuest,
    deleteError: guestDeleteError,
    resetMutations: resetGuestMutations,
  } = useGuests(selectedEventId, {
    page,
    pageSize: 25,
    search,
    status: statusFilter,
  });

  // Event settings & lifecycle mutations
  const {
    createEvent,
    isCreating: isCreatingEvent,
    createError: eventCreateError,
    updateEvent,
    isUpdating: isUpdatingEvent,
    updateError: eventUpdateError,
    updateEventStatus,
    isUpdatingStatus,
    statusError: eventStatusError,
  } = useEventSettings();

  // Export jobs are owned by ExportPanel's useExports instance (F24: single owner,
  // no duplicate unused hook). Admission correction stays here.

  const {
    correctAdmission,
    isCorrecting,
    correctError,
    resetAdmission,
    isResetting,
    resetError,
    resetCorrectionErrors,
  } = useAdmissionCorrection(selectedEventId);

  // Dialog states
  const [eventDialog, setEventDialog] = useState({ isOpen: false, mode: 'create' });
  const [lifecycleDialog, setLifecycleDialog] = useState({ isOpen: false, targetStatus: 'live' });
  const [guestFormDialog, setGuestFormDialog] = useState({ isOpen: false, guest: null });
  const [guestDeleteDialog, setGuestDeleteDialog] = useState({ isOpen: false, guest: null });
  const [qrDialog, setQrDialog] = useState({ isOpen: false, guest: null });
  const [importDialog, setImportDialog] = useState({ isOpen: false });
  const [exportPanel, setExportPanel] = useState({ isOpen: false, singleGuest: null });
  const [correctionDialog, setCorrectionDialog] = useState({ isOpen: false, guest: null, mode: 'correct' });

  // F17: explicit conflict reload — fetch current record, replace dialog
  // version, reset mutation errors, keep dialogs bound to originating event.
  const handleReloadGuestIntoDialog = async (guestId, target = 'form') => {
    const capturedEventId = selectedEventId;
    try {
      const { api } = await import('../../lib/api.js');
      const res = await api.get(`/events/${capturedEventId}/guests/${guestId}`);
      if (capturedEventId !== activeEventRef.current) return null;
      const fresh = res?.data || null;
      if (!fresh) return null;
      resetGuestMutations?.();
      resetCorrectionErrors?.();
      await refetchGuests();
      await refetchStats();
      if (capturedEventId !== activeEventRef.current) return null;
      if (target === 'correction') {
        setCorrectionDialog((prev) => ({ ...prev, guest: fresh }));
      } else {
        setGuestFormDialog((prev) => ({ ...prev, guest: fresh }));
      }
      return fresh;
    } catch {
      await refetchGuests();
      return null;
    }
  };

  const openGuestForm = (guest) => {
    resetGuestMutations?.();
    setGuestFormDialog({ isOpen: true, guest });
  };

  const openCorrection = (guest, mode) => {
    resetCorrectionErrors?.();
    setCorrectionDialog({ isOpen: true, guest, mode });
  };

  // Event handlers
  const handleCreateEvent = async (payload) => {
    const originEventId = activeEventRef.current;
    const res = await createEvent(payload);
    if (originEventId !== activeEventRef.current) return;
    setEventDialog({ isOpen: false, mode: 'create' });
    if (res?.data?.id) {
      selectEvent(res.data.id);
    }
  };

  const handleUpdateEvent = async ({ eventId, payload }) => {
    const originEventId = activeEventRef.current;
    await updateEvent({ eventId, payload });
    if (originEventId !== activeEventRef.current) return;
    setEventDialog({ isOpen: false, mode: 'edit' });
  };

  const handleStatusTransition = async ({ eventId, payload }) => {
    const originEventId = activeEventRef.current;
    await updateEventStatus({ eventId, payload });
    if (originEventId !== activeEventRef.current) return;
    setLifecycleDialog({ isOpen: false, targetStatus: 'live' });
  };

  const handleSaveGuest = async (payloadOrParams) => {
    const originEventId = activeEventRef.current;
    if (guestFormDialog.guest) {
      await updateGuest(payloadOrParams);
    } else {
      await createGuest(payloadOrParams);
    }
    if (originEventId !== activeEventRef.current) return;
    setGuestFormDialog({ isOpen: false, guest: null });
  };

  const handleDeleteGuest = async ({ guestId, version }) => {
    const originEventId = activeEventRef.current;
    await deleteGuest({ guestId, version });
    if (originEventId !== activeEventRef.current) return;
    setGuestDeleteDialog({ isOpen: false, guest: null });
  };

  const handleImportSuccess = () => {
    refetchGuests();
    refetchStats();
  };

  const handleExportOpen = (singleGuest = null) => {
    // Guard against React synthetic events being passed as the guest
    const safeGuest = singleGuest && typeof singleGuest === 'object' && singleGuest.id ? singleGuest : null;
    setExportPanel({ isOpen: true, singleGuest: safeGuest });
  };

  const handleExportSinglePdf = (guest) => {
    setQrDialog({ isOpen: false, guest: null });
    setExportPanel({ isOpen: true, singleGuest: guest });
  };

  const handleExportClose = () => {
    setExportPanel({ isOpen: false, singleGuest: null });
  };

  const handleCorrectionOpen = (guest, mode) => {
    setCorrectionDialog({ isOpen: true, guest, mode });
  };

  const handleCorrectionClose = () => {
    setCorrectionDialog({ isOpen: false, guest: null, mode: 'correct' });
  };

  const handleCorrectionSubmit = async ({ guestId, payload }) => {
    const originEventId = activeEventRef.current;
    if (correctionDialog.mode === 'correct') {
      await correctAdmission({ guestId, payload });
    } else {
      await resetAdmission({ guestId, payload });
    }
    if (originEventId !== activeEventRef.current) return;
    handleCorrectionClose();
  };

  const isClosed = selectedEvent?.status === 'closed';

  if (!hasEvents && !isLoadingEvents) {
    return (
      <div className={styles.workspace}>
        <EmptyState
          icon="calendar"
          title={t(dict, 'events.noEventsAdmin')}
          description={t(dict, 'events.createFirstEventPrompt')}
          action={
            <Button
              variant="primary"
              leadingIcon="plus"
              onClick={() => setEventDialog({ isOpen: true, mode: 'create' })}
              data-testid="create-first-event-btn"
            >
              {t(dict, 'events.createFirstEvent')}
            </Button>
          }
        />

        <EventDialog
          isOpen={eventDialog.isOpen}
          mode={eventDialog.mode}
          onClose={() => setEventDialog({ isOpen: false, mode: 'create' })}
          onSubmit={handleCreateEvent}
          isPending={isCreatingEvent}
          apiError={eventCreateError}
          lang={lang}
        />
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      {/* Event Header with Status, Venue, and Action Buttons */}
      <EventHeaderBar
        event={selectedEvent}
        lang={lang}
        isAdmin={isAdmin}
        onCreateEvent={() => setEventDialog({ isOpen: true, mode: 'create' })}
        onOpenSettings={() => setEventDialog({ isOpen: true, mode: 'edit' })}
        onOpenLifecycle={(targetStatus) =>
          setLifecycleDialog({ isOpen: true, targetStatus })
        }
      />

      {/* Live Polling Statistics Strip (event-wide, independent of filters) */}
      <StatsStrip
        stats={stats}
        isFetching={isFetchingStats}
        statsError={statsError}
        onRetry={() => refetchStats()}
        eventStatus={selectedEvent?.status}
        lang={lang}
      />

      {/* Paginated and Searchable Guests Table */}
      <GuestTable
        guests={guests}
        meta={meta}
        isLoading={isLoadingGuests}
        isFetching={isFetchingGuests}
        loadError={guestsError}
        onRetry={() => refetchGuests()}
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => {
          setStatusFilter(val);
          setPage(1);
        }}
        onPageChange={(newPage) => setPage(newPage)}
        selectedGuestIds={selectedGuestIds}
        selectedCount={selectedCount}
        toggleSelect={toggleSelect}
        selectAllCurrentPage={selectAllCurrentPage}
        clearSelection={clearSelection}
        isClosed={isClosed}
        lang={lang}
        onAddGuest={() => openGuestForm(null)}
        onImportCsv={() => setImportDialog({ isOpen: true })}
        onExportCsv={handleExportOpen}
        onViewQr={(guest) => setQrDialog({ isOpen: true, guest })}
        onEditGuest={(guest) => openGuestForm(guest)}
        onDeleteGuest={(guest) => setGuestDeleteDialog({ isOpen: true, guest })}
        onCorrectAdmission={(guest) => openCorrection(guest, 'correct')}
        onResetAdmission={(guest) => openCorrection(guest, 'reset')}
      />

      {/* Modals */}
      {/* 1. Event Settings / Create Modal */}
      <EventDialog
        isOpen={eventDialog.isOpen}
        mode={eventDialog.mode}
        event={selectedEvent}
        onClose={() => setEventDialog({ isOpen: false, mode: 'edit' })}
        onSubmit={eventDialog.mode === 'create' ? handleCreateEvent : handleUpdateEvent}
        isPending={eventDialog.mode === 'create' ? isCreatingEvent : isUpdatingEvent}
        apiError={eventDialog.mode === 'create' ? eventCreateError : eventUpdateError}
        lang={lang}
      />

      {/* 2. Event Lifecycle Modal (Close or Reopen) */}
      <EventLifecycleDialog
        isOpen={lifecycleDialog.isOpen}
        event={selectedEvent}
        stats={stats}
        targetStatus={lifecycleDialog.targetStatus}
        onClose={() => setLifecycleDialog({ isOpen: false, targetStatus: 'live' })}
        onSubmit={handleStatusTransition}
        isPending={isUpdatingStatus}
        apiError={eventStatusError}
        lang={lang}
      />

      {/* 3. Guest Form Modal (Add / Edit) */}
      <GuestForm
        isOpen={guestFormDialog.isOpen}
        guest={guestFormDialog.guest}
        onClose={() => setGuestFormDialog({ isOpen: false, guest: null })}
        onSubmit={handleSaveGuest}
        isPending={guestFormDialog.guest ? isUpdatingGuest : isCreatingGuest}
        apiError={guestFormDialog.guest ? guestUpdateError : guestCreateError}
        onReload={() => guestFormDialog.guest && handleReloadGuestIntoDialog(guestFormDialog.guest.id, 'form')}
        isClosed={isClosed}
        lang={lang}
      />

      {/* 4. Guest Soft Delete Confirmation Modal */}
      <GuestDeleteDialog
        isOpen={guestDeleteDialog.isOpen}
        guest={guestDeleteDialog.guest}
        onClose={() => setGuestDeleteDialog({ isOpen: false, guest: null })}
        onConfirm={handleDeleteGuest}
        isPending={isDeletingGuest}
        apiError={guestDeleteError}
        isClosed={isClosed}
        lang={lang}
      />

      {/* 5. QR Preview Modal (with single-PDF export entry) */}
      <QrPreviewDialog
        isOpen={qrDialog.isOpen}
        guest={qrDialog.guest}
        eventId={selectedEventId}
        event={selectedEvent}
        onClose={() => setQrDialog({ isOpen: false, guest: null })}
        onExportPdf={handleExportSinglePdf}
        lang={lang}
      />

      {/* 6. Import CSV Modal */}
      <ImportDialog
        isOpen={importDialog.isOpen}
        eventId={selectedEventId}
        onClose={() => setImportDialog({ isOpen: false })}
        onSuccess={handleImportSuccess}
        lang={lang}
      />

      {/* 7. Export Panel Modal (all = event total, not current page) */}
      <ExportPanel
        isOpen={exportPanel.isOpen}
        onClose={handleExportClose}
        eventId={selectedEventId}
        event={selectedEvent}
        selectedGuestIds={selectedGuestIds}
        guests={guests}
        eventTotal={stats?.totalInvitations ?? meta?.total ?? 0}
        singleGuest={exportPanel.singleGuest}
        lang={lang}
      />

      {/* 8. Admission Correction/Reset Modal */}
      <AdmissionCorrectionDialog
        isOpen={correctionDialog.isOpen}
        onClose={handleCorrectionClose}
        guest={correctionDialog.guest}
        mode={correctionDialog.mode}
        onSubmit={handleCorrectionSubmit}
        isPending={correctionDialog.mode === 'correct' ? isCorrecting : isResetting}
        apiError={correctionDialog.mode === 'correct' ? correctError : resetError}
        onReload={() => correctionDialog.guest && handleReloadGuestIntoDialog(correctionDialog.guest.id, 'correction')}
        lang={lang}
      />
    </div>
  );
}
