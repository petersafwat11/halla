import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import KeyboardSafeModalSheet from "../../commen/keyboard/KeyboardSafeModalSheet";
import RNTextInput from "../../commen/DirectionalTextInput";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  TextInput,
  DropdownInput,
  ImageInput,
  LocalizedText,
  AdaptiveText,
} from "../../commen";
import { CONTENT_DIRECTIONS } from "../../../hooks/useInputDirection";
import {
  addServiceSchema,
  SERVICE_TYPES,
} from "../../../utils/schemas/vendorServiceSchema";
import TagsSelector from "./TagsSelector";
import { useToast } from "../../../contexts/ToastContext";
import { getImageUrl } from "../../../utils/imageUtils";

const AddServicePopup = ({
  visible = false,
  onClose,
  onSubmit,
  isLoading = false,
  editingService = null,
}) => {
  const { t } = useTranslation("vendor");
  const toast = useToast();
  const [selectedTags, setSelectedTags] = useState([]);
  const [included, setIncluded] = useState([]);
  const [includedInput, setIncludedInput] = useState("");
  const isEditing = !!editingService;

  const methods = useForm({
    resolver: zodResolver(addServiceSchema(t)),
    defaultValues: {
      serviceName: "",
      serviceNameAr: "",
      serviceType: "",
      description: "",
      descriptionAr: "",
      price: "",
      serviceImage: undefined,
    },
  });

  const { handleSubmit, reset } = methods;

  useEffect(() => {
    if (!visible) return;
    if (editingService?._raw) {
      const raw = editingService._raw;
      // Pre-fill form with existing service data
      reset({
        serviceName: editingService.name || raw.name || "",
        serviceNameAr: raw.nameAr || "",
        serviceType: raw.category || "",
        description: raw.description || "",
        descriptionAr: raw.descriptionAr || "",
        price: String(raw.price ?? ""),
        serviceImage: raw.image
          ? { uri: getImageUrl(raw.image) }
          : editingService.imageUri
            ? { uri: editingService.imageUri }
            : undefined,
      });
      setSelectedTags(raw.tags || []);
      setIncluded(raw.included || []);
      setIncludedInput("");
    } else {
      reset();
      setSelectedTags([]);
      setIncluded([]);
      setIncludedInput("");
    }
  }, [visible, editingService, reset]);

  const handleClose = () => {
    reset();
    setSelectedTags([]);
    setIncluded([]);
    setIncludedInput("");
    onClose?.();
  };

  const handleAddIncluded = () => {
    const value = includedInput.trim();
    if (!value) return;
    if (included.includes(value)) {
      setIncludedInput("");
      return;
    }
    setIncluded((prev) => [...prev, value]);
    setIncludedInput("");
  };

  const handleRemoveIncluded = (item) => {
    setIncluded((prev) => prev.filter((i) => i !== item));
  };

  const handleTagPress = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag.value)
        ? prev.filter((t) => t !== tag.value)
        : [...prev, tag.value]
    );
  };

  const localizedServiceTypes = useMemo(
    () =>
      SERVICE_TYPES.map((st) => ({
        ...st,
        label: t(`services.serviceTypes.${st.value}`, st.label),
      })),
    [t],
  );

  const handleFormSubmit = (data) => {
    onSubmit?.({
      ...data,
      tags: selectedTags,
      included,
    });
  };

  const handleInvalid = (errors) => {
    const firstError =
      Object.values(errors)[0]?.message || t("services.validation.fixErrors");
    toast.error(firstError);
  };

  const header = (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleClose}
          disabled={isLoading}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("services.cancel")}
        >
          <MaterialCommunityIcons name="close" size={24} color="#2C2C2C" />
        </TouchableOpacity>
        <LocalizedText role="pageTitle" style={styles.title}>
          {isEditing ? t("services.editTitle") : t("services.title")}
        </LocalizedText>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.divider} />
    </>
  );

  const footer = (
    <View style={styles.footer}>
      <TouchableOpacity
        style={[styles.cancelButton, isLoading && styles.buttonDisabled]}
        onPress={handleClose}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <LocalizedText style={styles.cancelButtonText}>
          {t("services.cancel")}
        </LocalizedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.submitButton,
          isLoading && styles.submitButtonLoading,
        ]}
        onPress={handleSubmit(handleFormSubmit, handleInvalid)}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <LocalizedText style={styles.submitButtonText}>
            {isEditing ? t("services.update") : t("services.create")}
          </LocalizedText>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    // Shared bottom sheet (§8.2 vendor row): aware scroll body owns focus
    // scrolling for the long service form; actions stay above the keyboard.
    <KeyboardSafeModalSheet
      visible={visible}
      onClose={handleClose}
      onRequestClose={handleClose}
      header={header}
      footer={footer}
      dismissOnBackdropPress={false}
      contentContainerStyle={styles.scrollContent}
      accessibilityLabel={isEditing ? t("services.editTitle") : t("services.title")}
    >
            <FormProvider {...methods}>
              <ImageInput
                name="serviceImage"
                label={t("services.imageLabel")}
                placeholder={t("services.imagePlaceholder")}
              />

              {/* Default-locale service name: arbitrary user text. */}
              <TextInput
                name="serviceName"
                label={t("services.nameLabel")}
                placeholder={t("services.namePlaceholder")}
                contentDirection={CONTENT_DIRECTIONS.ADAPTIVE}
              />

              {/* Explicitly Arabic-restricted backend field. */}
              <TextInput
                name="serviceNameAr"
                label={t("services.nameArLabel")}
                placeholder={t("services.nameArPlaceholder")}
                contentDirection={CONTENT_DIRECTIONS.RTL}
              />

              {/* App-owned localized options (blueprint §5.3 dropdown rule). */}
              <DropdownInput
                name="serviceType"
                label={t("services.typeLabel")}
                placeholder={t("services.typePlaceholder")}
                options={localizedServiceTypes}
                modalTitle={t("services.typeModalTitle")}
              />

              <TextInput
                name="description"
                label={t("services.descLabel")}
                placeholder={t("services.descPlaceholder")}
                multiline
                numberOfLines={4}
                contentDirection={CONTENT_DIRECTIONS.ADAPTIVE}
              />

              <TextInput
                name="descriptionAr"
                label={t("services.descArLabel")}
                placeholder={t("services.descArPlaceholder")}
                multiline
                numberOfLines={4}
                contentDirection={CONTENT_DIRECTIONS.RTL}
              />

              {/* Raw numeric token: stable LTR digits/cursor in both locales. */}
              <TextInput
                name="price"
                label={t("services.priceLabel")}
                placeholder={t("services.pricePlaceholder")}
                keyboardType="decimal-pad"
                contentDirection={CONTENT_DIRECTIONS.LTR}
              />


              {/* Included */}
              <View style={styles.includedSection}>
                <LocalizedText role="label" style={styles.includedLabel}>
                  {t("services.includedLabel")}
                </LocalizedText>
                <View style={styles.includedRow}>
                  {/* Included items are arbitrary user/backend text. */}
                  <RNTextInput
                    value={includedInput}
                    onChangeText={setIncludedInput}
                    onSubmitEditing={handleAddIncluded}
                    placeholder={t("services.includedPlaceholder")}
                    placeholderTextColor="#9CA3AF"
                    contentDirection={CONTENT_DIRECTIONS.ADAPTIVE}
                    style={styles.includedInput}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    onPress={handleAddIncluded}
                    style={styles.includedAddButton}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t("services.includedAdd")}
                  >
                    <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
                {included.length > 0 && (
                  <View style={styles.includedChips}>
                    {included.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={styles.includedChip}
                        onPress={() => handleRemoveIncluded(item)}
                        activeOpacity={0.7}
                      >
                        <AdaptiveText style={styles.includedChipText}>
                          {item}
                        </AdaptiveText>
                        <MaterialCommunityIcons name="close" size={14} color="#6B4E33" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Tags */}
              <TagsSelector selectedTags={selectedTags} onTagPress={handleTagPress} />
            </FormProvider>
    </KeyboardSafeModalSheet>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 28,
  },
  divider: {
    height: 1,
    backgroundColor: "#F2F2F2",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F2",
    backgroundColor: "#FFF",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D6B392",
    backgroundColor: "#FFF",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
    lineHeight: 24,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#C28E5C",
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
    lineHeight: 24,
  },
  submitButtonLoading: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  includedSection: {
    marginBottom: 16,
    gap: 8,
  },
  includedLabel: {
    fontFamily: "Cairo_500Medium",
    fontSize: 14,
    color: "#2C2C2C",
    lineHeight: 20,
  },
  includedRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  includedInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    color: "#2C2C2C",
    backgroundColor: "#FFF",
  },
  includedAddButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#C28E5C",
    alignItems: "center",
    justifyContent: "center",
  },
  includedChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  includedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5ECE4",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  includedChipText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    color: "#6B4E33",
  },
});

export default AddServicePopup;
