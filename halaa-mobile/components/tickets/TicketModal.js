import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import KeyboardSafeModalSheet from "../commen/keyboard/KeyboardSafeModalSheet";
import {
  createTicketSchema,
  updateTicketSchema,
  TICKET_TYPES,
  getCreateTicketDefaults,
} from "@halaa/shared/schemas/tickets";
import { useLanguage, useTranslation } from "../../localization";
import DirectionalTextInput from "../commen/DirectionalTextInput";
import AdaptiveText from "../commen/AdaptiveText";
import LocalizedText from "../commen/LocalizedText";
import { CONTENT_DIRECTIONS, useFieldDirection } from "../../hooks/useInputDirection";

const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024; // 50 MB (matches backend cap)

const TicketModal = ({ visible, onClose, onSubmit, initialData, loading }) => {
  const { t } = useTranslation("tickets");
  // Modal chrome (title, labels, errors) always follows the UI locale. The
  // subject/message values themselves are adaptive user content resolved
  // per-field below.
  const fieldDirection = useFieldDirection(CONTENT_DIRECTIONS.LOCALIZED);

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

  // Re-apply values every time the modal OPENS. react-hook-form captures
  // defaultValues once on first mount, and this component stays mounted
  // (only the RN Modal's `visible` toggles) — so without this reset the
  // edit form would open with stale/empty fields instead of the ticket
  // being updated. Deps intentionally exclude `initialData`: the screen
  // re-creates that object every render, and re-running reset mid-session
  // would wipe the user's in-progress edits.
  React.useEffect(() => {
    if (visible) {
      reset(initialData || getCreateTicketDefaults());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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
    if (!visible) {
      // Runs on both cancel/close AND successful submit (the screen sets
      // visible=false directly), so clear the picked file here to avoid it
      // leaking into the next new ticket. No-op in edit mode.
      setAttachment(null);
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

  const header = (
    <View style={styles.header}>
      <LocalizedText style={[styles.title, fieldDirection.text]}>
        {isEditMode ? t("popup.editTitle") : t("popup.createTitle")}
      </LocalizedText>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleClose}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t("popup.cancel")}
        /* 40 px box + 2 px slop per side reaches the ≥44 px target
           (blueprint §7) without changing the header geometry. */
        hitSlop={{ top: 2, bottom: 2, start: 2, end: 2 }}
      >
        <Ionicons name="close" size={24} color="#666" />
      </TouchableOpacity>
    </View>
  );

  const footer = (
    <View style={styles.actions}>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleClose}
        disabled={loading}
        activeOpacity={0.7}
      >
        <LocalizedText style={styles.cancelButtonText} center>
          {t("popup.cancel")}
        </LocalizedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.submitButton,
          loading && styles.submitButtonDisabled]}
        onPress={handleSubmit(handleFormSubmit)}
        disabled={loading}
        activeOpacity={0.7}
      >
        <LocalizedText style={styles.submitButtonText} center>
          {loading
            ? isEditMode
              ? t("popup.updating")
              : t("popup.submitting")
            : isEditMode
            ? t("popup.submitEdit")
            : t("popup.submitCreate")}
        </LocalizedText>
      </TouchableOpacity>
    </View>
  );

  return (
    // Shared sheet (§8.2 tickets row): aware scroll body keeps subject/
    // message fields revealed; actions stay attached above the keyboard.
    <KeyboardSafeModalSheet
      visible={visible}
      onClose={handleClose}
      onRequestClose={handleClose}
      header={header}
      footer={footer}
      maxHeightRatio={0.85}
      contentContainerStyle={styles.body}
      accessibilityLabel={isEditMode ? t("popup.editTitle") : t("popup.createTitle")}
    >

      {/* Body */}
      {/* Subject Input */}
      <View style={styles.section}>
        {/* Labels/errors are app-authored chrome: always LocalizedText
            and always the UI locale — never the value's script. */}
        <LocalizedText style={[styles.label, fieldDirection.text]}>
          {t("popup.subjectLabel")}
        </LocalizedText>
        <Controller
          control={control}
          name="subject"
          render={({ field: { onChange, onBlur, value } }) => (
            <DirectionalTextInput
              style={[
                styles.textInput,
                errors.subject && styles.textInputError
              ]}
              contentDirection={CONTENT_DIRECTIONS.ADAPTIVE}
              placeholder={t("popup.subjectPlaceholder")}
              placeholderTextColor="#999"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              maxLength={200}
            />
          )}
        />
        {errors.subject && (
          <LocalizedText style={[styles.errorText, fieldDirection.text]}>
            {t(errors.subject.message)}
          </LocalizedText>
        )}
      </View>

            {/* Type Selection */}
            <View style={styles.section}>
              <LocalizedText style={[styles.label, fieldDirection.text]}>
                {t("popup.typeLabel")}
              </LocalizedText>
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
                        <LocalizedText
                          style={[
                            styles.typeButtonText,
                            fieldDirection.text,
                            value === type && styles.typeButtonTextActive]}
                        >
                          {t(`types.${type}`)}
                        </LocalizedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
              {errors.type && (
                <LocalizedText style={[styles.errorText, fieldDirection.text]}>
                  {t(errors.type.message)}
                </LocalizedText>
              )}
            </View>

            {/* Message Input */}
            <View style={styles.section}>
              <LocalizedText style={[styles.label, fieldDirection.text]}>
                {t("popup.messageLabel")}
              </LocalizedText>
              <Controller
                control={control}
                name="message"
                render={({ field: { onChange, onBlur, value } }) => (
                  <DirectionalTextInput
                    style={[
                      styles.textArea,
                      errors.message && styles.textAreaError]}
                      contentDirection={CONTENT_DIRECTIONS.ADAPTIVE}
                      placeholder={t("popup.messagePlaceholder")}
                    placeholderTextColor="#999"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                )}
              />
              {errors.message && (
                <LocalizedText style={[styles.errorText, fieldDirection.text]}>
                  {t(errors.message.message)}
                </LocalizedText>
              )}
            </View>

            {/* Attachment (create mode only — edit path doesn't accept files) */}
            {!isEditMode && (
              <View style={styles.section}>
                <LocalizedText style={[styles.label, fieldDirection.text]}>
                  {t("popup.attachmentLabel")}
                </LocalizedText>

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
                    <AdaptiveText style={styles.attachmentName} numberOfLines={1}>
                      {attachment.name}
                    </AdaptiveText>
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
                      <LocalizedText style={styles.attachmentButtonText}>
                        {t("popup.addImage")}
                      </LocalizedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.attachmentButton}
                      onPress={() => handlePickAttachment(["videos"])}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="videocam-outline" size={18} color="#c28e5c" />
                      <LocalizedText style={styles.attachmentButtonText}>
                        {t("popup.addVideo")}
                      </LocalizedText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
    </KeyboardSafeModalSheet>
  );
};

const styles = StyleSheet.create({
  header: {
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
