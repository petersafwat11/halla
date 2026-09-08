'use client';

import React, { useState } from 'react';
import { useEvent } from '../../hooks/useEvent.jsx';
import { useStats } from '../../hooks/useStats.js';
import { useGuests } from '../../hooks/useGuests.js';
import { useEventSettings } from '../../hooks/useEventSettings.js';
import { EventHeaderBar } from './EventHeaderBar.jsx';
import { StatsStrip } from './StatsStrip.jsx';
import { GuestTable } from './GuestTable.jsx';
import { EventDialog } from './EventDialog.jsx';
import { EventLifecycleDialog } from './EventLifecycleDialog.jsx';
import { GuestForm } from './GuestForm.jsx';
import { GuestDeleteDialog } from './GuestDeleteDialog.jsx';
import { QrPreviewDialog } from './QrPreviewDialog.jsx';
import { ImportDialog } from './ImportDialog.jsx';
import { Button } from '../ui/Button.jsx';
import { getDictionary, t } from '../../lib/locale.js';
import styles from './GuestsWorkspace.module.css';

/**
 * Main Guests Workspace Component.
 * Integrates event header, lifecycle transitions, live statistics strip,
 * and paginated/searchable guest table with all CRUD and import dialogs.
 */
export function GuestsWorkspace({ lang = 'ar' }) {
  const dict = getDictionary(lang);

  const {
    events,
    selectedEvent,
    selectedEventId,
    selectEvent,
    refetchEvents,
    hasEvents,
    isLoadingEvents,
  } = useEvent();

  // Stats query
  const { stats, isFetching: isFetchingStats, refetch: refetchStats } = useStats(selectedEventId);

  // Table pagination and filters state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Guests query & CRUD mutations
  const {
    guests,
    meta,
    isLoading: isLoadingGuests,
    isFetching: isFetchingGuests,
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

  // Dialog states
  const [eventDialog, setEventDialog] = useState({ isOpen: false, mode: 'create' });
  const [lifecycleDialog, setLifecycleDialog] = useState({ isOpen: false, targetStatus: 'live' });
  const [guestFormDialog, setGuestFormDialog] = useState({ isOpen: false, guest: null });
  const [guestDeleteDialog, setGuestDeleteDialog] = useState({ isOpen: false, guest: null });
  const [qrDialog, setQrDialog] = useState({ isOpen: false, guest: null });
  const [importDialog, setImportDialog] = useState({ isOpen: false });

  // Event handlers
  const handleCreateEvent = async (payload) => {
    const res = await createEvent(payload);
    setEventDialog({ isOpen: false, mode: 'create' });
    if (res?.data?.id) {
      selectEvent(res.data.id);
    }
  };

  const handleUpdateEvent = async ({ eventId, payload }) => {
    await updateEvent({ eventId, payload });
    setEventDialog({ isOpen: false, mode: 'edit' });
  };

  const handleStatusTransition = async ({ eventId, payload }) => {
    await updateEventStatus({ eventId, payload });
    setLifecycleDialog({ isOpen: false, targetStatus: 'live' });
  };

  const handleSaveGuest = async (payloadOrParams) => {
    if (guestFormDialog.guest) {
      await updateGuest(payloadOrParams);
    } else {
      await createGuest(payloadOrParams);
    }
    setGuestFormDialog({ isOpen: false, guest: null });
  };

  const handleDeleteGuest = async ({ guestId, version }) => {
    await deleteGuest({ guestId, version });
    setGuestDeleteDialog({ isOpen: false, guest: null });
  };

  const handleImportSuccess = () => {
    refetchGuests();
    refetchStats();
  };

  const isClosed = selectedEvent?.status === 'closed';

  if (!hasEvents && !isLoadingEvents) {
    return (
      <div className={styles.workspace}>
        <div className={styles.emptyEvents}>
          <div style={{ fontSize: '48px' }} aria-hidden="true">
            🏛️
          </div>
          <h2 className={styles.emptyEventsTitle}>{t(dict, 'events.noEventsAdmin')}</h2>
          <p className={styles.emptyEventsDesc}>{t(dict, 'events.createFirstEventPrompt')}</p>
          <Button
            variant="primary"
            onClick={() => setEventDialog({ isOpen: true, mode: 'create' })}
            data-testid="create-first-event-btn"
          >
            ➕ {t(dict, 'events.createFirstEvent')}
          </Button>
        </div>

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
        onOpenSettings={() => setEventDialog({ isOpen: true, mode: 'edit' })}
        onOpenLifecycle={(targetStatus) =>
          setLifecycleDialog({ isOpen: true, targetStatus })
        }
      />

      {/* Live Polling Statistics Strip */}
      <StatsStrip
        stats={stats}
        isFetching={isFetchingStats}
        eventStatus={selectedEvent?.status}
        lang={lang}
      />

      {/* Paginated and Searchable Guests Table */}
      <GuestTable
        guests={guests}
        meta={meta}
        isLoading={isLoadingGuests}
        isFetching={isFetchingGuests}
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
        onAddGuest={() => setGuestFormDialog({ isOpen: true, guest: null })}
        onImportCsv={() => setImportDialog({ isOpen: true })}
        onViewQr={(guest) => setQrDialog({ isOpen: true, guest })}
        onEditGuest={(guest) => setGuestFormDialog({ isOpen: true, guest })}
        onDeleteGuest={(guest) => setGuestDeleteDialog({ isOpen: true, guest })}
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
        onReload={() => refetchGuests()}
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

      {/* 5. QR Preview Modal */}
      <QrPreviewDialog
        isOpen={qrDialog.isOpen}
        guest={qrDialog.guest}
        eventId={selectedEventId}
        onClose={() => setQrDialog({ isOpen: false, guest: null })}
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
    </div>
  );
}
