'use client';

import React from 'react';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { Button } from '../ui/Button.jsx';
import { IconButton } from '../ui/IconButton.jsx';
import { Menu } from '../ui/Menu.jsx';
import { Icon } from '../ui/Icon.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { Pagination } from '../ui/Pagination.jsx';
import { getDictionary, t, formatRiyadhDate } from '../../lib/locale.js';
import styles from './GuestTable.module.css';

const SKELETON_ROWS = 6;

const HONORIFICS = new Set([
  'dr', 'dr.', 'prof', 'prof.', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'eng', 'eng.',
  'سعادة', 'معالي', 'سمو', 'الدكتور', 'الدكتورة', 'د.', 'الأستاذ', 'الأستاذة', 'أ.',
  'الشيخ', 'الشيخة', 'المهندس', 'المهندسة', 'م.',
]);

function initialOf(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  const word = words.find((w) => !HONORIFICS.has(w.toLowerCase())) || words[0] || '';
  // Arabic names commonly carry the definite article; the letter after it reads better.
  const stem = /^ال./.test(word) && word.length > 3 ? word.slice(2) : word;
  return stem ? Array.from(stem)[0].toUpperCase() : '?';
}

/**
 * Paginated, searchable and filterable guest list.
 * Desktop: five scannable columns with a sticky header and a per-row action menu.
 * Mobile: each row reflows into a compact card; no horizontal scrolling.
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
  const numberFormat = new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ar-SA');

  const isAllPageSelected = guests.length > 0 && guests.every((g) => selectedGuestIds.has(g.id));
  const isSomePageSelected = guests.some((g) => selectedGuestIds.has(g.id)) && !isAllPageSelected;
  const hasFilters = Boolean(search) || statusFilter !== 'all';

  const handleClearFilters = () => {
    onSearchChange?.('');
    onStatusFilterChange?.('all');
  };

  const filters = [
    { key: 'all', label: t(dict, 'guests.allFilter') },
    { key: 'admitted', label: t(dict, 'guests.admittedFilter') },
    { key: 'pending', label: t(dict, 'guests.pendingFilter') },
  ];

  const buildRowMenu = (guest, isAdmitted) => {
    const items = [
      {
        key: 'edit',
        label: t(dict, 'guests.edit'),
        icon: <Icon name="edit" size="sm" />,
        onClick: () => onEditGuest?.(guest),
        disabled: isClosed || isAdmitted,
        hint: isAdmitted ? t(dict, 'guests.admittedCannotEdit') : t(dict, 'guests.eventClosedWarning'),
        testId: `edit-guest-btn-${guest.id}`,
      },
    ];
    if (isAdmitted && !isClosed) {
      items.push(
        { type: 'divider' },
        {
          key: 'correct',
          label: t(dict, 'guests.admissionCorrection'),
          icon: <Icon name="sliders" size="sm" />,
          onClick: () => onCorrectAdmission?.(guest),
          testId: `correct-admission-btn-${guest.id}`,
        },
        {
          key: 'reset',
          label: t(dict, 'guests.admissionReset'),
          icon: <Icon name="rotate-ccw" size="sm" />,
          onClick: () => onResetAdmission?.(guest),
          danger: true,
          testId: `reset-admission-btn-${guest.id}`,
        }
      );
    }
    items.push(
      { type: 'divider' },
      {
        key: 'delete',
        label: t(dict, 'guests.delete'),
        icon: <Icon name="trash" size="sm" />,
        onClick: () => onDeleteGuest?.(guest),
        disabled: isClosed || isAdmitted,
        hint: isAdmitted ? t(dict, 'guests.admittedCannotDelete') : t(dict, 'guests.eventClosedWarning'),
        danger: true,
        testId: `delete-guest-btn-${guest.id}`,
      }
    );
    return items;
  };

  const renderBody = () => {
    if (isLoading && !guests.length) {
      return Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <tr key={`sk-${i}`} className={styles.skeletonRow} aria-hidden="true">
          <td className={styles.tdCheckbox}><Skeleton width="18px" height="18px" /></td>
          <td className={styles.tdGuest}>
            <div className={styles.guestCell}>
              <Skeleton circle width="36px" height="36px" />
              <div className={styles.guestText}>
                <Skeleton width="160px" height="14px" />
                <Skeleton width="100px" height="12px" />
              </div>
            </div>
          </td>
          <td className={styles.tdParty}><Skeleton width="60px" height="14px" /></td>
          <td className={styles.tdStatus}><Skeleton width="80px" height="24px" borderRadius="999px" /></td>
          <td className={styles.tdArrival}><Skeleton width="110px" height="14px" /></td>
          <td className={styles.tdActions} />
        </tr>
      ));
    }

    if (guests.length === 0) {
      return (
        <tr className={styles.emptyRow}>
          <td colSpan={6}>
            {hasFilters ? (
              <EmptyState
                icon="search"
                title={t(dict, 'guests.noSearchResults')}
                action={
                  <Button variant="outline" onClick={handleClearFilters} data-testid="clear-filters-btn">
                    {t(dict, 'guests.clearFilters')}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon="users"
                title={t(dict, 'guests.noGuests')}
                description={t(dict, 'guests.noGuestsAction')}
                action={
                  !isClosed ? (
                    <>
                      <Button variant="primary" leadingIcon="plus" onClick={onAddGuest}>
                        {t(dict, 'guests.addGuest')}
                      </Button>
                      <Button variant="outline" leadingIcon="upload" onClick={onImportCsv}>
                        {t(dict, 'imports.title')}
                      </Button>
                    </>
                  ) : null
                }
              />
            )}
          </td>
        </tr>
      );
    }

    return guests.map((guest) => {
      const isSelected = selectedGuestIds.has(guest.id);
      const isAdmitted = !!guest.checkIn;
      const companions = guest.allowedCompanions || 0;
      const actualParty = isAdmitted
        ? guest.checkIn.actualPartySize ?? 1 + (guest.checkIn.actualCompanions || 0)
        : null;
      const arrivalAt = isAdmitted ? guest.checkIn.checkedInAt || guest.checkIn.admittedAt : null;

      return (
        <tr
          key={guest.id}
          className={`${styles.tr} ${isSelected ? styles.trSelected : ''}`}
          data-testid={`guest-row-${guest.id}`}
        >
          <td className={styles.tdCheckbox}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={isSelected}
              onChange={() => toggleSelect?.(guest.id)}
              aria-label={t(dict, 'guests.selectGuest', { name: guest.name })}
              data-testid={`guest-checkbox-${guest.id}`}
            />
          </td>

          <td className={styles.tdGuest}>
            <div className={styles.guestCell}>
              <span className={`${styles.avatar} ${isAdmitted ? styles.avatarAdmitted : ''}`} aria-hidden="true">
                {initialOf(guest.name)}
              </span>
              <div className={styles.guestText}>
                <span dir="auto" className={styles.nameCell}>{guest.name}</span>
                <span className={styles.guestSub}>
                  <bdi className={styles.codeChip}>{guest.shortCode}</bdi>
                  {guest.reference && (
                    <>
                      <span className={styles.subDot} aria-hidden="true" />
                      <bdi className={styles.reference}>{guest.reference}</bdi>
                    </>
                  )}
                </span>
              </div>
            </div>
          </td>

          <td className={styles.tdParty}>
            {isAdmitted ? (
              <div className={styles.partyCell}>
                <span className={`${styles.partyValue} ${styles.partyArrived}`}>
                  <Icon name="users" size="sm" />
                  <span className="tabular">
                    {numberFormat.format(actualParty)} / {numberFormat.format(guest.totalAllowed)}
                  </span>
                </span>
                <span className={styles.partyHint}>
                  {t(dict, 'guests.partyArrivedOf', { count: numberFormat.format(guest.totalAllowed) })}
                </span>
              </div>
            ) : (
              <div className={styles.partyCell}>
                <span className={styles.partyValue}>
                  <Icon name="users" size="sm" />
                  <span className="tabular">{numberFormat.format(guest.totalAllowed)}</span>
                </span>
                <span className={styles.partyHint}>
                  {companions > 0
                    ? t(dict, 'guests.partyWithCompanions', { count: numberFormat.format(companions) })
                    : t(dict, 'guests.partyGuestOnly')}
                </span>
              </div>
            )}
          </td>

          <td className={styles.tdStatus}>
            <StatusBadge
              status={isAdmitted ? 'admitted' : 'pending'}
              label={t(dict, isAdmitted ? 'status.admitted' : 'status.pending')}
            />
          </td>

          <td className={styles.tdArrival}>
            {arrivalAt ? (
              <span className={styles.arrival}>
                <Icon name="clock" size="sm" />
                <bdi className="tabular">{formatRiyadhDate(arrivalAt, lang)}</bdi>
              </span>
            ) : (
              <span className={styles.arrivalNone}>{t(dict, 'guests.arrivalNone')}</span>
            )}
          </td>

          <td className={styles.tdActions}>
            <div className={styles.actionsCell}>
              <IconButton
                icon={<Icon name="qr" size="sm" />}
                label={t(dict, 'guests.viewQr')}
                variant="ghost"
                onClick={() => onViewQr?.(guest)}
                data-testid={`view-qr-btn-${guest.id}`}
              />
              <Menu
                align="end"
                aria-label={t(dict, 'guests.rowActions', { name: guest.name })}
                items={buildRowMenu(guest, isAdmitted)}
                trigger={
                  <IconButton
                    icon={<Icon name="more-vertical" size="sm" />}
                    label={t(dict, 'guests.rowActions', { name: guest.name })}
                    variant="ghost"
                    data-testid={`row-actions-btn-${guest.id}`}
                  />
                }
              />
            </div>
          </td>
        </tr>
      );
    });
  };

  return (
    <section className={styles.container} aria-label={t(dict, 'guests.title')}>
      {/* Header: title + count, primary actions */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarTitle}>
          <h2 className={styles.title}>{t(dict, 'guests.title')}</h2>
          {meta?.total > 0 && (
            <span className={`${styles.countPill} tabular`}>{numberFormat.format(meta.total)}</span>
          )}
          {isFetching && !isLoading && <span className={styles.fetchSpinner} aria-hidden="true" />}
        </div>

        <div className={styles.toolbarActions}>
          <Button
            variant="outline"
            onClick={onImportCsv}
            disabled={isClosed}
            data-testid="import-csv-btn"
            leadingIcon="upload"
          >
            {t(dict, 'imports.title')}
          </Button>
          <Button
            variant="outline"
            onClick={() => onExportCsv?.()}
            title={t(dict, 'exports.title')}
            data-testid="export-qr-btn"
            leadingIcon="download"
          >
            {t(dict, 'exports.title')}
          </Button>
          <Button
            variant="primary"
            onClick={onAddGuest}
            disabled={isClosed}
            data-testid="add-guest-btn"
            leadingIcon="user-plus"
          >
            {t(dict, 'guests.addGuest')}
          </Button>
        </div>
      </div>

      {/* Search + status filter */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon} aria-hidden="true">
            <Icon name="search" size="sm" />
          </span>
          <input
            type="search"
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
              <Icon name="x" size="sm" />
            </button>
          )}
        </div>

        <div className={styles.segmented} role="tablist" aria-label={t(dict, 'common.status')}>
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={statusFilter === f.key}
              className={`${styles.segment} ${statusFilter === f.key ? styles.segmentActive : ''}`}
              onClick={() => onStatusFilterChange?.(f.key)}
              data-testid={`filter-${f.key}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selection command bar */}
      {selectedCount > 0 && (
        <div className={styles.selectionBar} data-testid="selection-bar">
          <span className={styles.selectionCount}>
            <Icon name="check-circle" size="sm" />
            {t(dict, 'guests.selectedCount', { count: numberFormat.format(selectedCount) })}
          </span>
          <div className={styles.selectionActions}>
            <Button variant="secondary" size="sm" onClick={() => onExportCsv?.()} leadingIcon="printer">
              {t(dict, 'exports.selectedPasses')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              data-testid="clear-selection-btn"
              leadingIcon="x"
            >
              {t(dict, 'guests.clearSelection')}
            </Button>
          </div>
        </div>
      )}

      {loadError && !isLoading && guests.length === 0 ? (
        <div className={styles.errorState} role="alert" data-testid="guests-load-error">
          <EmptyState
            icon="alert-triangle"
            title={t(dict, 'errors.SERVICE_UNAVAILABLE') || loadError.message}
            description={t(dict, 'common.networkError')}
            action={
              <Button
                variant="outline"
                onClick={() => onRetry?.()}
                data-testid="guests-retry-btn"
                leadingIcon="refresh"
              >
                {t(dict, 'common.retry')}
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className={styles.tableScrollWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col" className={`${styles.th} ${styles.tdCheckbox}`}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={isAllPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomePageSelected;
                      }}
                      onChange={() => selectAllCurrentPage?.(guests)}
                      aria-label={t(dict, 'guests.selectPage')}
                      data-testid="select-page-checkbox"
                      disabled={guests.length === 0}
                    />
                  </th>
                  <th scope="col" className={styles.th}>{t(dict, 'guests.guestName')}</th>
                  <th scope="col" className={styles.th}>{t(dict, 'guests.partyColumn')}</th>
                  <th scope="col" className={styles.th}>{t(dict, 'common.status')}</th>
                  <th scope="col" className={styles.th}>{t(dict, 'guests.arrival')}</th>
                  <th scope="col" className={`${styles.th} ${styles.thActions}`}>
                    <span className="sr-only">{t(dict, 'guests.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>{renderBody()}</tbody>
            </table>
          </div>

          {(meta?.total || 0) > (meta?.pageSize || 25) && (
            <Pagination
              page={meta.page || 1}
              pageSize={meta.pageSize || 25}
              total={meta.total || 0}
              onPageChange={onPageChange}
              previousLabel={t(dict, 'common.previous')}
              nextLabel={t(dict, 'common.next')}
              pageLabel={t(dict, 'common.page')}
              ofLabel={t(dict, 'common.of')}
              totalLabel={t(dict, 'guests.title')}
            />
          )}
        </>
      )}
    </section>
  );
}
