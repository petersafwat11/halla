import React from "react";
import { useTranslation } from "../../../localization";
import { formatDate } from "@halaa/shared/utils/locale";
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
    username,
    email,
    phoneNumber,
    phone: phoneField,
    role,
    status,
    createdAt,
    created_at,
  } = moderator;

  const displayName = name || username || t("common.unknown");
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
    phone && { icon: "call-outline", text: phone },
    joinedDate && {
      icon: "calendar-outline",
      text: `${t("common.joined")}: ${joinedDate}`,
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
