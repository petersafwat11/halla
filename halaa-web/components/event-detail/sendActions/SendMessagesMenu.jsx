"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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

  const { data: guestsData } = useEventGuests(eventId);
  const guests = guestsData?.data || [];

  // Only meaningful once a send has started; never on terminal events.
  if (!event || isTerminalEvent(event) || !hasSendStarted(event)) return null;

  const audiences = computeSendAudiences(guests);
  const states = buildSendActionStates(event, audiences);
  const invitationBalance = event?.invitationBalance || event?.subscription?.invitationBalance || null;
  const invitesRemaining = invitationBalance?.unlimited
    ? null
    : invitationBalance?.remaining ?? 0;

  const handlePick = (action) => {
    if (!states[action]?.enabled) return;
    setActiveAction(action);
    setOpen(false);
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
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

      {open && (
        <div className={styles.dropdown}>
          {SEND_ACTIONS.map((action) => {
            const state = states[action];
            const [labelKey, labelFallback] = ITEM_LABEL_KEYS[action];
            const reason = state.reasonKey
              ? t(...DISABLED_KEYS[state.reasonKey])
              : null;
            return (
              <button
                key={action}
                type="button"
                className={`${styles.item} ${
                  state.enabled ? "" : styles.itemDisabled
                }`}
                onClick={() => handlePick(action)}
                disabled={!state.enabled}
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
        </div>
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
