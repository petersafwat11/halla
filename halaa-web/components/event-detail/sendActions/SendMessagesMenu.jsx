"use client";
import React, { useState, useRef, useLayoutEffect, useId } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useEventGuests } from "@/hooks/events";
import SendActionPopup from "./SendActionPopup";
import {
  SEND_ACTIONS,
  computeSendAudiences,
  buildSendActionStates,
  hasSendStarted,
  isTerminalEvent,
} from "./sendAudiences";
import styles from "./SendMessagesMenu.module.css";

const ITEM_LABEL_KEYS = {
  newGuests: ["singleEvent.sendActions.items.newGuests", "Send invite to new guests"],
  resend: ["singleEvent.sendActions.items.resend", "Resend invitation"],
  extraReminder: ["singleEvent.sendActions.items.extraReminder", "Extra reminder"],
};
const DISABLED_KEYS = {
  sendFirst: ["singleEvent.sendActions.disabled.sendFirst", "Send the initial invitations first"],
  noNewGuests: ["singleEvent.sendActions.disabled.noNewGuests", "No new guests to send to"],
  noResend: ["singleEvent.sendActions.disabled.noResend", "Everyone has responded"],
  noConfirmed: ["singleEvent.sendActions.disabled.noConfirmed", "No confirmed guests yet"],
};

/**
 * Grouped "Send messages" dropdown in the single-event header. Consolidates the
 * three pool-charged send actions (send-to-new-guests, resend, extra reminder)
 * behind one control, each opening the shared SendActionPopup. Hidden until a
 * send has started, and on terminal (completed/cancelled) events.
 */
export default function SendMessagesMenu({ event, eventId }) {
  const { t } = useTranslation("home-events");
  const [open, setOpen] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();
  const [position, setPosition] = useState({});
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect || !menuRef.current) return;
      const width = Math.min(360, window.innerWidth - 24);
      const rtl = getComputedStyle(triggerRef.current).direction === 'rtl';
      const left = Math.max(12, Math.min(rtl ? rect.right - width : rect.left, window.innerWidth - width - 12));
      const height = Math.min(menuRef.current.scrollHeight, window.innerHeight - 24);
      const below = window.innerHeight - rect.bottom - 12;
      const top = below >= height ? rect.bottom + 8 : Math.max(12, rect.top - height - 8);
      setPosition({ left, top, width, maxHeight: window.innerHeight - top - 12, direction: rtl ? 'rtl' : 'ltr' });
    };
    const outside = (event) => {
      if (!menuRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); }
    };
    place();
    menuRef.current?.focus();
    const observer = new ResizeObserver(place);
    observer.observe(menuRef.current);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);


  const { data: guestsData } = useEventGuests(eventId);
  const guests = guestsData?.data || [];

  // Only meaningful once a send has started; never on terminal events.
  if (!event || isTerminalEvent(event) || !hasSendStarted(event) || event.status !== "live") return null;

  const audiences = computeSendAudiences(guests);
  const preview = guestsData?.audiencePreview;
  if (preview?.audiences) {
    for (const action of SEND_ACTIONS) {
      const ids = new Set(preview.audiences[action]?.guestIds || []);
      audiences[action] = guests.filter(guest => ids.has(String(guest.id)));
    }
  }
  const states = buildSendActionStates(event, audiences);
  if (event.reminderAvailability?.configured === false) {
    states.extraReminder = { ...states.extraReminder, enabled: false, reasonKey: 'reminderUnavailable' };
  }
  const invitationBalance = event?.invitationBalance || event?.subscription?.invitationBalance || null;
  const invitesRemaining = invitationBalance?.unlimited
    ? null
    : invitationBalance?.remaining ?? 0;

  const handlePick = (action) => {
    if (!states[action]?.enabled || preview?.canSend === false) return;
    setActiveAction(action);
    setOpen(false);
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        ref={triggerRef}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={styles.menuButton}
        onClick={() => setOpen((o) => !o)}
      >
        <Image src="/svg/events/calendar-edit.svg" alt="" width={12} height={12} />
        <span>{t("singleEvent.sendActions.menu", "Send messages")}</span>
        <Image
          src="/svg/events/arrow-down.svg"
          alt=""
          width={12}
          height={12}
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {open && createPortal(
        <div ref={menuRef} id={menuId} tabIndex={-1} style={position} className={styles.dropdown}>
          {SEND_ACTIONS.map((action) => {
            const state = states[action];
            const [labelKey, labelFallback] = ITEM_LABEL_KEYS[action];
            const reason = state.reasonKey
              ? state.reasonKey === 'reminderUnavailable'
                ? t('singleEvent.reminderUnavailableShort')
                : t(...DISABLED_KEYS[state.reasonKey])
              : null;
            return (
              <button
                key={action}
                type="button"
                className={`${styles.item} ${
                  state.enabled ? "" : styles.itemDisabled
                }`}
                onClick={() => handlePick(action)}
                disabled={!state.enabled || preview?.canSend === false}
                title={reason || undefined}
              >
                <span>{t(labelKey, labelFallback)}</span>
                {state.enabled ? (
                  <span className={styles.count}>{state.audience.length}</span>
                ) : (
                  <span className={styles.reason}>{reason}</span>
                )}
              </button>
            );
          })}
        </div>, document.body
      )}

      <SendActionPopup
        action={activeAction}
        eventId={eventId}
        guests={guests}
        invitesRemaining={invitesRemaining}
        invitationBalance={invitationBalance}
        isOpen={!!activeAction}
        onClose={() => setActiveAction(null)}
      />
    </div>
  );
}
