import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  TextInput,
} from "react-native";
import PropTypes from "prop-types";
import { Ionicons } from "@expo/vector-icons";
import { ActionButton } from "../common";
import {
  colors,
  spacing,
  textStyles,
  borderRadius,
  typography,
  backgrounds,
} from "../../../styles/tokens";
import { useAdminModerators, useAssignTicket } from "../../../hooks";
import { useTranslation } from "../../../localization";

/**
 * AssignTicketModal Component
 *
 * Modal for assigning a ticket to a moderator.
 * Uses a radio-style scrollable list to select a moderator.
 * Fetches moderators via useAdminModerators hook.
 * Submits via useAssignTicket hook.
 *
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Whether the modal is visible
 * @param {Function} props.onClose - Handler for closing the modal
 * @param {Object} props.ticket - Ticket to be assigned
 * @param {Function} props.onSave - Handler called after successful assignment
 */
const AssignTicketModal = ({ visible, onClose, ticket, onSave }) => {
  const { t } = useTranslation("admin");
  const [selectedModeratorId, setSelectedModeratorId] = useState("");
  const [note, setNote] = useState("");

  const assignTicket = useAssignTicket();
  const { data: moderatorsData, isLoading: fetchingModerators } = useAdminModerators(
    { page: 1, limit: 100, status: "active" },
    { enabled: visible }
  );

  const moderators =
    moderatorsData?.data?.moderators ||
    moderatorsData?.moderators ||
    moderatorsData?.data ||
    [];

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setSelectedModeratorId("");
      setNote("");
    }
  }, [visible]);

  /**
   * Handle save button press
   */
  const handleSave = async () => {
    if (!selectedModeratorId) {
      Alert.alert("Validation Error", "Please select a moderator");
      return;
    }

    try {
      await assignTicket.mutateAsync({
        ticketId: ticket.id || ticket._id,
        assigneeId: selectedModeratorId,
      });
      onSave();
      handleClose();
    } catch (error) {
      console.error("Error assigning ticket:", error);
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
                  {moderators.length === 0 ? (
                    <View style={styles.emptyModerators}>
                      <Ionicons name="people-outline" size={28} color={colors.natural[300]} />
                      <Text style={styles.emptyText}>No active moderators available</Text>
                    </View>
                  ) : (
                    <View style={styles.moderatorList}>
                      {moderators.map((moderator) => {
                        const modId = moderator.id || moderator._id;
                        const isSelected = selectedModeratorId === modId;
                        return (
                          <TouchableOpacity
                            key={modId}
                            style={[
                              styles.moderatorItem,
                              isSelected && styles.moderatorItemSelected,
                            ]}
                            onPress={() => setSelectedModeratorId(modId)}
                            activeOpacity={0.75}
                          >
                            <View style={styles.moderatorItemLeft}>
                              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                                {isSelected && <View style={styles.radioDot} />}
                              </View>
                              <View style={styles.moderatorInfo}>
                                <Text
                                  style={[
                                    styles.moderatorName,
                                    isSelected && styles.moderatorNameSelected,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {moderator.name || moderator.username || "—"}
                                </Text>
                                {moderator.email ? (
                                  <Text style={styles.moderatorEmail} numberOfLines={1}>
                                    {moderator.email}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                            {isSelected && (
                              <Ionicons
                                name="checkmark-circle"
                                size={20}
                                color={colors.primary[500]}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Optional Note */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>{t("tickets.assign.notes")}</Text>
                  <View style={styles.textAreaContainer}>
                    <TextInput
                      style={styles.textArea}
                      onChangeText={setNote}
                      value={note}
                      placeholder="Add any notes about this assignment..."
                      placeholderTextColor={colors.natural[400]}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                  <Text style={styles.helperText}>
                    This note will be visible to the assigned moderator
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
  emptyModerators: {
    alignItems: "center",
    paddingVertical: spacing[24],
    gap: spacing[8],
  },
  emptyText: {
    ...textStyles.bodySmall,
    color: colors.natural[400],
  },
  moderatorList: {
    borderRadius: borderRadius[12],
    borderWidth: 1,
    borderColor: colors.natural[200],
    overflow: "hidden",
  },
  moderatorItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    backgroundColor: backgrounds.card[1],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[150],
  },
  moderatorItemSelected: {
    backgroundColor: `${colors.primary[500]}08`,
  },
  moderatorItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    flex: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.natural[300],
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: colors.primary[500],
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[500],
  },
  moderatorInfo: {
    flex: 1,
  },
  moderatorName: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[800],
  },
  moderatorNameSelected: {
    color: colors.primary[500],
    fontWeight: typography.fontWeight.semibold,
  },
  moderatorEmail: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
    marginTop: 2,
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
