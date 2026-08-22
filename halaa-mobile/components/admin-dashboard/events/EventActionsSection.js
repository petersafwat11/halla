import React from "react";
import { EventActionRow } from "./EventActionRow";

const EventActionsSection = ({ event, canEdit, canDelete, updatePending, deletePending, onStatusChange, onDelete, t, SectionCard }) => {
  const status = event.status;
  const actionRows = [];

  if (canEdit) {
    if (status === "pending_scheduling") {
      actionRows.push(
        <EventActionRow
          key="publish"
          icon="megaphone-outline"
          iconBg="#EAF4EF"
          iconColor="#2A8C5B"
          label={t("eventDetails.publishEvent")}
          sublabel={t("eventDetails.publishEventSublabel")}
          loading={updatePending}
          onPress={() => onStatusChange("scheduled", "eventDetails.publishConfirmTitle", "eventDetails.publishConfirmMessage", "eventDetails.publish")}
        />
      );
    }
    if (status === "scheduled" || status === "live") {
      actionRows.push(
        <EventActionRow
          key="end"
          icon="stop-circle-outline"
          iconBg="#FBF3E6"
          iconColor="#D38200"
          label={t("eventDetails.endEvent")}
          sublabel={t("eventDetails.endEventSublabel")}
          loading={updatePending}
          onPress={() => onStatusChange("completed", "eventDetails.endConfirmTitle", "eventDetails.endConfirmMessage", "eventDetails.end")}
        />
      );
    }
    if (status !== "cancelled") {
      actionRows.push(
        <EventActionRow
          key="cancel"
          icon="close-circle-outline"
          iconBg="#F9EBEA"
          iconColor="#C0392B"
          label={t("eventDetails.cancelEvent")}
          sublabel={t("eventDetails.cancelEventSublabel")}
          loading={updatePending}
          destructive
          onPress={() => onStatusChange("cancelled", "eventDetails.cancelConfirmTitle", "eventDetails.cancelConfirmMessage", "eventDetails.cancelEvent", true)}
        />
      );
    }
    if (status === "cancelled" || status === "completed") {
      actionRows.push(
        <EventActionRow
          key="reschedule"
          icon="refresh-outline"
          iconBg="#E8F4FD"
          iconColor="#3498DB"
          label={t("eventDetails.rescheduleEvent")}
          sublabel={t("eventDetails.rescheduleEventSublabel")}
          loading={updatePending}
          onPress={() => onStatusChange("scheduled", "eventDetails.rescheduleConfirmTitle", "eventDetails.rescheduleConfirmMessage", "eventDetails.reschedule")}
        />
      );
    }
  }
  if (canDelete) {
    actionRows.push(
      <EventActionRow
        key="delete"
        icon="trash-outline"
        iconBg="#F9EBEA"
        iconColor="#C0392B"
        label={t("eventDetails.deleteEvent")}
        sublabel={t("eventDetails.deleteEventSublabel")}
        loading={deletePending}
        destructive
        last
        onPress={onDelete}
      />
    );
  }

  if (actionRows.length === 0) return null;

  return (
    <SectionCard title={t("eventDetails.adminActions")} icon="shield-outline">
      {actionRows.map((row, idx) =>
        React.cloneElement(row, { last: idx === actionRows.length - 1 })
      )}
    </SectionCard>
  );
};

export { EventActionsSection };
export default EventActionsSection;
