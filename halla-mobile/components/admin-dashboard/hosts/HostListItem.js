import React from "react";
import { Alert } from "react-native";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import { useUpdateHostStatus, useDeleteHost } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { colors } from "../../../styles/tokens";
import AdminListItem from "../common/AdminListItem";

const HostListItem = ({ host, onPress, onManageSubscription, selected = false, onSelect }) => {
  const { id, _id, name, email, phoneNumber, subscription, status, createdAt } = host;
  const hostId = id || _id;

  const { t } = useTranslation("admin");
  const role = useAuthStore((state) => state.user?.role);
  const canEdit = canEditPage(role, PAGES.HOSTS);
  const canDelete = canDeleteOnPage(role, PAGES.HOSTS);

  const updateStatus = useUpdateHostStatus();
  const deleteHost = useDeleteHost();
  const toast = useToast();

  const handleStatusChange = async () => {
    const newStatus = status === "active" ? "suspended" : "active";
    try {
      await updateStatus.mutateAsync({ hostId, status: newStatus });
      toast.success(t("hosts.actions.statusUpdated"));
    } catch {
      toast.error(t("hosts.actions.statusUpdateFailed"));
    }
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

  const formattedDate = createdAt ? new Date(createdAt).toLocaleDateString() : null;
  const planName =
    subscription?.planId?.nameEn || subscription?.planId?.name || subscription?.planType;

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
      title={name || t("hosts.labels.unnamed")}
      subtitle={email}
      subtitleAlt={phoneNumber}
      avatarColor={colors.primary[500]}
      status={status}
      details={[
        { icon: "card-outline", text: planName || t("hosts.labels.noPlan") },
        {
          icon: "calendar-outline",
          text: formattedDate
            ? `${t("hosts.labels.joined")} ${formattedDate}`
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
