'use client';

import React from 'react';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { Button } from '../ui/Button.jsx';
import { Pagination } from '../ui/Pagination.jsx';
import { getDictionary, t, formatRiyadhDate } from '../../lib/locale.js';
import styles from './GuestTable.module.css';

/**
 * Paginated, searchable, and filterable guest list table.
 * Admitted guests cannot have ordinary edits or deletion (buttons disabled with explanation).
 * Admin can correct/reset admissions.
 */
export function GuestTable({
  guests = [],
  meta = { page: 1, pageSize: 25, total: 0 },
  isLoading = false,
  isFetching = false,
  loadError = null,
  onRetry = null,
  search = '',
  onSearchChange,
  statusFilter = 'all',
  onStatusFilterChange,
  onPageChange,
  selectedGuestIds = new Set(),
  selectedCount = 0,
  toggleSelect,
  selectAllCurrentPage,
  clearSelection,
  isClosed = false,
  lang = 'ar',
  onAddGuest,
  onImportCsv,
  onExportCsv,
  onViewQr,
  onEditGuest,
  onDeleteGuest,
  onCorrectAdmission,
  onResetAdmission,
}) {
  const dict = getDictionary(lang);

  const isAllPageSelected = guests.length > 0 && guests.every((g) => selectedGuestIds.has(g.id));
  const isSomePageSelected = guests.some((g) => selectedGuestIds.has(g.id)) && !isAllPageSelected;

  const handleClearFilters = () => {
    onSearchChange?.('');
    onStatusFilterChange?.('all');
  };

  return (
    <div className={styles.container}>
      {/* Top Controls: Search, Filters & Actions */}
      <div className={styles.topBar}>
        <div className={styles.searchAndFilters}>
          {/* Server-side Search Input */}
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon} aria-hidden="true">
              🔍
            </span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t(dict, 'guests.searchPlaceholder')}
              value={search}
              onChange={(e) => onSearchChange?.(e.target.value)}
              aria-label={t(dict, 'guests.searchPlaceholder')}
              data-testid="guests-search-input"
            />
            {search && (
              <button
                type="button"
                className={styles.clearSearch}
                onClick={() => onSearchChange?.('')}
                aria-label={t(dict, 'common.clear')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className={styles.filterTabs} role="tablist" aria-label="Status filters">
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'all'}
              className={`${styles.filterTab} ${statusFilter === 'all' ? styles.filterTabActive : ''}`}
              onClick={() => onStatusFilterChange?.('all')}
              data-testid="filter-all"
            >
              {t(dict, 'guests.allFilter')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'admitted'}
              className={`${styles.filterTab} ${statusFilter === 'admitted' ? styles.filterTabActive : ''}`}
              onClick={() => onStatusFilterChange?.('admitted')}
              data-testid="filter-admitted"
            >
              {t(dict, 'guests.admittedFilter')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'pending'}
              className={`${styles.filterTab} ${statusFilter === 'pending' ? styles.filterTabActive : ''}`}
              onClick={() => onStatusFilterChange?.('pending')}
              data-testid="filter-pending"
            >
              {t(dict, 'guests.pendingFilter')}
            </button>
          </div>
        </div>

        {/* Action Buttons: Add Guest / Import CSV / Export QR PDFs */}
        <div className={styles.tableActions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={onImportCsv}
            disabled={isClosed}
            data-testid="import-csv-btn"
          >
            📥 {t(dict, 'imports.title')}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onExportCsv?.()}
            disabled={false}
            title={t(dict, 'exports.title')}
            data-testid="export-qr-btn"
          >
            📄 {t(dict, 'exports.title')}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onAddGuest}
            disabled={isClosed}
            data-testid="add-guest-btn"
          >
            ➕ {t(dict, 'guests.addGuest')}
          </Button>
        </div>
      </div>

      {/* Selection Summary Bar */}
      {selectedCount > 0 && (
        <div className={styles.selectionBar} data-testid="selection-bar">
          <span>{t(dict, 'guests.selectedCount', { count: selectedCount })}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            data-testid="clear-selection-btn"
          >
            {t(dict, 'guests.clearSelection')}
          </Button>
        </div>
      )}

      {/* Table Content */}
      {loadError && !isLoading && guests.length === 0 ? (
        <div className={styles.emptyState} role="alert" data-testid="guests-load-error">
          <div className={styles.emptyIcon}>⚠️</div>
          <h3 className={styles.emptyTitle}>{t(dict, 'errors.SERVICE_UNAVAILABLE') || loadError.message}</h3>
          <Button variant="secondary" size="sm" onClick={() => onRetry?.()} data-testid="guests-retry-btn">
            {t(dict, 'common.retry') || (lang === 'ar' ? 'إعادة المحاولة' : 'Retry')}
          </Button>
        </div>
      ) : (
      <>
      <div className={styles.tableScrollWrapper}>
        <table className={styles.table} aria-label={t(dict, 'guests.title')}>
          <thead>
            <tr>
              <th scope="col" className={`${styles.th} ${styles.thCheckbox}`}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={isAllPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomePageSelected;
                  }}
                  onChange={() => selectAllCurrentPage?.(guests)}
                  aria-label="Select all on current page"
                  data-testid="select-page-checkbox"
                />
              </th>
              <th scope="col" className={styles.th}>{t(dict, 'qr.shortCode')}</th>
              <th scope="col" className={styles.th}>{t(dict, 'guests.guestName')}</th>
              <th scope="col" className={styles.th}>{t(dict, 'guests.reference')}</th>
              <th scope="col" className={styles.th}>{t(dict, 'guests.allowedCompanions')}</th>
              <th scope="col" className={styles.th}>{t(dict, 'guests.totalAllowed')}</th>
              <th scope="col" className={styles.th}>{t(dict, 'common.status')}</th>
              <th scope="col" className={styles.th}>{t(dict, 'guests.actualParty')}</th>
              <th scope="col" className={styles.th}>{t(dict, 'guests.arrival')}</th>
              <th scope="col" className={styles.th}>{t(dict, 'guests.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && !guests.length ? (
              <tr>
                <td colSpan={10} className={styles.loadingOverlay}>
                  {t(dict, 'common.loading')}
                </td>
              </tr>
            ) : guests.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📋</div>
                    {search || statusFilter !== 'all' ? (
                      <>
                        <h3 className={styles.emptyTitle}>{t(dict, 'guests.noSearchResults')}</h3>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleClearFilters}
                          data-testid="clear-filters-btn"
                        >
                          {t(dict, 'guests.clearFilters')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <h3 className={styles.emptyTitle}>{t(dict, 'guests.noGuests')}</h3>
                        <p className={styles.emptyDesc}>{t(dict, 'guests.noGuestsAction')}</p>
                        {!isClosed && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <Button variant="primary" size="sm" onClick={onAddGuest}>
                              ➕ {t(dict, 'guests.addGuest')}
                            </Button>
                            <Button variant="secondary" size="sm" onClick={onImportCsv}>
                              📥 {t(dict, 'imports.title')}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              guests.map((guest) => {
                const isSelected = selectedGuestIds.has(guest.id);
                const isAdmitted = !!guest.checkIn;
                const actualParty = isAdmitted
                  ? (guest.checkIn.actualPartySize ?? 1 + (guest.checkIn.actualCompanions || 0))
                  : '—';

                return (
                  <tr
                    key={guest.id}
                    className={`${styles.tr} ${isSelected ? styles.trSelected : ''}`}
                    data-testid={`guest-row-${guest.id}`}
                  >
                    <td className={`${styles.td} ${styles.tdCheckbox}`}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isSelected}
                        onChange={() => toggleSelect?.(guest.id)}
                        aria-label={`Select ${guest.name}`}
                        data-testid={`guest-checkbox-${guest.id}`}
                      />
                    </td>
                    <td className={styles.td}>
                      <bdi className={styles.codeCell}>{guest.shortCode}</bdi>
                    </td>
                    <td className={styles.td}>
                      <span dir="auto" className={styles.nameCell}>
                        {guest.name}
                      </span>
                    </td>
                    <td className={styles.td}>
                      {guest.reference ? <bdi>{guest.reference}</bdi> : '—'}
                    </td>
                    <td className={styles.td}>{guest.allowedCompanions}</td>
                    <td className={styles.td}>{guest.totalAllowed}</td>
                    <td className={styles.td}>
                      <StatusBadge
                        status={isAdmitted ? 'admitted' : 'pending'}
                        label={t(dict, isAdmitted ? 'status.admitted' : 'status.pending')}
                      />
                    </td>
                    <td className={styles.td}>{actualParty}</td>
                    <td className={styles.td}>
                      {isAdmitted ? (
                        <span>{formatRiyadhDate(guest.checkIn.checkedInAt || guest.checkIn.admittedAt, lang)}</span>
                      ) : (
                        <span style={{ color: 'var(--color-natural-450, #656565)' }}>
                          {t(dict, 'guests.arrivalNone')}
                        </span>
                      )}
                    </td>
                    <td className={styles.td}>
                      <div className={styles.actionsCell}>
                        <button
                          type="button"
                          className={styles.rowActionBtn}
                          onClick={() => onViewQr?.(guest)}
                          title={t(dict, 'guests.viewQr')}
                          data-testid={`view-qr-btn-${guest.id}`}
                        >
                          📱 {t(dict, 'guests.viewQr')}
                        </button>
                        <button
                          type="button"
                          className={styles.rowActionBtn}
                          onClick={() => onEditGuest?.(guest)}
                          disabled={isClosed || isAdmitted}
                          title={isAdmitted ? t(dict, 'guests.admittedCannotEdit') : t(dict, 'guests.edit')}
                          data-testid={`edit-guest-btn-${guest.id}`}
                        >
                          ✏️ {t(dict, 'guests.edit')}
                        </button>
                        <button
                          type="button"
                          className={`${styles.rowActionBtn} ${styles.rowActionBtnDanger}`}
                          onClick={() => onDeleteGuest?.(guest)}
                          disabled={isClosed || isAdmitted}
                          title={isAdmitted ? t(dict, 'guests.admittedCannotDelete') : t(dict, 'guests.delete')}
                          data-testid={`delete-guest-btn-${guest.id}`}
                        >
                          🗑️ {t(dict, 'guests.delete')}
                        </button>
                        {isAdmitted && !isClosed && (
                          <>
                            <button
                              type="button"
                              className={styles.rowActionBtn}
                              onClick={() => onCorrectAdmission?.(guest)}
                              title={t(dict, 'guests.admissionCorrection')}
                              data-testid={`correct-admission-btn-${guest.id}`}
                            >
                              🔧 {t(dict, 'guests.admissionCorrection')}
                            </button>
                            <button
                              type="button"
                              className={`${styles.rowActionBtn} ${styles.rowActionBtnDanger}`}
                              onClick={() => onResetAdmission?.(guest)}
                              title={t(dict, 'guests.admissionReset')}
                              data-testid={`reset-admission-btn-${guest.id}`}
                            >
                              ↩️ {t(dict, 'guests.admissionReset')}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {(meta?.total || 0) > (meta?.pageSize || 25) && (
        <Pagination
          page={meta.page || 1}
          pageSize={meta.pageSize || 25}
          total={meta.total || 0}
          onPageChange={onPageChange}
          previousLabel={t(dict, 'common.previous') || 'Previous'}
          nextLabel={t(dict, 'common.next') || 'Next'}
          pageLabel={t(dict, 'common.page') || 'Page'}
          ofLabel={t(dict, 'common.of') || 'of'}
          totalLabel={t(dict, 'common.total') || 'Total'}
        />
      )}
      </>
      )}
    </div>
  );
}
