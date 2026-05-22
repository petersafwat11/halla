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
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTicketSchema,
  updateTicketSchema,
  TICKET_TYPES,
  getCreateTicketDefaults,
} from "../../utils/schemas/ticketSchema";
import { useLanguage, useTranslation } from "../../localization";

const TicketModal = ({ visible, onClose, onSubmit, initialData, loading }) => {
  const { t } = useTranslation("tickets");

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
              <Text style={styles.label}>
                {t("popup.subjectLabel")}
              </Text>
              <Controller
                control={control}
                name="subject"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.textInput,
                      errors.subject && styles.textInputError
                    ]}
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
                <Text style={styles.errorText}>
                  {t(errors.subject.message)}
                </Text>
              )}
            </View>

            {/* Type Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>
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
              <Text style={styles.label}>
                  {t("popup.messageLabel")}
              </Text>
              <Controller
                control={control}
                name="message"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.textArea,
                      errors.message && styles.textAreaError]}
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
                <Text style={styles.errorText}>
                  {t(errors.message.message)}
                </Text>
              )}
            </View>
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
  }
});

export default TicketModal;
