import React from "react";
import { Alert } from "react-native";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import { useUpdateBusinessStatus, useDeleteBusiness } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { colors } from "../../../styles/tokens";
import { getLocalized } from "@halaa/shared/utils/locale";
import AdminListItem from "../common/AdminListItem";

const BusinessListItem = ({ business, onPress, onManagePlan, selected = false, onSelect }) => {
  const { id, _id, name, email, phoneNumber, subscription, status, createdAt } = business;
  const businessId = id || _id;

  const { t, i18n } = useTranslation("admin");
  const role = useAuthStore((state) => state.user?.role);
  const canEdit = canEditPage(role, PAGES.BUSINESSES);
  const canDelete = canDeleteOnPage(role, PAGES.BUSINESSES);

  const updateStatus = useUpdateBusinessStatus();
  const deleteBusiness = useDeleteBusiness();
  const toast = useToast();

  const handleStatusChange = () => {
    const newStatus = status === "active" ? "suspended" : "active";
    const isSuspending = newStatus === "suspended";
    const actionLabel = isSuspending ? t("common.suspend") : t("common.activate");
    Alert.alert(actionLabel, `${actionLabel} "${name || ""}"?`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: actionLabel,
        style: isSuspending ? "destructive" : "default",
        onPress: async () => {
          try {
            await updateStatus.mutateAsync({ businessId, status: newStatus });
            toast.success(t("businesses.actions.statusUpdated"));
          } catch {
            toast.error(t("businesses.actions.statusUpdateFailed"));
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      t("businesses.deleteConfirm.title"),
      t("businesses.deleteConfirm.message"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBusiness.mutateAsync(businessId);
              toast.success(t("businesses.actions.deleted"));
            } catch {
              toast.error(t("businesses.actions.deleteFailed"));
            }
          },
        },
      ],
    );
  };

  const formattedDate = createdAt ? new Date(createdAt).toLocaleDateString() : null;
  const planName =
    getLocalized(subscription?.planId || {}, "name", i18n.language) ||
    subscription?.planId?.code ||
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
    canEdit && onManagePlan && {
      key: "plan",
      label: t("businesses.actions.managePlan"),
      icon: "card-outline",
      color: colors.primary[500],
      onPress: onManagePlan,
    },
    canDelete && {
      key: "delete",
      label: t("common.delete"),
      icon: "trash-outline",
      color: colors.error[500],
      onPress: handleDelete,
      isPending: deleteBusiness.isPending,
    },
  ].filter(Boolean);

  return (
    <AdminListItem
      title={name || t("businesses.labels.unnamed")}
      subtitle={email}
      subtitleAlt={phoneNumber ? `‪${phoneNumber}‬` : null}
      avatarColor={colors.primary[500]}
      status={status}
      details={[
        { icon: "card-outline", text: planName || t("businesses.labels.noPlan") },
        {
          icon: "calendar-outline",
          text: formattedDate
            ? `${t("businesses.labels.joined")} ${formattedDate}`
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

export default BusinessListItem;
