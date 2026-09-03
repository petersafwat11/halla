import React from "react";
import { useTranslation } from "../../../localization";
import { formatDate } from "@halaa/shared/utils/locale";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { colors, backgrounds } from "../../../styles/tokens";
import AdminListItem from "../common/AdminListItem";

const ROLE_LABEL_KEYS = {
  moderator:             "moderators.roles.moderator",
  admin:                 "moderators.roles.admin",
};

const ModeratorListItem = ({
  moderator,
  onPress,
  onToggleStatus,
  onDelete,
  updatePending,
  deletePending,
  selected = false,
  onSelect,
}) => {
  const { t, currentLanguage } = useTranslation("admin");

  const {
    name,
    email,
    phoneNumber,
    phone: phoneField,
    role,
    status,
    createdAt,
    created_at,
  } = moderator;

  const displayName = name || t("common.unknown");
  const phone = phoneNumber || phoneField || null;
  const joinedDate =
    createdAt || created_at
      ? formatDate(createdAt || created_at, currentLanguage)
      : null;

  const roleLabelKey = ROLE_LABEL_KEYS[role];
  const roleLabel = roleLabelKey
    ? t(roleLabelKey)
    : role || t("moderators.roles.moderator");

  const chips = [
    {
      label: roleLabel,
      color: colors.primary[700],
      bg: backgrounds.card[5],
    },
  ];

  const details = [
    // Phone digits are intrinsically LTR — isolated, never re-ordered.
    phone && { icon: "call-outline", text: isolateLtr(phone), ltr: true },
    joinedDate && {
      icon: "calendar-outline",
      text: t("common.joinedDate", { date: joinedDate }),
    },
  ].filter(Boolean);

  const actions = [
    onToggleStatus && {
      key: "status",
      label:
        status === "active"
          ? t("moderators.actions.suspend")
          : t("moderators.actions.activate"),
      icon:
        status === "active" ? "ban-outline" : "checkmark-circle-outline",
      color:
        status === "active" ? colors.warning[500] : colors.success[500],
      onPress: () => onToggleStatus(moderator),
      isPending: updatePending,
    },
    onDelete && {
      key: "delete",
      label: t("common.delete"),
      icon: "trash-outline",
      color: colors.error[500],
      onPress: () => onDelete(moderator),
      isPending: deletePending,
    },
  ].filter(Boolean);

  return (
    <AdminListItem
      title={displayName}
      subtitle={email}
      subtitleAlt={null}
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
};

export default ModeratorListItem;
