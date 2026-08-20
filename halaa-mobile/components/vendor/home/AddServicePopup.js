import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  ActivityIndicator,
  TextInput as RNTextInput,
} from "react-native";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { TextInput, DropdownInput, ImageInput } from "../../commen";
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
  const slideAnim = React.useRef(new Animated.Value(1000)).current;
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
    if (visible) {
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
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 1000,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, editingService, reset, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 1000,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      reset();
      setSelectedTags([]);
      setIncluded([]);
      setIncludedInput("");
      onClose?.();
    });
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={isLoading}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="close" size={24} color="#2C2C2C" />
            </TouchableOpacity>
            <Text style={styles.title}>
              {isEditing ? t("services.editTitle") : t("services.title")}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.divider} />

          {/* Form */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <FormProvider {...methods}>
              <ImageInput
                name="serviceImage"
                label={t("services.imageLabel")}
                placeholder={t("services.imagePlaceholder")}
              />

              <TextInput
                name="serviceName"
                label={t("services.nameLabel")}
                placeholder={t("services.namePlaceholder")}
              />

              <TextInput
                name="serviceNameAr"
                label={t("services.nameArLabel")}
                placeholder={t("services.nameArPlaceholder")}
              />

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
              />

              <TextInput
                name="descriptionAr"
                label={t("services.descArLabel")}
                placeholder={t("services.descArPlaceholder")}
                multiline
                numberOfLines={4}
              />

              <TextInput
                name="price"
                label={t("services.priceLabel")}
                placeholder={t("services.pricePlaceholder")}
                keyboardType="decimal-pad"
              />


              {/* Included */}
              <View style={styles.includedSection}>
                <Text style={styles.includedLabel}>
                  {t("services.includedLabel")}
                </Text>
                <View style={styles.includedRow}>
                  <RNTextInput
                    value={includedInput}
                    onChangeText={setIncludedInput}
                    onSubmitEditing={handleAddIncluded}
                    placeholder={t("services.includedPlaceholder")}
                    placeholderTextColor="#9CA3AF"
                    style={styles.includedInput}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    onPress={handleAddIncluded}
                    style={styles.includedAddButton}
                    activeOpacity={0.7}
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
                        <Text style={styles.includedChipText}>{item}</Text>
                        <MaterialCommunityIcons name="close" size={14} color="#6B4E33" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Tags */}
              <TagsSelector selectedTags={selectedTags} onTagPress={handleTagPress} />
            </FormProvider>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelButton, isLoading && styles.buttonDisabled]}
              onPress={handleClose}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>{t("services.cancel")}</Text>
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
                <Text style={styles.submitButtonText}>
                  {isEditing ? t("services.update") : t("services.create")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "92%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
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
  scrollView: {
    flex: 1,
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
