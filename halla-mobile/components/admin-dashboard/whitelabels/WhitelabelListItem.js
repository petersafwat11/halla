import React from "react";
import { Alert } from "react-native";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import { useUpdateWhitelabelStatus, useDeleteWhitelabel } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { colors } from "../../../styles/tokens";
import AdminListItem from "../common/AdminListItem";

const SUB_STATUS_COLORS = {
  active: colors.success[500],
  expired: colors.error[500],
  cancelled: colors.natural[350],
};

export default function WhitelabelListItem({
  whitelabel,
  onPress,
  onManageSub,
  selected = false,
  onSelect,
}) {
  const { t } = useTranslation("admin");
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = canEditPage(role, PAGES.WHITELABELS);
  const canDelete = canDeleteOnPage(role, PAGES.WHITELABELS);
  const toast = useToast();
  const updateStatus = useUpdateWhitelabelStatus();
  const deleteWL = useDeleteWhitelabel();

  const wlId = whitelabel?._id || whitelabel?.id;
  const status = whitelabel?.status || "pending";

  const planCode =
    whitelabel?.subscription?.planId?.code || whitelabel?.subscription?.planCode;
  const planName =
    whitelabel?.subscription?.planId?.nameEn || planCode || null;
  const subStatus = whitelabel?.subscription?.status;
  const phone = whitelabel?.phoneNumber || whitelabel?.phone || null;
  const createdAt = whitelabel?.createdAt || whitelabel?.created_at || null;
  const joinedDate = createdAt ? new Date(createdAt).toLocaleDateString() : null;

  const isActive = status === "active";
  const isSuspended = status === "suspended";

  const handleToggleStatus = () => {
    const newStatus = isActive ? "suspended" : "active";
    const actionKey = isActive ? "whitelabels.actions.suspend" : "whitelabels.actions.activate";
    const actionLabel = t(actionKey);
    const name = whitelabel?.name || whitelabel?.username || "—";
    Alert.alert(actionLabel, `${actionLabel} "${name}"?`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: actionLabel,
        style: isActive ? "destructive" : "default",
        onPress: async () => {
          try {
            await updateStatus.mutateAsync({ whitelabelId: wlId, status: newStatus });
            toast.success(t("common.success"));
          } catch {
            toast.error(t("common.error"));
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    const name = whitelabel?.name || whitelabel?.username || "—";
    Alert.alert(
      t("common.deleteConfirmTitle"),
      `${t("common.delete")} "${name}"? ${t("common.deleteConfirmMessage")}`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWL.mutateAsync(wlId);
              toast.success(t("common.success"));
            } catch {
              toast.error(t("common.error"));
            }
          },
        },
      ],
    );
  };

  const showStatusToggle = canEdit && (isActive || isSuspended);
  const showManageSub = canEdit && !!onManageSub;

  const actions = [
    showStatusToggle && {
      key: "status",
      label: isActive ? t("whitelabels.actions.suspend") : t("whitelabels.actions.activate"),
      icon: isActive ? "ban-outline" : "checkmark-circle-outline",
      color: isActive ? colors.warning[500] : colors.success[500],
      onPress: handleToggleStatus,
      isPending: updateStatus.isPending,
    },
    showManageSub && {
      key: "plan",
      label: t("common.managePlan"),
      icon: "card-outline",
      color: colors.primary[500],
      onPress: () => onManageSub(whitelabel),
    },
    canDelete && {
      key: "delete",
      label: t("common.delete"),
      icon: "trash-outline",
      color: colors.error[500],
      onPress: handleDelete,
      isPending: deleteWL.isPending,
    },
  ].filter(Boolean);

  const chips = [
    planName && {
      label: planName,
      color: colors.primary[500],
      bg: "#fdf5ec",
      icon: "star-outline",
    },
    subStatus && {
      label: t(`whitelabels.status.${subStatus}`, { defaultValue: subStatus }),
      color: SUB_STATUS_COLORS[subStatus] || colors.natural[400],
      bg: `${SUB_STATUS_COLORS[subStatus] || colors.natural[400]}18`,
    },
  ].filter(Boolean);

  const details = [
    phone && { icon: "call-outline", text: phone },
    joinedDate && { icon: "calendar-outline", text: `${t("common.joined")}: ${joinedDate}` },
  ].filter(Boolean);

  return (
    <AdminListItem
      title={whitelabel?.name || whitelabel?.username || "—"}
      subtitle={whitelabel?.email}
      subtitleAlt={whitelabel?.domain}
      avatarColor={colors.primary[500]}
      status={status}
      chips={chips}
      details={details}
      actions={actions}
      selected={selected}
      onSelect={onSelect}
      onPress={onPress}
    />
  );
}
