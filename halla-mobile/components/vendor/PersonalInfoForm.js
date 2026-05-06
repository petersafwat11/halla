import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { useTranslation } from "../../localization/hooks/useTranslation";
import TextInput from "../commen/TextInput";
import EmailInput from "../commen/EmailInput";
import Button from "../commen/Button";
import * as ImagePicker from "expo-image-picker";

const PersonalInfoForm = ({ data, onSave, loading }) => {
  const { t } = useTranslation("vendor");
  const methods = useForm({
    defaultValues: {
      ownerFullName: data?.name || "",
      email: data?.email || "",
    },
  });
  const [avatarUri, setAvatarUri] = useState(data?.avatar || null);
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    methods.reset({
      ownerFullName: data?.name || "",
      email: data?.email || "",
    });
    setAvatarUri(data?.avatar || null);
    setAvatarFile(null);
  }, [data?.name, data?.email, data?.avatar]);

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          t("settings.permissions.title"),
          t("settings.permissions.message"),
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
        setAvatarFile(result.assets[0]);
      }
    } catch (error) {
      Alert.alert(t("common.error"), t("settings.imagePickError"));
    }
  };

  const onSubmit = (formValues) => {
    const submitData = { ownerFullName: formValues.ownerFullName, email: formValues.email };
    if (avatarFile) submitData.businessLogo = avatarFile;
    onSave(submitData);
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

          {/* Avatar Upload */}
          <View style={styles.avatarSection}>
            <Text style={styles.label}>{t("settings.personalInfo.avatar")}</Text>
            <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>📷</Text>
                </View>
              )}
              <View style={styles.avatarOverlay}>
                <Text style={styles.avatarOverlayText}>
                  {t("settings.changePhoto")}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Name Input */}
          <View style={styles.inputGroup}>
            <TextInput
              name="ownerFullName"
              label={t("settings.personalInfo.name")}
              placeholder={t("settings.personalInfo.namePlaceholder")}
              rules={{ required: t("settings.validation.nameRequired") }}
            />
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <EmailInput
              name="email"
              label={t("settings.personalInfo.email")}
              placeholder={t("settings.personalInfo.emailPlaceholder")}
              rules={{ required: t("settings.validation.emailRequired") }}
            />
          </View>

          {/* Save Button */}
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
    </FormProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 8,
  },
  avatarContainer: {
    alignSelf: "center",
    position: "relative",
  },
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
  avatarPlaceholderText: {
    fontSize: 36,
  },
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
  inputGroup: {
    marginBottom: 8,
  },
  buttonContainer: {
    marginTop: 16,
  },
});

export default PersonalInfoForm;
