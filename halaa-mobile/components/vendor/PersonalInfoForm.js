import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput as RNTextInput,
} from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";

import { useTranslation } from "../../localization/hooks/useTranslation";
import { useToast } from "../../contexts/ToastContext";
import TextInput from "../commen/TextInput";
import EmailInput from "../commen/EmailInput";
import Button from "../commen/Button";
import { mobilePersonalInfoSchema as personalInfoSchema } from "@halla/shared/schemas/vendor";
import { usersApi } from "../../hooks/users/_api";
import PhoneChangeOtpModal from "./PhoneChangeOtpModal";

/**
 * Personal Info — single consolidated section.
 *
 * Image handling matches web + ImagesAndPricingForm:
 *   - Picking a file shows it locally; it is committed on Save (PATCH upload
 *     overwrites the businessLogo on the server).
 *   - Pressing × on a pending pick clears local state only.
 *   - Pressing × on the existing (server-side) avatar fires
 *     `usersApi.deleteVendorImage('businessLogo')` and asks the parent to
 *     refetch so the next render no longer shows the old logo.
 */
const PersonalInfoForm = ({ data, onSave, onPhoneChanged, onRefetch, loading }) => {
  const { t } = useTranslation("vendor");
  const toast = useToast();
  const methods = useForm({
    resolver: zodResolver(personalInfoSchema(t)),
    defaultValues: {
      ownerFullName: data?.ownerFullName || "",
      brandName: data?.brandName || "",
      email: data?.email || "",
      phoneNumber: data?.phoneNumber || "",
    },
  });
  const existingAvatar = data?.avatar || null;
  const [avatarFile, setAvatarFile] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState(data?.phoneNumber || "");
  const [otpCandidate, setOtpCandidate] = useState(null);
  const [isDeletingLogo, setIsDeletingLogo] = useState(false);

  useEffect(() => {
    methods.reset({
      ownerFullName: data?.ownerFullName || "",
      brandName: data?.brandName || "",
      email: data?.email || "",
      phoneNumber: data?.phoneNumber || "",
    });
    setAvatarFile(null);
    setPhoneNumber(data?.phoneNumber || "");
  }, [
    data?.ownerFullName,
    data?.brandName,
    data?.email,
    data?.phoneNumber,
    data?.avatar,
  ]);

  // Preview: pending pick wins over the server-side value.
  const previewUri = avatarFile?.uri || existingAvatar;
  const isPendingPick = !!avatarFile;

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("settings.permissions.title"),
          t("settings.permissions.message")
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setAvatarFile(result.assets[0]);
      }
    } catch (_e) {
      Alert.alert(t("common.error"), t("settings.imagePickError"));
    }
  };

  const handleRemove = () => {
    if (isPendingPick) {
      setAvatarFile(null);
      return;
    }
    if (!existingAvatar) return;
    Alert.alert(
      t("settings.personalInfo.confirmDeleteLogoTitle", "Delete logo?"),
      t("settings.personalInfo.confirmDeleteLogoMsg", "This cannot be undone."),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("common.delete", "Delete"),
          style: "destructive",
          onPress: async () => {
            setIsDeletingLogo(true);
            try {
              await usersApi.deleteVendorImage("businessLogo");
              toast.success(
                t("settings.imagesAndPricing.deleted", "Image deleted")
              );
              if (onRefetch) onRefetch();
            } catch (err) {
              toast.error(
                err.message ||
                  t("settings.imagesAndPricing.deleteFailed", "Failed to delete image")
              );
            } finally {
              setIsDeletingLogo(false);
            }
          },
        },
      ]
    );
  };

  const onSubmit = (formValues) => {
    const vendor = {
      ownerFullName: formValues.ownerFullName,
      brandName: formValues.brandName,
    };
    if (avatarFile) vendor.businessLogo = avatarFile;

    onSave({
      main: { email: formValues.email },
      vendor,
    });

    const phoneChanged =
      (phoneNumber || "").trim() !== (data?.phoneNumber || "").trim();
    if (phoneChanged && phoneNumber) {
      setOtpCandidate(phoneNumber.trim());
    }
  };

  return (
    <FormProvider {...methods}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("settings.personalInfo.title")}
          </Text>
          <Text style={styles.sectionDescription}>
            {t("settings.personalInfo.description")}
          </Text>

          <View style={styles.avatarSection}>
            <Text style={styles.label}>
              {t("settings.personalInfo.avatar")}
            </Text>
            <View style={styles.avatarContainer}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                {previewUri ? (
                  <Image source={{ uri: previewUri }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarPlaceholderText}>📷</Text>
                  </View>
                )}
                <View style={styles.avatarOverlay}>
                  <Text style={styles.avatarOverlayText}>
                    {previewUri
                      ? t("settings.changePhoto")
                      : t("settings.uploadImage", "Upload image")}
                  </Text>
                </View>
              </TouchableOpacity>
              {previewUri && (
                <TouchableOpacity
                  style={styles.avatarRemove}
                  onPress={handleRemove}
                  disabled={isDeletingLogo}
                  accessibilityLabel={t("common.delete", "Delete")}
                >
                  {isDeletingLogo ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.avatarRemoveText}>✕</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              name="ownerFullName"
              label={t("settings.personalInfo.name")}
              placeholder={t("settings.personalInfo.namePlaceholder")}
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              name="brandName"
              label={t(
                "settings.basicAccountInfo.businessName",
                "Business name"
              )}
              placeholder={t(
                "settings.basicAccountInfo.businessNamePlaceholder",
                "Enter your business name"
              )}
            />
          </View>

          <View style={styles.inputGroup}>
            <EmailInput
              name="email"
              label={t("settings.personalInfo.email")}
              placeholder={t("settings.personalInfo.emailPlaceholder")}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t(
                "settings.basicAccountInfo.phoneWhatsapp",
                "Phone / WhatsApp"
              )}
            </Text>
            <Text style={styles.helper}>
              {t(
                "settings.basicAccountInfo.phoneHelp",
                "Changing your phone number requires verification via OTP."
              )}
            </Text>
            <RNTextInput
              style={styles.phoneInput}
              placeholder="+966 5XX XXX XXXX"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              text={t("settings.saveChanges")}
              onPress={methods.handleSubmit(onSubmit)}
              loading={loading}
              disabled={loading}
            />
          </View>
        </View>
      </ScrollView>

      <PhoneChangeOtpModal
        visible={!!otpCandidate}
        phoneNumber={otpCandidate}
        onClose={() => setOtpCandidate(null)}
        onSuccess={() => {
          setOtpCandidate(null);
          if (onPhoneChanged) onPhoneChanged();
        }}
      />
    </FormProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#888",
    marginBottom: 20,
  },
  avatarSection: { alignItems: "center", marginBottom: 24 },
  label: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 8,
  },
  helper: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#888",
    marginBottom: 8,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fff",
    minHeight: 50,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
  },
  avatarContainer: { alignSelf: "center", position: "relative" },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#c28e5c",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0ebe5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e0d5c9",
    borderStyle: "dashed",
  },
  avatarPlaceholderText: { fontSize: 36 },
  avatarOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(194, 142, 92, 0.85)",
    paddingVertical: 6,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    alignItems: "center",
  },
  avatarOverlayText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Cairo_600SemiBold",
  },
  avatarRemove: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#c0392b",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarRemoveText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
  },
  inputGroup: { marginBottom: 8 },
  buttonContainer: { marginTop: 16 },
});

export default PersonalInfoForm;
