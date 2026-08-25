import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import KeyboardSafeModalSheet from "../../commen/keyboard/KeyboardSafeModalSheet";
import DirectionalTextInput from "../../commen/DirectionalTextInput";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import { useSendNotification, useBroadcastNotification } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";

const SendNotificationModal = ({
  visible,
  onClose,
  targetUser = null,
  targetRole = null,
  isBulk = false,
  onSuccess,
}) => {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const sendMutation = useSendNotification();
  const broadcastMutation = useBroadcastNotification();
  const isLoading = sendMutation.isPending || broadcastMutation.isPending;

  const methods = useForm({
    defaultValues: {
      titleAr: "",
      titleEn: "",
      messageAr: "",
      messageEn: "",
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = methods;

  const onSubmit = async (data) => {
    if (!data.titleAr.trim()) {
      Alert.alert(t("sendNotification.error"), t("sendNotification.titleRequired"));
      return;
    }
    if (!data.messageAr.trim()) {
      Alert.alert(t("sendNotification.error"), t("sendNotification.messageRequired"));
      return;
    }

    try {
      const body = {
        title: data.titleEn || data.titleAr,
        titleAr: data.titleAr,
        message: data.messageEn || data.messageAr,
        messageAr: data.messageAr,
      };

      if (isBulk) {
        await broadcastMutation.mutateAsync({
          ...body,
          role: targetRole,
        });
      } else if (targetUser) {
        await sendMutation.mutateAsync({
          ...body,
          userIds: [targetUser._id || targetUser.id],
        });
      }

      toast.success(
        isBulk
          ? t("sendNotification.broadcastSuccess")
          : t("sendNotification.sendSuccess")
      );
      reset();
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.message || t("sendNotification.sendError"));
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const header = (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color="#2c2c2c" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="notifications-outline" size={22} color="#c28e5c" />
          <Text style={styles.headerTitle}>
            {isBulk
              ? t("sendNotification.broadcastTitle")
              : t("sendNotification.sendTitle")}
          </Text>
        </View>
        <View style={styles.closeBtn} />
      </View>

      {/* Recipient Info */}
      {!isBulk && targetUser && (
        <View style={styles.recipientBar}>
          <Text style={styles.recipientLabel}>{t("sendNotification.to")}:</Text>
          <Text style={styles.recipientName}>
            {targetUser.username || targetUser.email || targetUser.phoneNumber}
          </Text>
        </View>
      )}
      {isBulk && targetRole && (
        <View style={styles.warningBar}>
          <Ionicons name="warning-outline" size={18} color="#F59E0B" />
          <Text style={styles.warningText}>
            {t("sendNotification.bulkWarning", {
              role: t(`sendNotification.roles.${targetRole}`, targetRole),
            })}
          </Text>
        </View>
      )}
    </>
  );

  const footer = (
    <View style={styles.actions}>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleClose}
        disabled={isLoading}
      >
        <Text style={styles.cancelText}>{t("common.cancel")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
      >
        {isLoading ? (
          <Text style={styles.sendText}>{t("common.loading")}</Text>
        ) : (
          <>
            <Ionicons name="send-outline" size={18} color="#FFF" />
            <Text style={styles.sendText}>{t("sendNotification.send")}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    // Shared sheet (§8.2 admin row): aware scroll body owns focus scrolling;
    // send/cancel actions stay attached above the keyboard.
    <KeyboardSafeModalSheet
      visible={visible}
      onClose={handleClose}
      onRequestClose={handleClose}
      header={header}
      footer={footer}
      contentContainerStyle={styles.formContent}
    >

        <FormProvider {...methods}>
          <>
            {/* Arabic Title */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {t("sendNotification.titleAr")} *
              </Text>
              <Controller
                control={control}
                name="titleAr"
                rules={{ required: true }}
                render={({ field: { onChange, value } }) => (
                  <InputField
                    value={value}
                    onChangeText={onChange}
                    placeholder={t("sendNotification.titleArPlaceholder")}
                    style={errors.titleAr && styles.inputError}
                    contentDirection="rtl"
                  />
                )}
              />
            </View>

            {/* English Title */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("sendNotification.titleEn")}</Text>
              <Controller
                control={control}
                name="titleEn"
                render={({ field: { onChange, value } }) => (
                  <InputField
                    value={value}
                    onChangeText={onChange}
                    placeholder={t("sendNotification.titleEnPlaceholder")}
                    contentDirection="ltr"
                  />
                )}
              />
            </View>

            {/* Arabic Message */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {t("sendNotification.messageAr")} *
              </Text>
              <Controller
                control={control}
                name="messageAr"
                rules={{ required: true }}
                render={({ field: { onChange, value } }) => (
                  <InputField
                    value={value}
                    onChangeText={onChange}
                    placeholder={t("sendNotification.messageArPlaceholder")}
                    style={styles.textArea}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    contentDirection="rtl"
                  />
                )}
              />
            </View>

            {/* English Message */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("sendNotification.messageEn")}</Text>
              <Controller
                control={control}
                name="messageEn"
                render={({ field: { onChange, value } }) => (
                  <InputField
                    value={value}
                    onChangeText={onChange}
                    placeholder={t("sendNotification.messageEnPlaceholder")}
                    style={styles.textArea}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    contentDirection="ltr"
                  />
                )}
              />
            </View>
          </>
        </FormProvider>
    </KeyboardSafeModalSheet>
  );
};

/**
 * Simple text input field (avoids dependency on specific input component)
 */
const InputField = ({
  value,
  onChangeText,
  placeholder,
  style,
  multiline,
  numberOfLines,
  textAlignVertical,
  contentDirection,
}) => {
  return (
    <DirectionalTextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#a0a0a0"
      style={[fieldStyles.input, style, multiline && fieldStyles.multiline]}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical={textAlignVertical}
      contentDirection={contentDirection}
    />
  );
};

const fieldStyles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#dfdfdf",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    backgroundColor: "#f7f7f7",
  },
  multiline: {
    minHeight: 100,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
  },
  recipientBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#f5ece4",
  },
  recipientLabel: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#c28e5c",
  },
  recipientName: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
  },
  warningBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#FFFBEB",
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#92400E",
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
  },
  inputError: {
    borderColor: "#c0392b",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c28e5c",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#c28e5c",
  },
  sendButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#c28e5c",
  },
  sendButtonDisabled: {
    backgroundColor: "#e0e0e0",
  },
  sendText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
  },
});

export default SendNotificationModal;
