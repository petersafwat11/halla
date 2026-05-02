import React from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import ActionButton from "../common/ActionButton";
import { spacing } from "../../../styles/tokens";

const TicketActions = ({ ticket, onAssign, onResolve, onReopen, onDelete }) => {
  if (!ticket) return null;

  const role = useAuthStore((state) => state.user?.role);
  const canEdit = canEditPage(role, PAGES.TICKETS);
  const canDelete = canDeleteOnPage(role, PAGES.TICKETS);

  const confirmDelete = () => {
    Alert.alert("Delete Ticket", "Are you sure you want to delete this ticket?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(ticket._id) },
    ]);
  };

  const isResolved = ticket.status === "resolved" || ticket.status === "closed";
  const isOpen = ticket.status === "open" || ticket.status === "in_progress";

  return (
    <View style={styles.container}>
      {canEdit && isOpen && onAssign && (
        <ActionButton label="Assign" icon="person-add-outline" variant="secondary" onPress={() => onAssign(ticket)} fullWidth />
      )}
      {canEdit && isOpen && onResolve && (
        <ActionButton label="Resolve" icon="checkmark-circle-outline" variant="primary" onPress={() => onResolve(ticket)} fullWidth />
      )}
      {canEdit && isResolved && onReopen && (
        <ActionButton label="Reopen" icon="refresh-outline" variant="secondary" onPress={() => onReopen(ticket._id)} fullWidth />
      )}
      {canDelete && (
        <ActionButton label="Delete Ticket" icon="trash-outline" variant="destructive" onPress={confirmDelete} fullWidth />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing[16], gap: spacing[12] },
});

export default TicketActions;
