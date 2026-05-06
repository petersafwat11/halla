import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import PropTypes from "prop-types";
import { ActionButton } from "../common";
import {
  colors,
  spacing,
  textStyles,
  borderRadius,
  backgrounds,
} from "../../../styles/tokens";
import { useResolveTicket } from "../../../hooks";
import { useTranslation } from "../../../localization";

/**
 * ResolveTicketModal Component
 *
 * Modal for resolving a ticket with a response message.
 * Includes required response field and optional internal notes.
 *
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Whether the modal is visible
 * @param {Function} props.onClose - Handler for closing the modal
 * @param {Object} props.ticket - Ticket to be resolved
 * @param {Function} props.onSave - Handler called after successful resolution
 */
const ResolveTicketModal = ({ visible, onClose, ticket, onSave }) => {
  const { t } = useTranslation("admin");
  const resolveTicket = useResolveTicket();
  const [responseMessage, setResponseMessage] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  /**
   * Validate form inputs
   */
  const validateForm = () => {
    if (!responseMessage.trim()) {
      Alert.alert(t("common.error"), t("tickets.resolve.validationMessageRequired"));
      return false;
    }

    if (responseMessage.trim().length < 10) {
      Alert.alert(
        t("common.error"),
        t("tickets.resolve.validationMessageMinLength"),
      );
      return false;
    }

    return true;
  };

  /**
   * Handle save button press
   */
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await resolveTicket.mutateAsync({
        ticketId: ticket.id || ticket._id,
        resolution: responseMessage.trim(),
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
    setResponseMessage("");
    setInternalNotes("");
    onClose();
  };

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
            <Text style={styles.title}>{t("tickets.resolve.title")}</Text>
            <Text style={styles.subtitle}>
              Ticket #{ticket?.id} - {ticket?.subject}
            </Text>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Response Message (Required) */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t("tickets.resolve.resolution")} *</Text>
              <View style={styles.textAreaContainer}>
                <TextInput
                  style={styles.textArea}
                  onChangeText={setResponseMessage}
                  value={responseMessage}
                  placeholder={t("tickets.resolve.resolutionPlaceholder")}
                  placeholderTextColor={colors.natural[400]}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>
              <Text style={styles.helperText}>
                {t("tickets.resolve.resolutionHelper")}
              </Text>
              <Text style={styles.characterCount}>
                {t("tickets.resolve.characterCount", { count: responseMessage.length })}
              </Text>
            </View>

            {/* Internal Notes (Optional) */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t("tickets.resolve.notes")}</Text>
              <View style={styles.textAreaContainer}>
                <TextInput
                  style={styles.textArea}
                  onChangeText={setInternalNotes}
                  value={internalNotes}
                  placeholder={t("tickets.resolve.notesPlaceholder")}
                  placeholderTextColor={colors.natural[400]}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              <Text style={styles.helperText}>
                {t("tickets.resolve.notesHelper")}
              </Text>
            </View>

            {/* Warning Message */}
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                {t("tickets.resolve.warningText")}
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <ActionButton
              label={t("common.cancel")}
              onPress={handleClose}
              variant="outline"
              style={styles.actionButton}
              disabled={resolveTicket.isPending}
            />
            <ActionButton
              label={resolveTicket.isPending ? t("common.loading") : t("tickets.resolve.resolve")}
              onPress={handleSave}
              variant="primary"
              style={styles.actionButton}
              disabled={resolveTicket.isPending || !responseMessage.trim()}
              loading={resolveTicket.isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

ResolveTicketModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  ticket: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    subject: PropTypes.string,
  }),
  onSave: PropTypes.func,
};

ResolveTicketModal.defaultProps = {
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
    maxHeight: "85%",
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
  fieldContainer: {
    marginBottom: spacing[20],
  },
  label: {
    ...textStyles.labelLarge,
    color: colors.natural[900],
    marginBottom: spacing[8],
  },
  textAreaContainer: {
    backgroundColor: backgrounds.artboard,
    borderRadius: borderRadius[8],
    borderWidth: 1,
    borderColor: colors.natural[300],
    padding: spacing[12],
    minHeight: 120,
  },
  textArea: {
    ...textStyles.bodyMedium,
    color: colors.natural[900],
    minHeight: 100,
  },
  helperText: {
    ...textStyles.labelSmall,
    color: colors.natural[500],
    marginTop: spacing[4],
  },
  characterCount: {
    ...textStyles.labelSmall,
    color: colors.natural[400],
    marginTop: spacing[4],
    textAlign: "right",
  },
  warningContainer: {
    backgroundColor: colors.warning[50],
    borderRadius: borderRadius[8],
    padding: spacing[12],
    borderLeftWidth: 3,
    borderLeftColor: colors.warning[500],
    marginTop: spacing[8],
  },
  warningText: {
    ...textStyles.bodySmall,
    color: colors.warning[900],
    lineHeight: 20,
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

export default ResolveTicketModal;
