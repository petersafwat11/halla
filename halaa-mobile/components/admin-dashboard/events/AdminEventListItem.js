import React from "react";
import { Alert } from "react-native";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import { useUpdateAdminEventStatus, useDeleteAdminEvent } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { formatDate, formatCount } from "@halaa/shared/utils/locale";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { colors } from "../../../styles/tokens";
import { getStatusVisual } from "../../../constants/statusColors";
import AdminListItem from "../common/AdminListItem";

const AdminEventListItem = ({ event, onPress, selected = false, onSelect }) => {
  const { t, currentLanguage } = useTranslation("admin");
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = canEditPage(role, PAGES.EVENTS);
  const canDelete = canDeleteOnPage(role, PAGES.EVENTS);
  const toast = useToast();
  const updateStatus = useUpdateAdminEventStatus();
  const deleteEvent = useDeleteAdminEvent();

  const eventId = event.id || event._id;
  const statusKey = (event.status || "").toLowerCase();

  // Host names and event titles are arbitrary backend content.
  const hostName =
    event.host?.name ||
    event.host?.username ||
    event.hostName ||
    t("common.unknown");
  const eventTitle = event.title || "—";
  const totalGuests = event.guestCount ?? event.guestListLength ?? event.totalGuests ?? 0;
  const confirmedGuests = event.confirmedCount ?? event.confirmedGuests ?? 0;

  const isCancelled = statusKey === "cancelled";
  const isActionable = canEdit && (statusKey === "live" || statusKey === "scheduled" || statusKey === "pending_scheduling" || statusKey === "published" || isCancelled);

  const avatarColor = getStatusVisual(event.status).fg;

  const handleToggleStatus = () => {
    const newStatus = isCancelled ? "scheduled" : "cancelled";
    const actionLabel = isCancelled
      ? t("events.details.activate")
      : t("events.details.suspend");
    const confirmMessage = isCancelled
      ? t("events.details.activateConfirmMessage", {
          title: eventTitle,
        })
      : t("events.details.suspendConfirmMessage", {
          title: eventTitle,
        });
    Alert.alert(actionLabel, confirmMessage, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: actionLabel,
        style: isCancelled ? "default" : "destructive",
        onPress: async () => {
          try {
            await updateStatus.mutateAsync({ eventId, status: newStatus });
            toast.success(t("common.success"));
          } catch {
            toast.error(t("common.error"));
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      t("common.deleteConfirmTitle"),
      t("events.details.deleteConfirmBody", {
        title: eventTitle,
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEvent.mutateAsync(eventId);
              toast.success(t("common.success"));
            } catch {
              toast.error(t("common.error"));
            }
          },
        },
      ],
    );
  };

  const actions = [
    isActionable && {
      key: "status",
      label: isCancelled
        ? t("events.details.activate")
        : t("events.details.suspend"),
      icon: isCancelled ? "checkmark-circle-outline" : "pause-circle-outline",
      color: isCancelled ? colors.success[500] : colors.warning[600],
      onPress: handleToggleStatus,
      isPending: updateStatus.isPending,
    },
    canDelete && {
      key: "delete",
      label: t("common.delete"),
      icon: "trash-outline",
      color: colors.error[500],
      onPress: handleDelete,
      isPending: deleteEvent.isPending,
    },
  ].filter(Boolean);

  return (
    <AdminListItem
      title={eventTitle}
      subtitle={hostName}
      avatarColor={avatarColor}
      status={event.status}
      details={[
        // Locale-formatted date token inside a logical icon+text row.
        {
          icon: "calendar-outline",
          text: isolateLtr(formatDate(event.date, currentLanguage)),
          adaptive: true,
        },
        {
          icon: "people-outline",
          text: t("events.details.guestsCount", {
            count: formatCount(totalGuests, currentLanguage),
          }),
          color: colors.primary[500],
        },
        {
          icon: "checkmark-circle-outline",
          text: t("events.details.confirmedCount", {
            count: formatCount(confirmedGuests, currentLanguage),
          }),
          color: colors.success[500],
        },
      ]}
      actions={actions}
      selected={selected}
      onSelect={onSelect}
      onPress={onPress}
    />
  );
};

export default AdminEventListItem;
