import React from "react";
import { Alert } from "react-native";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import { useUpdateBusinessStatus, useDeleteBusiness } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { colors } from "../../../styles/tokens";
import { getLocalized, formatDate } from "@halaa/shared/utils/locale";
import { isolateLtr, isolateAuto } from "@halaa/shared/utils/bidi";
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
    const isSuspended = status === "suspended";
    const nextStatus = isSuspended ? "active" : "suspended";
    const actionLabel = isSuspended ? t("common.activate") : t("common.suspend");

    Alert.alert(
      t("businesses.actions.statusConfirmTitle", { action: actionLabel }),
      t("businesses.actions.statusConfirmBody", {
        action: actionLabel,
        name: isolateAuto(name),
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: actionLabel,
          style: isSuspended ? "default" : "destructive",
          onPress: async () => {
            try {
              await updateStatus.mutateAsync({ businessId, status: nextStatus });
              toast.success(t("common.success"));
            } catch {
              toast.error(t("common.error"));
            }
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      t("businesses.actions.deleteConfirmTitle"),
      t("businesses.actions.deleteConfirmBody", { name: isolateAuto(name) }),
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

  const formattedDate = createdAt ? formatDate(createdAt, i18n.language) : null;
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
      // Phone digits are intrinsically LTR — isolated via the shared BiDi
      // helper (never ad-hoc embedding marks).
      subtitleAlt={phoneNumber ? isolateLtr(phoneNumber) : null}
      avatarColor={colors.primary[500]}
      status={status}
      details={[
        {
          icon: "card-outline",
          // Plan display names are backend bilingual content — first-strong.
          // The "No plan" fallback is app copy, so adaptivity follows planName.
          text: planName || t("businesses.labels.noPlan"),
          adaptive: Boolean(planName),
        },
        {
          icon: "calendar-outline",
          text: formattedDate
            ? t("common.joinedDate", { date: formattedDate })
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
