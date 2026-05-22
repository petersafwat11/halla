"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEvent } from "@/hooks/events/queries/useEvent";
import { useEventGuests } from "@/hooks/events/queries/useEventGuests";
import {
  useCancelScheduledExtraReminder,
  useCreateScheduledExtraReminder,
  useScheduledExtraReminders,
} from "@/hooks/queries/useScheduledExtraReminders";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import styles from "./ScheduleReminderSection.module.css";

const FIVE_MIN_MS = 5 * 60 * 1000;
const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;

function toDatetimeLocalValue(d) {
  if (!d) return "";
  const date = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Filter guests for a reminder type:
 *  - reminder_confirmed → guests whose RSVP is confirmed
 *  - reminder_pending  → guests who haven't responded or chose maybe
 * Declined guests are intentionally excluded from both (matches the 24h
 * auto-reminder cron's behaviour).
 */
function filterGuestsByReminderType(guests, type) {
  return (guests || []).filter((g) => {
    const response = g.rsvp?.response || null;
    const responded = g.rsvp?.responded === true;
    if (response === "declined") return false;
    if (type === "reminder_confirmed") return response === "confirmed";
    return !responded || response === "pending" || response === "maybe";
  });
}

function ScheduleReminderModal({
  eventId,
  event,
  onClose,
}) {
  const { t } = useTranslation("home-events");
  const guestsQuery = useEventGuests(eventId);
  const createMutation = useCreateScheduledExtraReminder();
  const [reminderType, setReminderType] = useState("reminder_pending");
  const [selectedGuestIds, setSelectedGuestIds] = useState(new Set());
  const [scheduledFor, setScheduledFor] = useState("");

  const eventTs = useMemo(() => {
    const v = event?.eventDetails?.date
      ? new Date(event.eventDetails.date).getTime()
      : NaN;
    return Number.isFinite(v) ? v : null;
  }, [event]);

  const minDt = useMemo(() => new Date(Date.now() + FIVE_MIN_MS), []);
  const maxDt = useMemo(
    () => (eventTs ? new Date(eventTs - TWENTY_FOUR_H_MS) : null),
    [eventTs]
  );

  // Default the picker to a sensible point inside the window so the
  // host doesn't have to type a date from scratch.
  useEffect(() => {
    if (scheduledFor || !maxDt) return;
    const oneHourFromNow = new Date(Date.now() + 60 * 60_000);
    const initial =
      oneHourFromNow.getTime() < maxDt.getTime() ? oneHourFromNow : maxDt;
    setScheduledFor(toDatetimeLocalValue(initial));
  }, [maxDt, scheduledFor]);

  const allGuests = guestsQuery.data?.data?.guests || [];
  const candidateGuests = useMemo(
    () => filterGuestsByReminderType(allGuests, reminderType),
    [allGuests, reminderType]
  );

  // Switching reminder type can drop guests out of the candidate pool —
  // prune the selection to the still-eligible subset so the count badge
  // never lies and the submit can't 400 on stale ids.
  useEffect(() => {
    setSelectedGuestIds((prev) => {
      const allowed = new Set(candidateGuests.map((g) => String(g._id)));
      const next = new Set();
      for (const id of prev) if (allowed.has(id)) next.add(id);
      return next;
    });
  }, [candidateGuests]);

  const remindersRemaining =
    event?.subscription?.remindersRemaining ?? 0;
  const usedCount = selectedGuestIds.size;
  const overQuota = usedCount > remindersRemaining;

  const toggleGuest = (id) => {
    setSelectedGuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedGuestIds((prev) => {
      if (prev.size === candidateGuests.length) return new Set();
      return new Set(candidateGuests.map((g) => String(g._id)));
    });
  };

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    if (selectedGuestIds.size === 0) {
      toastUtils.error(
        t(
          "singleEvent.scheduleReminder.errors.noGuests",
          "Select at least one guest"
        )
      );
      return;
    }
    const targetMs = new Date(scheduledFor).getTime();
    if (
      !Number.isFinite(targetMs) ||
      targetMs < minDt.getTime() ||
      (maxDt && targetMs > maxDt.getTime())
    ) {
      toastUtils.error(
        t(
          "singleEvent.scheduleReminder.errors.dateOutOfRange",
          "Date must be between 5 minutes from now and 24 hours before the event"
        )
      );
      return;
    }
    if (overQuota) {
      toastUtils.error(
        t(
          "singleEvent.scheduleReminder.errors.insufficientQuota",
          "You don't have enough reminder quota"
        )
      );
      return;
    }
    try {
      await createMutation.mutateAsync({
        eventId,
        body: {
          reminderType,
          guestIds: Array.from(selectedGuestIds),
          scheduledFor: new Date(targetMs).toISOString(),
        },
      });
      toastUtils.success(
        t(
          "singleEvent.scheduleReminder.scheduledOk",
          "Reminder scheduled"
        )
      );
      onClose();
    } catch (err) {
      handleError(err, t, {
        fallbackMessage: "singleEvent.scheduleReminder.errors.generic",
      });
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <form className={styles.modal} onSubmit={onSubmit}>
        <div className={styles.modalHeader}>
          <h2>
            {t(
              "singleEvent.scheduleReminder.modalTitle",
              "Schedule extra reminder"
            )}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="close"
          >
            ×
          </button>
        </div>

        <fieldset className={styles.fieldset}>
          <legend>
            {t(
              "singleEvent.scheduleReminder.typeLabel",
              "Reminder type"
            )}
          </legend>
          <label className={styles.radio}>
            <input
              type="radio"
              name="reminderType"
              value="reminder_pending"
              checked={reminderType === "reminder_pending"}
              onChange={() => setReminderType("reminder_pending")}
            />
            <span>
              {t(
                "singleEvent.scheduleReminder.typePending",
                "For guests who did not respond or chose maybe"
              )}
            </span>
          </label>
          <label className={styles.radio}>
            <input
              type="radio"
              name="reminderType"
              value="reminder_confirmed"
              checked={reminderType === "reminder_confirmed"}
              onChange={() => setReminderType("reminder_confirmed")}
            />
            <span>
              {t(
                "singleEvent.scheduleReminder.typeConfirmed",
                "For guests who confirmed"
              )}
            </span>
          </label>
        </fieldset>

        <div className={styles.guestsBlock}>
          <div className={styles.guestsHeader}>
            <label className={styles.label}>
              {t(
                "singleEvent.scheduleReminder.guestsLabel",
                "Select guests"
              )}
            </label>
            <button
              type="button"
              className={styles.linkBtn}
              onClick={toggleAll}
            >
              {selectedGuestIds.size === candidateGuests.length &&
              candidateGuests.length > 0
                ? t("singleEvent.scheduleReminder.deselectAll", "Deselect all")
                : t("singleEvent.scheduleReminder.selectAll", "Select all")}
            </button>
          </div>
          <div className={styles.guestsList}>
            {guestsQuery.isLoading ? (
              <p className={styles.muted}>
                {t("common.loading", "Loading…")}
              </p>
            ) : candidateGuests.length === 0 ? (
              <p className={styles.muted}>
                {t(
                  "singleEvent.scheduleReminder.noEligibleGuests",
                  "No eligible guests for this reminder type."
                )}
              </p>
            ) : (
              candidateGuests.map((g) => {
                const id = String(g._id);
                return (
                  <label key={id} className={styles.guestRow}>
                    <input
                      type="checkbox"
                      checked={selectedGuestIds.has(id)}
                      onChange={() => toggleGuest(id)}
                    />
                    <span className={styles.guestName}>{g.name}</span>
                    <span className={styles.guestPhone}>{g.phone}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className={styles.dateRow}>
          <label className={styles.label}>
            {t("singleEvent.scheduleReminder.dateLabel", "Send at")}
          </label>
          <input
            type="datetime-local"
            value={scheduledFor}
            min={toDatetimeLocalValue(minDt)}
            max={maxDt ? toDatetimeLocalValue(maxDt) : undefined}
            onChange={(e) => setScheduledFor(e.target.value)}
            className={styles.dateInput}
          />
          <small className={styles.muted}>
            {t(
              "singleEvent.scheduleReminder.dateMin",
              "Earliest: in 5 minutes"
            )}
            {" — "}
            {t(
              "singleEvent.scheduleReminder.dateMax",
              "Latest: 24 hours before the event"
            )}
          </small>
        </div>

        <div className={styles.quotaRow}>
          <span className={styles.label}>
            {t("singleEvent.scheduleReminder.quotaLabel", "Quota")}
          </span>
          <span className={overQuota ? styles.quotaBad : styles.quotaOk}>
            {t("singleEvent.scheduleReminder.quotaValue", {
              defaultValue: "{{used}} of {{remaining}} available",
              used: usedCount,
              remaining: remindersRemaining,
            })}
          </span>
        </div>

        <div className={styles.actions}>
          <Button
            variant="secondary"
            title={t("singleEvent.scheduleReminder.cancel", "Cancel")}
            onClick={onClose}
            type="button"
            disabled={createMutation.isPending}
          />
          <Button
            variant="primary"
            title={
              createMutation.isPending
                ? t("common.loading", "Saving…")
                : t("singleEvent.scheduleReminder.submit", "Schedule")
            }
            type="submit"
            disabled={createMutation.isPending || overQuota}
          />
        </div>
      </form>
    </PopupLayout>
  );
}

export default function ScheduleReminderSection({ eventId }) {
  const { t } = useTranslation("home-events");
  const eventQuery = useEvent(eventId);
  const remindersQuery = useScheduledExtraReminders(eventId);
  const cancelMutation = useCancelScheduledExtraReminder();
  const [modalOpen, setModalOpen] = useState(false);

  const event = eventQuery.data?.data?.event;
  const scheduled = remindersQuery.data?.data?.scheduledReminders || [];
  const pending = scheduled.filter((r) => r.status === "pending");

  const remindersRemaining = event?.subscription?.remindersRemaining ?? 0;
  const eventTs = event?.eventDetails?.date
    ? new Date(event.eventDetails.date).getTime()
    : NaN;
  const now = Date.now();
  const hasValidWindow =
    Number.isFinite(eventTs) && eventTs - TWENTY_FOUR_H_MS > now + FIVE_MIN_MS;

  const canSee =
    !!event?.subscriptionId &&
    hasValidWindow &&
    (remindersRemaining > 0 || pending.length > 0);

  if (!canSee) return null;

  const onCancel = async (rid) => {
    if (
      !window.confirm(
        t(
          "singleEvent.scheduleReminder.cancelConfirm",
          "Cancel this scheduled reminder? Quota will be refunded."
        )
      )
    ) {
      return;
    }
    try {
      await cancelMutation.mutateAsync({ eventId, reminderId: rid });
      toastUtils.success(
        t("singleEvent.scheduleReminder.cancelledOk", "Reminder cancelled")
      );
    } catch (err) {
      handleError(err, t, {
        fallbackMessage: "singleEvent.scheduleReminder.errors.cancelFailed",
      });
    }
  };

  return (
    <section className={styles.wrapper}>
      <div className={styles.headerRow}>
        <h3 className={styles.heading}>
          {t(
            "singleEvent.scheduleReminder.heading",
            "Extra reminders"
          )}
        </h3>
        <Button
          variant="primary"
          title={t(
            "singleEvent.scheduleReminder.button",
            "Schedule extra reminder"
          )}
          onClick={() => setModalOpen(true)}
          disabled={remindersRemaining <= 0}
        />
      </div>
      <p className={styles.remaining}>
        {t("singleEvent.scheduleReminder.quotaValue", {
          defaultValue: "{{used}} of {{remaining}} available",
          used: 0,
          remaining: remindersRemaining,
        })}
      </p>

      {pending.length > 0 ? (
        <ul className={styles.scheduledList}>
          {pending.map((r) => (
            <li key={r._id} className={styles.scheduledRow}>
              <div className={styles.scheduledMeta}>
                <span className={styles.scheduledType}>
                  {t(`singleEvent.scheduleReminder.type.${r.reminderType}`, r.reminderType)}
                </span>
                <span className={styles.scheduledWhen}>
                  {t("singleEvent.scheduleReminder.scheduledFor", {
                    defaultValue: "Scheduled for {{when}}",
                    when: new Date(r.scheduledFor).toLocaleString(),
                  })}
                </span>
                <span className={styles.scheduledCount}>
                  {t("singleEvent.scheduleReminder.guestCount", {
                    defaultValue: "{{count}} guest(s)",
                    count: r.consumedQuota,
                  })}
                </span>
              </div>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => onCancel(r._id)}
                disabled={cancelMutation.isPending}
              >
                {t(
                  "singleEvent.scheduleReminder.cancelAction",
                  "Cancel reminder"
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.muted}>
          {t(
            "singleEvent.scheduleReminder.noScheduled",
            "No scheduled extra reminders"
          )}
        </p>
      )}

      {modalOpen && (
        <ScheduleReminderModal
          eventId={eventId}
          event={event}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
}
