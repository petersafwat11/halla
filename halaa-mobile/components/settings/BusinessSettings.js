import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { FormField, LocalizedText } from "../commen";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import { getImageUrl } from "../../utils/imageUtils";

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
  // Backend stores a relative "/uploads/…" ref — absolutize before RN Image.
  const [logoPreview, setLogoPreview] = useState(getImageUrl(user?.avatar));
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setDescription(initialDescription);
    setLogoPreview(getImageUrl(user?.avatar));
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
    setLogoPreview(getImageUrl(user?.avatar));
  };

  return (
    <View style={styles.section}>
      <LocalizedText role="sectionTitle" style={styles.sectionTitle}>
        {t("business.title")}
      </LocalizedText>
      <LocalizedText role="description" style={styles.sectionDescription}>
        {t("business.subtitle")}
      </LocalizedText>

      <LocalizedText role="label" style={styles.label}>
        {t("business.logo")}
      </LocalizedText>
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
          {/* Camera-plus is semantic — never mirrored. */}
          <MaterialCommunityIcons name="camera-plus-outline" size={18} color="#c28e5c" />
          <LocalizedText role="label" style={styles.changeLogoText}>
            {t("business.changeLogo")}
          </LocalizedText>
        </TouchableOpacity>
      </View>

      {/* Business description is arbitrary user/backend content → the shared
          shell with adaptive direction: empty placeholder follows the UI
          locale, a filled value follows its first strong character. The
          counter is LTR-isolated at the logical end. */}
      <FormField
        label={t("business.description")}
        value={description}
        onChangeText={setDescription}
        placeholder={t("business.descriptionPlaceholder")}
        contentDirection="adaptive"
        multiline
        numberOfLines={6}
        maxLength={2000}
        showCounter
        editable={!saving}
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={saving || !isDirty}
          activeOpacity={0.7}
        >
          <LocalizedText role="label" style={styles.cancelButtonText}>
            {t("account.cancel")}
          </LocalizedText>
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
          <LocalizedText role="label" style={styles.saveButtonText}>
            {saving ? t("account.saving") : t("account.saveChanges")}
          </LocalizedText>
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
