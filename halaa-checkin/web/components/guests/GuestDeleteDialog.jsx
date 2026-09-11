'use client';

import React, { useRef } from 'react';
import { Dialog } from '../ui/Dialog.jsx';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
import { Icon } from '../ui/Icon.jsx';
import { getDictionary, t } from '../../lib/locale.js';

/**
 * Confirmation dialog for soft-deleting a guest invitation.
 * Blocks deletion if the guest is admitted or if the event is closed.
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
      maxWidth="460px"
      destructive
      closeOnBackdropClick={!isPending}
      initialFocusRef={cancelBtnRef}
      closeAriaLabel={t(dict, 'dialog.close')}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {apiError && (
          <Notice
            variant="error"
            message={t(dict, `errors.${apiError.code}`) || apiError.message}
          />
        )}

        {isClosed && (
          <Notice
            variant="warning"
            message={t(dict, 'guests.eventClosedWarning')}
          />
        )}

        {isAdmitted ? (
          <Notice
            variant="warning"
            message={t(dict, 'guests.admittedCannotDelete')}
          />
        ) : (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              backgroundColor: 'var(--ops-canvas, #f8f5f1)',
              border: '1px solid var(--ops-border, #e4ddd6)',
              borderRadius: 'var(--radius-sm, 8px)',
            }}>
              <Icon name="warning" size="md" style={{ color: 'var(--color-error, #b42318)', flexShrink: 0 }} />
              <div>
                <strong dir="auto" style={{ display: 'block', fontSize: '15px', color: 'var(--ops-ink, #2c2926)' }}>
                  {guest.name}
                </strong>
                {guest.shortCode && (
                  <bdi style={{ fontSize: '13px', color: 'var(--ops-muted, #68615b)' }}>
                    {guest.shortCode}
                  </bdi>
                )}
              </div>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--ops-muted, #68615b)', lineHeight: '1.5', margin: 0 }}>
              {t(dict, 'guests.deleteConfirmMessage', { name: guest.name })}
            </p>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <Button
            ref={cancelBtnRef}
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
          >
            {t(dict, 'common.cancel')}
          </Button>

          <Button
            variant="danger"
            onClick={handleConfirm}
            loading={isPending}
            disabled={!canDelete}
            data-testid="confirm-delete-guest-btn"
          >
            {t(dict, 'guests.delete')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
