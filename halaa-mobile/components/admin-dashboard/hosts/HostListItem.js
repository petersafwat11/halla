import React from "react";
import { Alert } from "react-native";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import { useUpdateHostStatus, useDeleteHost } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { formatDate } from "@halaa/shared/utils/locale";
import { isolateAuto, isolateLtr } from "@halaa/shared/utils/bidi";
import { colors } from "../../../styles/tokens";
import AdminListItem from "../common/AdminListItem";

const HostListItem = ({ host, onPress, onManageSubscription, selected = false, onSelect }) => {
  const { id, _id, name, username, email, phoneNumber, subscription, status, createdAt } = host;
  const hostId = id || _id;

  const { t, currentLanguage } = useTranslation("admin");
  const role = useAuthStore((state) => state.user?.role);
  const canEdit = canEditPage(role, PAGES.HOSTS);
  const canDelete = canDeleteOnPage(role, PAGES.HOSTS);

  const updateStatus = useUpdateHostStatus();
  const deleteHost = useDeleteHost();
  const toast = useToast();

  const handleStatusChange = () => {
    const newStatus = status === "active" ? "suspended" : "active";
    const isSuspending = newStatus === "suspended";
    // The confirmation sentence is one interpolated translation — the host
    // name is first-strong isolated so it cannot scramble the Arabic copy.
    const actionLabel = isSuspending ? t("common.suspend") : t("common.activate");
    Alert.alert(actionLabel, t("hosts.actions.statusConfirmMessage", { action: actionLabel, name: isolateAuto(name || "") }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: actionLabel,
        style: isSuspending ? "destructive" : "default",
        onPress: async () => {
          try {
            await updateStatus.mutateAsync({ hostId, status: newStatus });
            toast.success(t("hosts.actions.statusUpdated"));
          } catch {
            toast.error(t("hosts.actions.statusUpdateFailed"));
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      t("hosts.deleteConfirm.title"),
      t("hosts.deleteConfirm.message"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteHost.mutateAsync(hostId);
              toast.success(t("hosts.actions.deleted"));
            } catch {
              toast.error(t("hosts.actions.deleteFailed"));
            }
          },
        },
      ],
    );
  };

  const formattedDate = createdAt ? formatDate(createdAt, currentLanguage) : null;
  const plan = subscription?.planId;
  const planName =
    (currentLanguage === "ar" ? plan?.nameAr : plan?.nameEn) ||
    plan?.name ||
    plan?.planType ||
    subscription?.planType;

  const actions = [
    canEdit && {
      key: "status",
      label: status === "suspended" ? t("common.activate") : t("common.suspend"),
      icon: status === "suspended" ? "checkmark-circle-outline" : "ban-outline",
      color: status === "suspended" ? colors.success[500] : colors.warning[500],
      onPress: handleStatusChange,
      isPending: updateStatus.isPending,
    },
    canEdit && onManageSubscription && {
      key: "plan",
      label: t("hosts.actions.managePlan"),
      icon: "card-outline",
      color: colors.primary[500],
      onPress: onManageSubscription,
    },
    canDelete && {
      key: "delete",
      label: t("common.delete"),
      icon: "trash-outline",
      color: colors.error[500],
      onPress: handleDelete,
      isPending: deleteHost.isPending,
    },
  ].filter(Boolean);

  return (
    <AdminListItem
      title={name || username || email || t("hosts.labels.unnamed")}
      subtitle={email}
      subtitleAlt={phoneNumber ? isolateLtr(phoneNumber) : null}
      avatarColor={colors.primary[500]}
      status={status}
      details={[
        {
          icon: "card-outline",
          text: planName || t("hosts.labels.noPlan"),
          // Plan display names are bilingual backend content.
          adaptive: Boolean(planName),
        },
        {
          icon: "calendar-outline",
          text: formattedDate
            ? t("hosts.labels.joinedDate", { date: formattedDate })
            : t("common.unknown"),
        },
      ]}
      actions={actions}
      selected={selected}
      onSelect={onSelect}
      onPress={onPress}
    />
  );
};

export default HostListItem;
