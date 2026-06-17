import React from "react";
import { Alert } from "react-native";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import { useUpdateAdminEventStatus, useDeleteAdminEvent } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { colors } from "../../../styles/tokens";
import AdminListItem from "../common/AdminListItem";

// Avatar colors keyed by event status — gives immediate visual status signal
const STATUS_AVATAR_COLOR = {
  scheduled: "#3498DB",
  live: colors.success[500],
  completed: colors.natural[450],
  pending_scheduling: colors.primary[500],
  cancelled: colors.error[500],
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const AdminEventListItem = ({ event, onPress, selected = false, onSelect }) => {
  const { t } = useTranslation("admin");
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = canEditPage(role, PAGES.EVENTS);
  const canDelete = canDeleteOnPage(role, PAGES.EVENTS);
  const toast = useToast();
  const updateStatus = useUpdateAdminEventStatus();
  const deleteEvent = useDeleteAdminEvent();

  const eventId = event.id || event._id;
  const statusKey = (event.status || "").toLowerCase();

  const hostName =
    event.host?.name ||
    event.host?.username ||
    event.hostName ||
    t("common.unknown");
  const totalGuests = event.guestCount ?? event.guestListLength ?? event.totalGuests ?? 0;
  const confirmedGuests = event.confirmedCount ?? event.confirmedGuests ?? 0;

  const isCancellable = statusKey === "live" || statusKey === "scheduled";
  const isActivatable = statusKey === "cancelled" || statusKey === "suspended";
  const isSuspendable = canEdit && (statusKey === "scheduled" || statusKey === "pending_scheduling");
  const showStatusBtn = canEdit && (isCancellable || isActivatable);

  const avatarColor = STATUS_AVATAR_COLOR[statusKey] || colors.natural[450];

  const handleSuspend = () => {
    Alert.alert(
      t("events.details.suspend"),
      `${t("events.details.suspend")} "${event.title || "—"}"?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("events.details.suspend"),
          style: "destructive",
          onPress: async () => {
            try {
              await updateStatus.mutateAsync({ eventId, status: "suspended" });
              toast.success(t("common.success"));
            } catch {
              toast.error(t("common.error"));
            }
          },
        },
      ],
    );
  };

  const handleToggleStatus = () => {
    const newStatus = isCancellable ? "cancelled" : "scheduled";
    const actionLabel = isCancellable
      ? t("events.details.cancel")
      : t("events.details.activate");
    Alert.alert(actionLabel, `${actionLabel} "${event.title || "—"}"?`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: actionLabel,
        style: isCancellable ? "destructive" : "default",
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
      `${t("common.delete")} "${event.title || "—"}"? ${t("common.deleteConfirmMessage")}`,
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
    isSuspendable && {
      key: "suspend",
      label: t("events.details.suspend"),
      icon: "pause-circle-outline",
      color: colors.warning[600],
      onPress: handleSuspend,
      isPending: updateStatus.isPending,
    },
    showStatusBtn && {
      key: "status",
      label: isCancellable ? t("events.details.cancel") : t("events.details.activate"),
      icon: isCancellable ? "ban-outline" : "checkmark-circle-outline",
      color: isCancellable ? colors.warning[500] : colors.success[500],
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
      title={event.title || "—"}
      subtitle={hostName}
      avatarColor={avatarColor}
      status={event.status}
      details={[
        { icon: "calendar-outline", text: formatDate(event.date) },
        {
          icon: "people-outline",
          text: `${totalGuests} ${t("common.guests")}`,
          color: colors.primary[500],
        },
        {
          icon: "checkmark-circle-outline",
          text: `${confirmedGuests} ${t("common.confirmed")}`,
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
