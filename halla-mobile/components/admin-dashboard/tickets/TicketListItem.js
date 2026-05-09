import React from "react";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, PAGES } from "../../../utils/adminPermissions";
import { useTranslation } from "../../../localization";
import { colors } from "../../../styles/tokens";
import AdminListItem from "../common/AdminListItem";

const PRIORITY_CONFIG = {
  low:    { color: colors.success[600], bg: colors.success[50], labelKey: "tickets.priority.low" },
  medium: { color: colors.warning[600], bg: colors.warning[50], labelKey: "tickets.priority.medium" },
  high:   { color: colors.error[600], bg: colors.error[50], labelKey: "tickets.priority.high" },
  urgent: { color: colors.error[500], bg: colors.error[50], labelKey: "tickets.priority.urgent" },
};

// Priority avatar tints the circle to signal urgency immediately
const PRIORITY_AVATAR_COLOR = {
  low:    "#2A8C5B",
  medium: "#D38200",
  high:   "#C0392B",
  urgent: "#E74C3C",
};

const formatDate = (d, t) => {
  if (!d) return t("common.unknown");
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const TicketListItem = ({ ticket, onPress, onResolve, onAssign, selected = false, onSelect }) => {
  const { t } = useTranslation("admin");
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = canEditPage(role, PAGES.TICKETS);

  const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  const isResolved = ticket.status === "resolved" || ticket.status === "closed";

  const submitter =
    ticket.submittedBy?.name ||
    ticket.submittedBy?.username ||
    ticket.user?.name ||
    ticket.user?.username ||
    ticket.userName ||
    t("common.unknown");

  const assignedTo = ticket.assignedTo?.name || ticket.assignedTo?.username || null;

  const ticketNum =
    ticket.ticketNumber || ticket.id?.toString().slice(-6) || null;

  const subject =
    ticket.subject ||
    (ticket.message
      ? `${ticket.message.slice(0, 55)}${ticket.message.length > 55 ? "…" : ""}`
      : t("tickets.noSubject"));

  const avatarColor = PRIORITY_AVATAR_COLOR[ticket.priority] || colors.natural[450];

  const chips = [
    {
      label: t(priorityCfg.labelKey),
      color: priorityCfg.color,
      bg: priorityCfg.bg,
    },
    assignedTo && {
      label: assignedTo,
      color: colors.primary[600],
      bg: colors.primary[50],
      icon: "person-circle-outline",
    },
  ].filter(Boolean);

  const details = [
    ticketNum && { icon: "receipt-outline", text: `#${ticketNum}` },
    ticket.category && { icon: "folder-outline", text: ticket.category },
    { icon: "calendar-outline", text: formatDate(ticket.createdAt, t) },
  ].filter(Boolean);

  const actions = canEdit
    ? [
        {
          key: "resolve",
          label: isResolved ? t("tickets.details.reopen") : t("tickets.resolve.resolve"),
          icon: isResolved ? "refresh-circle-outline" : "checkmark-circle-outline",
          color: isResolved ? colors.warning[500] : colors.success[500],
          onPress: () => onResolve?.(ticket),
        },
        !assignedTo && !isResolved && {
          key: "assign",
          label: t("tickets.assign.assign"),
          icon: "person-add-outline",
          color: colors.primary[500],
          onPress: () => onAssign?.(ticket),
        },
      ].filter(Boolean)
    : [];

  return (
    <AdminListItem
      title={subject}
      subtitle={submitter}
      avatarColor={avatarColor}
      status={ticket.status}
      chips={chips}
      details={details}
      actions={actions}
      selected={selected}
      onSelect={onSelect}
      onPress={onPress}
    />
  );
};

export default TicketListItem;
