import React, { useState } from "react";
import { View, TouchableOpacity, Image, StyleSheet, Alert } from "react-native";
import { useFormContext, Controller } from "react-hook-form";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import LocalizedText from "./LocalizedText";
import { useTranslation } from "../../localization";
import { normalizeRNFile } from "../../utils/fileUtils";

/**
 * Shared image and document picker form field.
 * Labels, hints, errors, and actions follow the active UI locale.
 */
const ImageInput = ({
  name,
  label,
  placeholder,
  allowDocuments = false,
  documentOnly = false,
  allowOfficeDocuments = false,
  rules,
}) => {
  const { control } = useFormContext();
  const { t } = useTranslation("common");
  const [pickerError, setPickerError] = useState("");

  const applyAsset = (asset, fieldKind, onChange) => {
    try {
      const normalized = normalizeRNFile(asset, fieldKind);
      setPickerError("");
      onChange(normalized);
    } catch (_error) {
      setPickerError(t("imagePicker.invalidFile"));
    }
  };

  const pickFromGallery = async (onChange) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        applyAsset(result.assets[0], allowDocuments ? "mixed" : "image", onChange);
      }
    } catch (_error) {
      setPickerError(t("imagePicker.pickFailed"));
    }
  };

  const pickDocument = async (onChange) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: allowOfficeDocuments
          ? [
              "application/pdf",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ]
          : ["application/pdf"],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        applyAsset(
          result.assets[0],
          documentOnly || allowOfficeDocuments ? "document" : "mixed",
          onChange
        );
      }
    } catch (_error) {
      setPickerError(t("imagePicker.pickFailed"));
    }
  };

  const handlePick = (onChange) => {
    if (documentOnly) {
      pickDocument(onChange);
      return;
    }
    if (allowDocuments) {
      Alert.alert(
        label || t("imagePicker.chooseFile"),
        "",
        [
          {
            text: t("imagePicker.chooseImage"),
            onPress: () => pickFromGallery(onChange),
          },
          {
            text: t("imagePicker.chooseDocument"),
            onPress: () => pickDocument(onChange),
          },
          {
            text: t("buttons.cancel"),
            style: "cancel",
          },
        ]
      );
      return;
    }
    pickFromGallery(onChange);
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
        const hasDoc = isDoc(value);

        return (
          <View style={styles.container}>
            {label && (
              <LocalizedText role="label" style={styles.label}>
                {label}
              </LocalizedText>
            )}
            <TouchableOpacity
              style={[styles.picker, error && styles.pickerError]}
              onPress={() => handlePick(onChange)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={placeholder || label}
            >
              {value?.uri ? (
                hasDoc ? (
                  <View style={styles.placeholderContainer}>
                    <MaterialCommunityIcons
                      name="file-pdf-box"
                      size={48}
                      color="#e74c3c"
                    />
                    <LocalizedText style={styles.fileNameText} numberOfLines={1}>
                      {value.fileName || value.name || "Document.pdf"}
                    </LocalizedText>
                    <LocalizedText role="hint" style={styles.subText}>
                      {t("imagePicker.changeFile")}
                    </LocalizedText>
                  </View>
                ) : (
                  <Image source={{ uri: value.uri }} style={styles.preview} />
                )
              ) : (
                <View style={styles.placeholderContainer}>
                  <MaterialCommunityIcons
                    name={allowDocuments || documentOnly ? "file-upload-outline" : "camera-plus-outline"}
                    size={32}
                    color="#C28E5C"
                  />
                  {placeholder ? (
                    <LocalizedText style={styles.placeholderText}>
                      {placeholder}
                    </LocalizedText>
                  ) : null}
                </View>
              )}
            </TouchableOpacity>
            {(error || pickerError) && (
              <LocalizedText role="error" style={styles.errorText}>
                {error?.message || pickerError}
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
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    borderStyle: "dashed",
    backgroundColor: "#FAFAFA",
    height: 160,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerError: {
    borderColor: "#e74c3c",
  },
  preview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderContainer: {
    alignItems: "center",
    gap: 8,
  },
  placeholderText: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#999",
  },
  fileNameText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#333",
    paddingHorizontal: 16,
    textAlign: "center",
  },
  subText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#C28E5C",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    marginTop: 4,
  },
});

export default ImageInput;
