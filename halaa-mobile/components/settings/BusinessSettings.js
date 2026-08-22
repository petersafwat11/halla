import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import TextInput from "../commen/DirectionalTextInput";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";

/**
 * Business-account settings:
 * edit the public description (profile.businessData.description) and the
 * logo (top-level avatar). Both are sent in a single multipart
 * PATCH /users/profile via the shared onProfileUpdate handler — the backend
 * `updateMyProfile` writes `description` to `profile.businessData.description`
 * for business accounts and stores the uploaded `avatar` as the logo.
 */
const BusinessSettings = ({ user = {}, onProfileUpdate }) => {
  const { t } = useTranslation("settings");
  const toast = useToast();

  // toPublicJSON surfaces businessData at the top level (profile dropped),
  // so read from user.businessData with a profile fallback for safety.
  const initialDescription =
    user?.businessData?.description ??
    user?.profile?.businessData?.description ??
    "";

  const [description, setDescription] = useState(initialDescription);
  const [logoAsset, setLogoAsset] = useState(null);
  const [logoPreview, setLogoPreview] = useState(user?.avatar || null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setDescription(initialDescription);
    setLogoPreview(user?.avatar || null);
    setLogoAsset(null);
  }, [initialDescription, user?.avatar]);

  const isDirty = description !== initialDescription || logoAsset !== null;

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setLogoAsset(asset);
      setLogoPreview(asset.uri);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("description", description);
      if (logoAsset) {
        formData.append("avatar", {
          uri: logoAsset.uri,
          name: logoAsset.fileName || logoAsset.uri?.split("/").pop() || "logo.jpg",
          type: logoAsset.mimeType || logoAsset.type || "image/jpeg",
        });
      }
      await onProfileUpdate(formData);
      toast.success(t("business.updateSuccess"));
      setLogoAsset(null);
    } catch (error) {
      toast.error(error.message || t("business.updateError"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDescription(initialDescription);
    setLogoAsset(null);
    setLogoPreview(user?.avatar || null);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t("business.title")}</Text>
      <Text style={styles.sectionDescription}>{t("business.subtitle")}</Text>

      <Text style={styles.label}>{t("business.logo")}</Text>
      <View style={styles.logoRow}>
        <View style={styles.logoPreview}>
          {logoPreview ? (
            <Image source={{ uri: logoPreview }} style={styles.logoImage} />
          ) : (
            <MaterialCommunityIcons name="image-outline" size={32} color="#C28E5C" />
          )}
        </View>
        <TouchableOpacity
          style={styles.changeLogoButton}
          onPress={pickLogo}
          disabled={saving}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="camera-plus-outline" size={18} color="#c28e5c" />
          <Text style={styles.changeLogoText}>{t("business.changeLogo")}</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { marginTop: 16 }]}>
        {t("business.description")}
      </Text>
      <TextInput
        style={styles.textArea}
        value={description}
        onChangeText={setDescription}
        placeholder={t("business.descriptionPlaceholder")}
        placeholderTextColor="#999"
        multiline
        numberOfLines={6}
        maxLength={2000}
        editable={!saving}
        textAlignVertical="top"
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={saving || !isDirty}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>{t("account.cancel")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveButton,
            (!isDirty || saving) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!isDirty || saving}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>
            {saving ? t("account.saving") : t("account.saveChanges")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 8,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  logoPreview: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  changeLogoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#c28e5c",
  },
  changeLogoText: {
    color: "#c28e5c",
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    backgroundColor: "#fff",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#c28e5c",
    alignItems: "center",
    maxWidth: 140,
  },
  cancelButtonText: {
    color: "#c28e5c",
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#c28e5c",
    alignItems: "center",
    maxWidth: 140,
  },
  saveButtonDisabled: {
    backgroundColor: "#e0e0e0",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
});

export default BusinessSettings;
