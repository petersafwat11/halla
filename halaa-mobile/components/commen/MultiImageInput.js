import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useFormContext, Controller } from "react-hook-form";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import LocalizedText from "./LocalizedText";
import { useTranslation } from "../../localization";
import { normalizeRNFile } from "../../utils/fileUtils";

/**
 * Shared multi-image/document-picker form field (blueprint §5.2 field anatomy).
 */
const MultiImageInput = ({
  name,
  label,
  placeholder,
  multiple = true,
  allowDocuments = false,
  maxFiles = 10,
  rules,
}) => {
  const { control } = useFormContext();
  const { t } = useTranslation("common");
  const [pickerError, setPickerError] = useState("");

  const mergeValidatedFiles = (assets, fieldKind, onChange, currentValues) => {
    try {
      const normalized = assets.map((asset) => normalizeRNFile(asset, fieldKind));
      const nextValues = multiple
        ? [...(currentValues || []), ...normalized]
        : normalized.slice(0, 1);
      if (nextValues.length > maxFiles) {
        setPickerError(t("imagePicker.maxFiles", { count: maxFiles }));
        return;
      }
      setPickerError("");
      onChange(nextValues);
    } catch (_error) {
      setPickerError(t("imagePicker.invalidFile"));
    }
  };

  const pickImagesFromGallery = async (onChange, currentValues) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: multiple,
        allowsEditing: !multiple,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const selectedAssets = multiple ? result.assets : [result.assets[0]];
        // Price-package fields share the stricter mixed-file contract with the
        // API (JPG/PNG/PDF); portfolio-only fields may additionally use WebP.
        mergeValidatedFiles(
          selectedAssets,
          allowDocuments ? "mixed" : "image",
          onChange,
          currentValues,
        );
      }
    } catch (_error) {
      setPickerError(t("imagePicker.pickFailed"));
    }
  };

  const pickDocuments = async (onChange, currentValues) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf"],
        multiple,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        mergeValidatedFiles(result.assets, "mixed", onChange, currentValues);
      }
    } catch (_error) {
      setPickerError(t("imagePicker.pickFailed"));
    }
  };

  const handlePick = (onChange, currentValues) => {
    if (allowDocuments) {
      Alert.alert(
        label || t("imagePicker.chooseFile"),
        "",
        [
          {
            text: t("imagePicker.chooseImage"),
            onPress: () => pickImagesFromGallery(onChange, currentValues),
          },
          {
            text: t("imagePicker.chooseDocument"),
            onPress: () => pickDocuments(onChange, currentValues),
          },
          {
            text: t("buttons.cancel"),
            style: "cancel",
          },
        ]
      );
      return;
    }
    pickImagesFromGallery(onChange, currentValues);
  };

  const removeImage = (onChange, currentValues, index) => {
    const newValues = currentValues.filter((_, i) => i !== index);
    onChange(newValues.length > 0 ? newValues : []);
  };

  const isDoc = (val) => {
    if (!val) return false;
    const mime = val.type || val.mimeType || "";
    const name = val.fileName || val.name || "";
    return (
      mime.includes("pdf") ||
      mime.includes("word") ||
      mime.includes("document") ||
      /\.(pdf|docx?)$/i.test(name)
    );
  };

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const images = value || [];

        return (
          <View style={styles.container}>
            {label && (
              <LocalizedText role="label" style={styles.label}>
                {label}
              </LocalizedText>
            )}

            {/* Image & Document Previews */}
            {images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.previewList}
              >
                {images.map((img, index) => {
                  const doc = isDoc(img);
                  return (
                    <View key={index} style={styles.previewWrapper}>
                      {doc ? (
                        <View style={styles.docPreview}>
                          <MaterialCommunityIcons
                            name="file-pdf-box"
                            size={36}
                            color="#e74c3c"
                          />
                          <LocalizedText style={styles.docFileName} numberOfLines={1}>
                            {img.fileName || img.name || "File.pdf"}
                          </LocalizedText>
                        </View>
                      ) : (
                        <Image
                          source={{ uri: img.uri }}
                          style={styles.preview}
                        />
                      )}
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeImage(onChange, images, index)}
                        accessibilityRole="button"
                        accessibilityLabel={t("buttons.delete")}
                      >
                        <Ionicons name="close" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {multiple && images.length < maxFiles && (
                  <TouchableOpacity
                    style={styles.addMore}
                    onPress={() => handlePick(onChange, images)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t("imagePicker.add")}
                  >
                    <MaterialCommunityIcons
                      name="plus"
                      size={28}
                      color="#C28E5C"
                    />
                    <LocalizedText style={styles.addMoreText}>
                      {t("imagePicker.add")}
                    </LocalizedText>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}

            {/* Initial Upload Button (when no images) */}
            {images.length === 0 && (
              <TouchableOpacity
                style={[styles.picker, error && styles.pickerError]}
                onPress={() => handlePick(onChange, images)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={placeholder || label}
              >
                <MaterialCommunityIcons
                  name={allowDocuments ? "file-upload-outline" : "camera-plus-outline"}
                  size={36}
                  color="#C28E5C"
                />
                <LocalizedText style={styles.placeholderText}>
                  {placeholder ||
                    t(
                      allowDocuments
                        ? "imagePicker.chooseFiles"
                        : multiple
                        ? "imagePicker.chooseImages"
                        : "imagePicker.chooseImage"
                    )}
                </LocalizedText>
                {multiple && (
                  <LocalizedText role="hint" style={styles.subText}>
                    {t("imagePicker.multipleHint")}
                  </LocalizedText>
                )}
              </TouchableOpacity>
            )}

            {(error || pickerError) && (
              <LocalizedText role="error" style={styles.errorText}>
                {error?.message || error?.root?.message || (Array.isArray(error) ? error.find((item) => item?.message)?.message : null) || pickerError}
              </LocalizedText>
            )}
          </View>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 8,
  },
  picker: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    borderStyle: "dashed",
    backgroundColor: "#FAFAFA",
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  pickerError: {
    borderColor: "#e74c3c",
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: "#777",
  },
  subText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#aaa",
  },
  previewList: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  previewWrapper: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  preview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  docPreview: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    gap: 4,
  },
  docFileName: {
    fontSize: 11,
    fontFamily: "Cairo_500Medium",
    color: "#333",
    textAlign: "center",
  },
  removeButton: {
    position: "absolute",
    top: 4,
    end: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  addMore: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#C28E5C",
    borderStyle: "dashed",
    backgroundColor: "#FBF5EF",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  addMoreText: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    color: "#C28E5C",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    marginTop: 4,
  },
});

export default MultiImageInput;
