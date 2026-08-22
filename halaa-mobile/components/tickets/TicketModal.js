import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTicketSchema,
  updateTicketSchema,
  TICKET_TYPES,
  getCreateTicketDefaults,
} from "@halaa/shared/schemas/tickets";
import { useLanguage, useTranslation } from "../../localization";
import { useInputDirection, useLabelDirection } from "../../hooks/useInputDirection";

const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024; // 50 MB (matches backend cap)

const TicketModal = ({ visible, onClose, onSubmit, initialData, loading }) => {
  const { t } = useTranslation("tickets");
  const directionStyle = useInputDirection("localized");
  const labelDirectionStyle = useLabelDirection("localized");

  const slideAnim = React.useRef(new Animated.Value(300)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const isEditMode = !!initialData;
  const schema = isEditMode ? updateTicketSchema(t) : createTicketSchema(t);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialData || getCreateTicketDefaults()
  });

  const selectedType = watch("type");

  // Single optional image/video attachment (create mode only). Kept in local
  // state, NOT react-hook-form, since it's uploaded as multipart, not JSON.
  const [attachment, setAttachment] = useState(null);

  const handlePickAttachment = async (mediaTypes) => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        t("popup.permissionRequired"),
        t("popup.permissionMessage")
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsMultipleSelection: false,
      quality: 0.8
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_ATTACHMENT_BYTES) {
      Alert.alert(t("popup.attachmentTooLarge"));
      return;
    }
    const isVideo =
      asset.type === "video" || /video/i.test(asset.mimeType || "");
    // Replace any previously picked file — only ONE attachment is allowed.
    setAttachment({
      uri: asset.uri,
      name: asset.fileName || (isVideo ? "video.mp4" : "photo.jpg"),
      type: asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
      isVideo
    });
  };

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })]).start();
    } else {
      // Runs on both cancel/close AND successful submit (the screen sets
      // visible=false directly), so clear the picked file here to avoid it
      // leaking into the next new ticket. No-op in edit mode.
      setAttachment(null);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 250,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true
        })]).start();
    }
  }, [visible]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = (data) => {
    // With an attachment (create mode only) send multipart/form-data. The
    // backend Zod schema is .strict(), so append ONLY known fields and guard
    // priority. Field name MUST be exactly "ticketAttachment".
    if (!isEditMode && attachment) {
      const formData = new FormData();
      formData.append("subject", data.subject);
      formData.append("type", data.type);
      formData.append("message", data.message);
      if (data.priority) formData.append("priority", data.priority);
      formData.append("ticketAttachment", {
        uri: attachment.uri,
        name: attachment.name,
        type: attachment.type
      });
      onSubmit(formData);
      return;
    }
    // No attachment: keep the plain-JSON path exactly as before.
    onSubmit(data);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <Animated.View
          style={[styles.backdrop, { opacity: fadeAnim }]}
          onTouchEnd={handleClose}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEditMode ? t("popup.editTitle") : t("popup.createTitle")}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Subject Input */}
            <View style={styles.section}>
              <Text style={[styles.label, labelDirectionStyle]}>
                {t("popup.subjectLabel")}
              </Text>
              <Controller
                control={control}
                name="subject"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.textInput,
                      directionStyle,
                      errors.subject && styles.textInputError
                    ]}
                    placeholder={t("popup.subjectPlaceholder")}
                    placeholderTextColor="#999"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    maxLength={200}
                    textAlign="auto"
                  />
                )}
              />
              {errors.subject && (
                <Text style={styles.errorText}>
                  {t(errors.subject.message)}
                </Text>
              )}
            </View>

            {/* Type Selection */}
            <View style={styles.section}>
              <Text style={[styles.label, labelDirectionStyle]}>
                  {t("popup.typeLabel")}
              </Text>
              <Controller
                control={control}
                name="type"
                render={({ field: { onChange, value } }) => (
                  <View
                    style={[
                      styles.typesContainer]}
                  >
                    {TICKET_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeButton,
                          value === type && styles.typeButtonActive]}
                        onPress={() => onChange(type)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            value === type && styles.typeButtonTextActive]}
                        >
                          {t(`types.${type}`)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
              {errors.type && (
                <Text style={styles.errorText}>
                  {t(errors.type.message)}
                </Text>
              )}
            </View>

            {/* Message Input */}
            <View style={styles.section}>
              <Text style={[styles.label, labelDirectionStyle]}>
                  {t("popup.messageLabel")}
              </Text>
              <Controller
                control={control}
                name="message"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.textArea,
                      directionStyle,
                      errors.message && styles.textAreaError]}
                      placeholder={t("popup.messagePlaceholder")}
                    placeholderTextColor="#999"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    textAlign="auto"
                  />
                )}
              />
              {errors.message && (
                <Text style={styles.errorText}>
                  {t(errors.message.message)}
                </Text>
              )}
            </View>

            {/* Attachment (create mode only — edit path doesn't accept files) */}
            {!isEditMode && (
              <View style={styles.section}>
                <Text style={[styles.label, labelDirectionStyle]}>
                  {t("popup.attachmentLabel")}
                </Text>

                {attachment ? (
                  <View style={styles.attachmentPreview}>
                    {attachment.isVideo ? (
                      <View style={styles.attachmentPreviewIcon}>
                        <Ionicons name="videocam" size={24} color="#c28e5c" />
                      </View>
                    ) : (
                      <Image
                        source={{ uri: attachment.uri }}
                        style={styles.attachmentPreviewImage}
                      />
                    )}
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {attachment.name}
                    </Text>
                    <TouchableOpacity
                      style={styles.attachmentRemove}
                      onPress={() => setAttachment(null)}
                      accessibilityLabel={t("popup.removeAttachment")}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={22} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.attachmentButtons}>
                    <TouchableOpacity
                      style={styles.attachmentButton}
                      onPress={() => handlePickAttachment(["images"])}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="image-outline" size={18} color="#c28e5c" />
                      <Text style={styles.attachmentButtonText}>
                        {t("popup.addImage")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.attachmentButton}
                      onPress={() => handlePickAttachment(["videos"])}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="videocam-outline" size={18} color="#c28e5c" />
                      <Text style={styles.attachmentButtonText}>
                        {t("popup.addVideo")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>{t("popup.cancel")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled]}
              onPress={handleSubmit(handleFormSubmit)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.submitButtonText}>
                {loading
                  ? isEditMode
                    ? t("popup.updating")
                    : t("popup.submitting")
                  : isEditMode
                  ? t("popup.submitEdit")
                  : t("popup.submitCreate")}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end"
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)"
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 20
  },  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },title: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    flex: 1
  },closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center"
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 20
  },
  section: {
    marginBottom: 24
  },
  label: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 12
  },typesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff"
  },
  typeButtonActive: {
    backgroundColor: "#c28e5c",
    borderColor: "#c28e5c"
  },  typeButtonText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#666"
  },
  typeButtonTextActive: {
    color: "#fff"
  },  textInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    minHeight: 48
  },
  textInputError: {
    borderColor: "#e74c3c"
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    minHeight: 120
  },  textAreaError: {
    borderColor: "#e74c3c"
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    marginTop: 4
  },actions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 12
  },  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#c28e5c",
    alignItems: "center"
  },  cancelButtonText: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: "#c28e5c"
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#c28e5c",
    alignItems: "center"
  },  submitButtonDisabled: {
    backgroundColor: "#e0e0e0"
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: "#fff"
  },
  attachmentButtons: {
    flexDirection: "row",
    gap: 12
  },
  attachmentButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#c28e5c",
    backgroundColor: "#faf5f0"
  },
  attachmentButtonText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#c28e5c"
  },
  attachmentPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#faf5f0"
  },
  attachmentPreviewImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#eee"
  },
  attachmentPreviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#f5ece4",
    justifyContent: "center",
    alignItems: "center"
  },
  attachmentName: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c"
  },
  attachmentRemove: {
    padding: 2
  }
});

export default TicketModal;
