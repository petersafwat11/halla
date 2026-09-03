import React from "react";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, PAGES } from "../../../utils/adminPermissions";
import { useTranslation } from "../../../localization";
import { formatDate } from "@halaa/shared/utils/locale";
import { isolateAuto, isolateLtr } from "@halaa/shared/utils/bidi";
import { colors } from "../../../styles/tokens";
import { getStatusVisual } from "../../../constants/statusColors";
import AdminListItem from "../common/AdminListItem";

// Priority → i18n label key (colors come from getStatusVisual(priority)).
const PRIORITY_LABEL_KEY = {
  low:    "tickets.priority.low",
  medium: "tickets.priority.medium",
  high:   "tickets.priority.high",
  urgent: "tickets.priority.urgent",
};

const TicketListItem = ({ ticket, onPress, onResolve, onAssign, selected = false, onSelect }) => {
  const { t, currentLanguage } = useTranslation("admin");
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = canEditPage(role, PAGES.TICKETS);

  const priorityVisual = getStatusVisual(ticket.priority);
  const priorityLabelKey = PRIORITY_LABEL_KEY[ticket.priority] || PRIORITY_LABEL_KEY.medium;
  const isResolved = ticket.status === "resolved" || ticket.status === "closed";

  const submitter =
    ticket.submittedBy?.name ||
    ticket.user?.name ||
    t("common.unknown");

  const assignedTo = ticket.assignedTo?.name || null;

  const ticketNum =
    ticket.ticketNumber || ticket.id?.toString().slice(-6) || null;

  const subject =
    ticket.subject ||
    (ticket.message
      ? `${ticket.message.slice(0, 55)}${ticket.message.length > 55 ? "…" : ""}`
      : t("tickets.noSubject"));

  const avatarColor = priorityVisual.fg;

  const chips = [
    {
      label: t(priorityLabelKey),
      color: priorityVisual.fg,
      bg: priorityVisual.bg,
    },
    assignedTo && {
      // Assignee name is backend content — first-strong, not the UI locale.
      label: assignedTo,
      color: colors.primary[600],
      bg: colors.primary[50],
      icon: "person-circle-outline",
      adaptive: true,
    },
  ].filter(Boolean);

  const details = [
    ticketNum && { icon: "receipt-outline", text: isolateLtr(`#${ticketNum}`), ltr: true },
    ticket.category && { icon: "folder-outline", text: ticket.category, adaptive: true },
    { icon: "calendar-outline", text: isolateAuto(formatDate(ticket.createdAt, currentLanguage)) },
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
