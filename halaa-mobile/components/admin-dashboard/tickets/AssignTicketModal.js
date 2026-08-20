import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import PropTypes from "prop-types";
import { ActionButton } from "../common";
import ModeratorList from "./ModeratorList";
import {
  colors,
  spacing,
  textStyles,
  borderRadius,
  backgrounds,
} from "../../../styles/tokens";
import { useTicketAssignees, useAssignTicket } from "../../../hooks";
import { useTranslation } from "../../../localization";

/**
 * Modal for assigning a ticket. Fetches assignees (admins + moderators with
 * `manage_tickets`) via useTicketAssignees and submits via useAssignTicket.
 */
const AssignTicketModal = ({ visible, onClose, ticket, onSave }) => {
  const { t } = useTranslation("admin");
  const [selectedModeratorId, setSelectedModeratorId] = useState("");
  const [note, setNote] = useState("");

  const assignTicket = useAssignTicket();
  const { data: assigneesData, isLoading: fetchingModerators } = useTicketAssignees();

  const moderators = assigneesData?.data || [];

  // Initialize state when modal opens or closes
  useEffect(() => {
    if (visible && ticket) {
      const currentAssigneeId =
        ticket.assignedTo?.id ||
        ticket.assignedTo?._id ||
        (typeof ticket.assignedTo === "string" ? ticket.assignedTo : "") ||
        ticket.assignedModerator?.id ||
        ticket.assignedModerator?._id ||
        "";
      setSelectedModeratorId(currentAssigneeId);
      setNote("");
    } else if (!visible) {
      setSelectedModeratorId("");
      setNote("");
    }
  }, [visible, ticket]);

  /**
   * Handle save button press
   */
  const handleSave = async () => {
    if (!selectedModeratorId) {
      Alert.alert(t("common.error"), t("tickets.assign.validationSelectModerator"));
      return;
    }

    try {
      await assignTicket.mutateAsync({
        ticketId: ticket.id || ticket._id,
        assigneeId: selectedModeratorId,
        ...(note.trim() && { notes: note.trim() }),
      });
      onSave();
      handleClose();
    } catch (error) {
      Alert.alert(t("common.error"), error?.message || t("common.error"));
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    setSelectedModeratorId("");
    setNote("");
    onClose();
  };

  const isPending = assignTicket.isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t("tickets.assign.title")}</Text>
            <Text style={styles.subtitle}>
              Ticket #{ticket?.id || ticket?._id} - {ticket?.subject}
            </Text>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {fetchingModerators ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
                <Text style={styles.loadingText}>{t("common.loading")}</Text>
              </View>
            ) : (
              <>
                {/* Moderator Selection - Radio list */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>{t("tickets.assign.selectModerator")} *</Text>
                  <ModeratorList
                    moderators={moderators}
                    selectedModeratorId={selectedModeratorId}
                    onSelect={setSelectedModeratorId}
                  />
                </View>

                {/* Optional Note */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>{t("tickets.assign.notes")}</Text>
                  <View style={styles.textAreaContainer}>
                    <TextInput
                      style={styles.textArea}
                      onChangeText={setNote}
                      value={note}
                      placeholder={t("tickets.assign.notesPlaceholder")}
                      placeholderTextColor={colors.natural[400]}
                      multiline
                      numberOfLines={4}
                      maxLength={2000}
                      textAlignVertical="top"
                    />
                  </View>
                  <Text style={styles.helperText}>
                    {t("tickets.assign.notesHelper")}
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <ActionButton
              label={t("common.cancel")}
              onPress={handleClose}
              variant="outline"
              style={styles.actionButton}
              disabled={isPending}
            />
            <ActionButton
              label={isPending ? t("common.loading") : t("tickets.assign.assign")}
              onPress={handleSave}
              variant="primary"
              style={styles.actionButton}
              disabled={isPending || fetchingModerators || !selectedModeratorId}
              loading={isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

AssignTicketModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  ticket: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    _id: PropTypes.string,
    subject: PropTypes.string,
  }),
  onSave: PropTypes.func,
};

AssignTicketModal.defaultProps = {
  ticket: null,
  onSave: () => {},
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: backgrounds.card[1],
    borderTopLeftRadius: borderRadius[20],
    borderTopRightRadius: borderRadius[20],
    maxHeight: "80%",
    paddingBottom: spacing[24],
  },
  header: {
    padding: spacing[20],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
  },
  title: {
    ...textStyles.titleLarge,
    color: colors.natural[900],
    marginBottom: spacing[4],
  },
  subtitle: {
    ...textStyles.bodyMedium,
    color: colors.natural[500],
  },
  scrollContent: {
    padding: spacing[20],
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[40],
  },
  loadingText: {
    ...textStyles.bodyMedium,
    color: colors.natural[500],
    marginTop: spacing[12],
  },
  fieldContainer: {
    marginBottom: spacing[20],
  },
  label: {
    ...textStyles.labelLarge,
    color: colors.natural[900],
    marginBottom: spacing[8],
  },
  emptyText: {
    ...textStyles.bodySmall,
    color: colors.natural[400],
  },
  textAreaContainer: {
    backgroundColor: backgrounds.artboard,
    borderRadius: borderRadius[8],
    borderWidth: 1,
    borderColor: colors.natural[300],
    padding: spacing[12],
    minHeight: 100,
  },
  textArea: {
    ...textStyles.bodyMedium,
    color: colors.natural[900],
    minHeight: 80,
    textAlignVertical: "top",
  },
  helperText: {
    ...textStyles.labelSmall,
    color: colors.natural[500],
    marginTop: spacing[4],
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing[20],
    paddingTop: spacing[16],
    borderTopWidth: 1,
    borderTopColor: colors.natural[200],
  },
  actionButton: {
    flex: 1,
    marginHorizontal: spacing[8],
  },
});

export default AssignTicketModal;
