'use client';

import React, { useRef } from 'react';
import { Dialog } from '../ui/Dialog.jsx';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
import { getDictionary, t } from '../../lib/locale.js';
import styles from './GuestDeleteDialog.module.css';

/**
 * Confirmation dialog for soft-deleting a guest invitation.
 * Blocks deletion if the guest is admitted or if the event is closed.
 * Initial focus lands on Cancel so Enter never deletes by accident.
 */
export function GuestDeleteDialog({
  isOpen,
  onClose,
  guest,
  onConfirm,
  isPending = false,
  apiError = null,
  isClosed = false,
  lang = 'ar',
}) {
  const dict = getDictionary(lang);
  const cancelBtnRef = useRef(null);
  if (!guest) return null;

  const isAdmitted = !!guest.checkIn;
  const canDelete = !isAdmitted && !isClosed;

  const handleConfirm = async () => {
    if (!canDelete) return;
    await onConfirm({
      guestId: guest.id,
      version: guest.version,
    }).catch(() => { /* Mutation error is displayed through apiError; preserve the form. */ });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t(dict, 'guests.deleteConfirmTitle')}
      icon="trash"
      size="sm"
      destructive
      closeOnBackdropClick={!isPending}
      initialFocusRef={cancelBtnRef}
      closeAriaLabel={t(dict, 'dialog.close')}
      footer={
        <>
          <Button ref={cancelBtnRef} variant="ghost" onClick={onClose} disabled={isPending}>
            {t(dict, 'common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            loading={isPending}
            disabled={!canDelete}
            leadingIcon="trash"
            data-testid="confirm-delete-guest-btn"
          >
            {t(dict, 'guests.delete')}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        {apiError && (
          <Notice variant="error" message={t(dict, `errors.${apiError.code}`) || apiError.message} />
        )}

        {isClosed && <Notice variant="warning" message={t(dict, 'guests.eventClosedWarning')} />}

        {isAdmitted ? (
          <Notice variant="warning" message={t(dict, 'guests.admittedCannotDelete')} />
        ) : (
          <>
            <div className={styles.guestCard}>
              <strong dir="auto" className={styles.guestName}>{guest.name}</strong>
              <span className={styles.guestMeta}>
                {guest.shortCode && <bdi className={styles.code}>{guest.shortCode}</bdi>}
                {guest.reference && <bdi>{guest.reference}</bdi>}
              </span>
            </div>
            <p className={styles.message}>
              {t(dict, 'guests.deleteConfirmMessage', { name: guest.name })}
            </p>
          </>
        )}
      </div>
    </Dialog>
  );
}
