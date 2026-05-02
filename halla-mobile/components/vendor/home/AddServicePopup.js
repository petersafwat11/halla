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
} from "react-native";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { TextInput, DropdownInput, ImageInput } from "../../commen";
import {
  addServiceSchema,
  SERVICE_TYPES,
  PREDEFINED_TAGS,
} from "../../../utils/schemas/vendorServiceSchema";

const AddServicePopup = ({
  visible = false,
  onClose,
  onSubmit,
  isLoading = false,
  editingService = null,
}) => {
  const { t } = useTranslation("vendor");
  const slideAnim = React.useRef(new Animated.Value(1000)).current;
  const [selectedTags, setSelectedTags] = useState([]);
  const isEditing = !!editingService;

  const methods = useForm({
    resolver: zodResolver(addServiceSchema),
    defaultValues: {
      serviceName: "",
      serviceType: "",
      description: "",
      price: "",
      serviceImage: undefined,
    },
  });

  const { handleSubmit, reset } = methods;

  useEffect(() => {
    if (visible) {
      if (editingService?._raw) {
        // Pre-fill form with existing service data
        reset({
          serviceName: editingService.name || "",
          serviceType: editingService._raw.serviceType || "",
          description: editingService._raw.description || "",
          price: editingService._raw.price || "",
          serviceImage: undefined,
        });
        setSelectedTags(editingService._raw.tags || []);
      } else {
        reset();
        setSelectedTags([]);
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
      onClose?.();
    });
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

  const localizedTags = useMemo(
    () =>
      PREDEFINED_TAGS.map((tag) => ({
        ...tag,
        label: t(`services.tags.${tag.value}`, tag.label),
      })),
    [t],
  );

  const handleFormSubmit = (data) => {
    onSubmit?.({ ...data, tags: selectedTags });
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
                name="price"
                label={t("services.priceLabel")}
                placeholder={t("services.pricePlaceholder")}
                keyboardType="decimal-pad"
              />

              {/* Tags */}
              <View style={styles.tagsSection}>
                <Text style={styles.tagsLabel}>{t("services.tagsLabel")}</Text>
                <View style={styles.tagsContainer}>
                  {localizedTags.map((tag) => (
                    <TouchableOpacity
                      key={tag.value}
                      style={[
                        styles.tag,
                        selectedTags.includes(tag.value) && styles.tagSelected,
                      ]}
                      onPress={() => handleTagPress(tag)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          selectedTags.includes(tag.value) &&
                            styles.tagTextSelected,
                        ]}
                      >
                        {tag.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
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
              onPress={handleSubmit(handleFormSubmit)}
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
    maxHeight: "95%",
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
    maxHeight: "80%",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  tagsSection: {
    marginBottom: 16,
  },
  tagsLabel: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F2F2F2",
    borderWidth: 1,
    borderColor: "#F2F2F2",
  },
  tagSelected: {
    backgroundColor: "#F5ECE4",
    borderColor: "#C28E5C",
  },
  tagText: {
    fontSize: 13,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
  },
  tagTextSelected: {
    color: "#C28E5C",
    fontFamily: "Cairo_600SemiBold",
  },
  footer: {
    flexDirection: "row-reverse",
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
});

export default AddServicePopup;
