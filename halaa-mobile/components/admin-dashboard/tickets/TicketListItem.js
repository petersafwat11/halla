import React from "react";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, PAGES } from "../../../utils/adminPermissions";
import { useTranslation } from "../../../localization";
import { formatDate } from "@halaa/shared/utils/locale";
import { isolateAuto, isolateLtr } from "@halaa/shared/utils/bidi";
import { colors } from "../../../styles/tokens";
import AdminListItem from "../common/AdminListItem";


const TicketListItem = ({ ticket, onPress, onMedia, onResolve, onAssign, selected = false, onSelect }) => {
  const { t, currentLanguage } = useTranslation("admin");
  const { t: tTickets } = useTranslation("tickets");
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = canEditPage(role, PAGES.TICKETS);

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

  const avatarColor = colors.primary[600];

  const chips = [
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
    { icon: "folder-outline", text: tTickets(`types.${ticket.type}`) },
    ticket.message && { icon: "chatbubble-outline", text: ticket.message, adaptive: true },
    { icon: "calendar-outline", text: isolateAuto(formatDate(ticket.createdAt, currentLanguage)) },
  ].filter(Boolean);

  const actions = canEdit
    ? [
        ticket.status !== "closed" && {
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

  if (ticket.attachments?.length) actions.push({
    key: "media", label: `${t("tickets.media.view")} (${ticket.attachments.length})`,
    icon: "images-outline", color: colors.primary[600], onPress: () => onMedia?.(ticket),
  });

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
