import React from "react";
import { Alert } from "react-native";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import { useUpdateVendorStatus, useDeleteVendor } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { formatDate } from "@halaa/shared/utils/locale";
import { colors } from "../../../styles/tokens";
import AdminListItem from "../common/AdminListItem";

const VendorListItem = ({ vendor, onPress, onRate, selected = false, onSelect }) => {
  const { t, currentLanguage } = useTranslation("admin");
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = canEditPage(role, PAGES.VENDORS);
  const canDelete = canDeleteOnPage(role, PAGES.VENDORS);
  const toast = useToast();
  const updateStatus = useUpdateVendorStatus();
  const deleteVendor = useDeleteVendor();

  const vendorId = vendor?._id || vendor?.id;
  // Backend returns two status fields:
  //   vendor.status      → user account status: active | inactive | suspended | pending
  //   vendor.vendorStatus → vendor workflow status: approved | rejected | pending | suspended
  // Use vendorStatus for all action logic and the status badge.
  const vendorStatus = vendor?.vendorStatus || vendor?.status || "pending";

  const displayName =
    vendor?.brandName || vendor?.name || vendor?.username || t("common.unknown");
  const email = vendor?.email || vendor?.vendorData?.email || "—";
  const phone =
    vendor?.phoneNumber ||
    vendor?.phone ||
    vendor?.vendorData?.phoneNumber ||
    vendor?.vendorData?.phone ||
    null;

  // Backend returns serviceCategories (not categories / vendorData.categories)
  const categories = vendor?.serviceCategories || [];
  const firstCategory =
    typeof categories[0] === "string"
      ? categories[0]
      : categories[0]?.nameEn || categories[0]?.name || null;
  const extraCount = categories.length > 1 ? categories.length - 1 : 0;

  const createdAt = vendor?.createdAt || vendor?.created_at || null;
  const joinedDate = createdAt ? formatDate(createdAt, currentLanguage) : null;

  // Backend returns rating (not averageRating)
  const rating = vendor?.rating;
  const ratingStr =
    rating != null ? `${Number(rating).toFixed(1)} / 5` : "0.0 / 5";

  const isPending_status = vendorStatus === "pending";
  const isRejected = vendorStatus === "rejected";
  const isApproved = vendorStatus === "approved";
  const isSuspended = vendorStatus === "suspended";

  const handleApprove = () => {
    Alert.alert(t("vendors.details.approve"), `${t("vendors.details.approve")} "${displayName}"?`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.approve"),
        onPress: async () => {
          try {
            await updateStatus.mutateAsync({ vendorId, status: "approved" });
            toast.success(t("common.success"));
          } catch {
            toast.error(t("common.error"));
          }
        },
      },
    ]);
  };

  const handleReject = () => {
    Alert.alert(t("vendors.details.reject"), `${t("vendors.details.reject")} "${displayName}"?`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.reject"),
        style: "destructive",
        onPress: async () => {
          try {
            await updateStatus.mutateAsync({ vendorId, status: "rejected" });
            toast.success(t("common.success"));
          } catch {
            toast.error(t("common.error"));
          }
        },
      },
    ]);
  };

  const handleToggleSuspend = () => {
    const newStatus = isSuspended ? "approved" : "suspended";
    const actionLabel = isSuspended ? t("vendors.details.activate") : t("vendors.details.suspend");
    Alert.alert(actionLabel, `${actionLabel} "${displayName}"?`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: actionLabel,
        style: isSuspended ? "default" : "destructive",
        onPress: async () => {
          try {
            await updateStatus.mutateAsync({ vendorId, status: newStatus }); // status here is the new value to send, not the display field
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
      `${t("common.delete")} "${displayName}"? ${t("common.deleteConfirmMessage")}`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVendor.mutateAsync(vendorId);
              toast.success(t("common.success"));
            } catch {
              toast.error(t("common.error"));
            }
          },
        },
      ],
    );
  };

  const showApprove = canEdit && (isPending_status || isRejected);
  const showReject = canEdit && isPending_status;
  const showSuspend = canEdit && (isApproved || isSuspended);
  const showRate = canEdit && isApproved && !!onRate;

  const actions = [
    showApprove && {
      key: "approve",
      label: t("common.approve"),
      icon: "checkmark-circle-outline",
      color: colors.success[500],
      onPress: handleApprove,
      isPending: updateStatus.isPending,
    },
    showReject && {
      key: "reject",
      label: t("common.reject"),
      icon: "close-circle-outline",
      color: colors.error[500],
      onPress: handleReject,
    },
    showSuspend && {
      key: "suspend",
      label: isSuspended ? t("vendors.details.activate") : t("vendors.details.suspend"),
      icon: isSuspended ? "checkmark-circle-outline" : "ban-outline",
      color: isSuspended ? colors.success[500] : colors.warning[500],
      onPress: handleToggleSuspend,
      isPending: updateStatus.isPending,
    },
    showRate && {
      key: "rate",
      label: t("common.rate"),
      icon: "star-outline",
      color: colors.primary[500],
      onPress: () => onRate(vendor),
    },
    canDelete && {
      key: "delete",
      label: t("common.delete"),
      icon: "trash-outline",
      color: colors.error[500],
      onPress: handleDelete,
      isPending: deleteVendor.isPending,
    },
  ].filter(Boolean);

  const chips = [
    firstCategory && {
      label: extraCount > 0 ? `${firstCategory} +${extraCount}` : firstCategory,
      color: colors.natural[500],
      bg: colors.natural[150],
    },
  ].filter(Boolean);

  const details = [
    { icon: "star", text: ratingStr, color: colors.warning[500] },
    joinedDate && { icon: "calendar-outline", text: `${t("common.joined")}: ${joinedDate}` },
  ].filter(Boolean);

  return (
    <AdminListItem
      title={displayName}
      subtitle={email}
      subtitleAlt={phone ? `‪${phone}‬` : null}
      avatarColor={colors.primary[500]}
      status={vendorStatus}
      chips={chips}
      details={details}
      actions={actions}
      selected={selected}
      onSelect={onSelect}
      onPress={onPress}
    />
  );
};

export default VendorListItem;
