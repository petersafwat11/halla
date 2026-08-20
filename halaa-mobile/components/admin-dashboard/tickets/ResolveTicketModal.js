import React from "react";
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
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { ticketResolutionSchema } from "@halaa/shared/schemas/tickets";

const ResolveTicketModal = ({ visible, onClose, ticket, onSave }) => {
  const { t } = useTranslation("admin");
  const { t: tTickets } = useTranslation("tickets");
  const resolveTicket = useResolveTicket();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(ticketResolutionSchema(tTickets)),
    mode: "onChange",
    defaultValues: { resolution: "" },
  });

  const resolutionValue = watch("resolution") || "";

  const handleClose = () => {
    reset({ resolution: "" });
    onClose();
  };

  const onSubmit = async ({ resolution }) => {
    try {
      await resolveTicket.mutateAsync({
        ticketId: ticket.id || ticket._id,
        resolution: resolution.trim(),
      });
      onSave?.();
      handleClose();
    } catch (error) {
      Alert.alert(t("common.error"), error?.message || t("common.error"));
    }
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
          <View style={styles.header}>
            <Text style={styles.title}>{t("tickets.resolve.title")}</Text>
            <Text style={styles.subtitle}>
              Ticket #{ticket?.id} - {ticket?.subject}
            </Text>
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t("tickets.resolve.resolution")} *</Text>
              <Controller
                control={control}
                name="resolution"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    style={[
                      styles.textAreaContainer,
                      errors.resolution && styles.textAreaContainerError,
                    ]}
                  >
                    <TextInput
                      style={styles.textArea}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      value={value}
                      placeholder={t("tickets.resolve.resolutionPlaceholder")}
                      placeholderTextColor={colors.natural[400]}
                      multiline
                      numberOfLines={6}
                      maxLength={5000}
                      textAlignVertical="top"
                    />
                  </View>
                )}
              />
              {errors.resolution && (
                <Text style={styles.errorText}>{errors.resolution.message}</Text>
              )}
              <Text style={styles.helperText}>
                {t("tickets.resolve.resolutionHelper")}
              </Text>
              <Text style={styles.characterCount}>
                {t("tickets.resolve.characterCount", { count: resolutionValue.length })}
              </Text>
            </View>

            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                {t("tickets.resolve.warningText")}
              </Text>
            </View>
          </ScrollView>

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
              onPress={handleSubmit(onSubmit)}
              variant="primary"
              style={styles.actionButton}
              disabled={resolveTicket.isPending || !isValid}
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
  textAreaContainerError: {
    borderColor: colors.error[500],
  },
  textArea: {
    ...textStyles.bodyMedium,
    color: colors.natural[900],
    minHeight: 100,
  },
  errorText: {
    ...textStyles.labelSmall,
    color: colors.error[600],
    marginTop: spacing[4],
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
  },
  warningContainer: {
    backgroundColor: colors.warning[50],
    borderRadius: borderRadius[8],
    padding: spacing[12],
    borderStartWidth: 3,
    borderStartColor: colors.warning[500],
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
