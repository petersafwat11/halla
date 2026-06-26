"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import {
  useResendInvite,
  useExtraReminder,
  useSendNewGuests,
} from "@/hooks/events";
import { handleError } from "@/services/errorHandlingService";
import { renderStatusBadge } from "../GuestTable/guestCellRenderers";
import { computeSendAudiences } from "./sendAudiences";
import styles from "./SendActionPopup.module.css";

// Title per action. Resend / extra-reminder reuse the existing bulkActions
// titles so we don't duplicate copy.
const TITLE_KEYS = {
  newGuests: ["singleEvent.sendActions.items.newGuests", "Send invite to new guests"],
  resend: ["singleEvent.bulkActions.resendTitle", "Resend invitation"],
  extraReminder: ["singleEvent.bulkActions.extraReminderTitle", "Extra reminder"],
};

/**
 * Shared confirm popup for the three pool-charged send actions. Renders the
 * action's target guests with select-all checkboxes (default all), a live
 * "N selected · M invites left" counter, a cost line, and a locking Send
 * button. The backend re-filters the audience, so unchecking only narrows.
 */
export default function SendActionPopup({
  action,
  eventId,
  guests,
  invitesRemaining,
  isOpen,
  onClose,
}) {
  const { t } = useTranslation("home-events");

  // All three hooks are instantiated unconditionally (rules of hooks); we pick
  // the relevant one below.
  const resendMut = useResendInvite();
  const reminderMut = useExtraReminder();
  const newGuestsMut = useSendNewGuests();

  const audiences = useMemo(() => computeSendAudiences(guests), [guests]);
  const audience = action ? audiences[action] || [] : [];

  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // (Re)initialise the selection to "all" whenever the popup opens or the
  // action switches. We deliberately don't re-init on audience changes so a
  // background refetch can't wipe a host's manual de-selection mid-review.
  useEffect(() => {
    if (isOpen) setSelectedIds(new Set(audience.map((g) => g.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, action]);

  if (!isOpen || !action) return null;

  const mutation =
    action === "resend"
      ? resendMut
      : action === "extraReminder"
        ? reminderMut
        : newGuestsMut;
  const isPending = mutation.isPending;

  const isUnlimited = invitesRemaining == null;
  const selectedCount = selectedIds.size;
  const overQuota = !isUnlimited && selectedCount > invitesRemaining;
  const canSend = selectedCount > 0 && !overQuota && !isPending;

  const [titleKey, titleFallback] = TITLE_KEYS[action];
  const title = t(titleKey, titleFallback);

  const allSelected = audience.length > 0 && selectedCount === audience.length;

  const toggleAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(audience.map((g) => g.id)));

  const toggleOne = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const counterText = isUnlimited
    ? t("singleEvent.sendActions.popup.counterUnlimited", {
        defaultValue: "{{count}} selected",
        count: selectedCount,
      })
    : t("singleEvent.sendActions.popup.counter", {
        defaultValue: "{{count}} selected · {{remaining}} invites left",
        count: selectedCount,
        remaining: invitesRemaining,
      });

  const costText = isUnlimited
    ? t("singleEvent.sendActions.popup.costUnlimited", {
        defaultValue: "This will send {{count}} message(s).",
        count: selectedCount,
      })
    : t("singleEvent.sendActions.popup.cost", {
        defaultValue: "This will send {{count}} message(s) and use {{count}} invite(s).",
        count: selectedCount,
      });

  const handleSend = async () => {
    const guestIds = [...selectedIds];
    if (guestIds.length === 0) return;
    try {
      const result = await mutation.mutateAsync({ eventId, guestIds });
      const data = result?.data || result || {};
      const total = data.reminded ?? guestIds.length;

      // Backend found nothing eligible (e.g. all responded, none unsent).
      if (total === 0) {
        const code = data.code;
        if (code === "SEND_INVITES_FIRST") {
          toast.error(t("singleEvent.bulkActions.sendInvitesFirst"));
        } else if (code === "NO_NEW_GUESTS") {
          toast.info(
            t("singleEvent.sendActions.noNewGuestsToast", "No new guests to send invitations to.")
          );
        } else {
          toast.info(
            t(
              action === "extraReminder"
                ? "singleEvent.bulkActions.noConfirmedNow"
                : "singleEvent.bulkActions.noEligibleNow"
            )
          );
        }
        onClose();
        return;
      }

      const successful = data.successful ?? guestIds.length;
      toast.success(
        t("singleEvent.bulkActions.sentResult", {
          defaultValue: "{{successful}}/{{total}} sent",
          successful,
          total,
        })
      );
      onClose();
    } catch (error) {
      const code = error?.response?.data?.code;
      const status = error?.response?.status;
      if (code === "INSUFFICIENT_INVITES") {
        toast.error(t("singleEvent.bulkActions.insufficientInvites"));
      } else if (code === "NO_REMINDER_TEMPLATE") {
        toast.error(t("singleEvent.bulkActions.noReminderTemplate"));
      } else if (status === 403) {
        toast.error(
          t(
            "singleEvent.sendActions.expired",
            "This event's plan has expired or sending is no longer allowed."
          )
        );
      } else {
        handleError(error, t, { fallbackMessage: "singleEvent.bulkActions.error" });
      }
    }
  };

  return (
    <PopupWrapper isOpen={isOpen} onClose={isPending ? () => {} : onClose}>
      <div className={styles.container}>
        <h3 className={styles.title}>{title}</h3>

        {audience.length === 0 ? (
          <p className={styles.empty}>
            {t("singleEvent.sendActions.popup.empty", "No guests match this action.")}
          </p>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.checkCol}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label={t("singleEvent.sendActions.popup.selectAll", "Select all")}
                      />
                    </th>
                    <th>{t("singleEvent.sendActions.popup.colName", "Guest")}</th>
                    <th>{t("singleEvent.sendActions.popup.colPhone", "Phone")}</th>
                    <th>{t("singleEvent.sendActions.popup.colStatus", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {audience.map((g) => (
                    <tr
                      key={g.id}
                      className={styles.row}
                      onClick={() => toggleOne(g.id)}
                    >
                      <td className={styles.checkCol}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(g.id)}
                          onChange={() => toggleOne(g.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td>{g.name || "-"}</td>
                      <td dir="ltr">{g.phone || "-"}</td>
                      <td>{renderStatusBadge(g.status || "invited", t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className={styles.counter}>{counterText}</p>
            <p className={styles.cost}>{costText}</p>
            {overQuota && (
              <p className={styles.warning}>
                {t("singleEvent.bulkActions.insufficientInvites")}
              </p>
            )}
          </>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isPending}
          >
            {t("common.cancel", "Cancel")}
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={handleSend}
            disabled={!canSend}
          >
            {isPending
              ? t("common.sending", "Sending...")
              : t("common.send", "Send")}
          </button>
        </div>
      </div>
    </PopupWrapper>
  );
}
