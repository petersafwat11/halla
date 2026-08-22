import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { mobileAccountSettingsSchema as accountSettingsSchema } from "@halaa/shared/schemas/settings";
import { TextInput, PasswordInput } from "../commen";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import EmailVerificationSection from "./_components/EmailVerificationSection";

const AccountSettings = ({
  onProfileUpdate,
  onPasswordChange,
  initialUser,
  children,
}) => {
  const { t } = useTranslation("settings");
  const toast = useToast();
  const { user: authUser } = useAuthStore();
  const user = initialUser || authUser;

  const [loading, setLoading] = useState(false);

  const methods = useForm({
    resolver: zodResolver(accountSettingsSchema),
    mode: "onChange",
    defaultValues: {
      name: user?.name || "",
      username: user?.username || "",
      email: user?.email || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const {
    handleSubmit,
    formState: { isDirty },
    reset,
    watch,
  } = methods;

  const emailValue = watch("email");

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      let hasChanges = false;
      if (
        data.name !== (user?.name || "") ||
        data.username !== user?.username ||
        data.email !== user?.email
      ) {
        const profileData = {
          name: data.name,
          username: data.username,
          email: data.email,
        };
        await onProfileUpdate(profileData);
        hasChanges = true;
      }

      if (data.currentPassword && data.newPassword) {
        await onPasswordChange({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword,
        });
        hasChanges = true;
      }

      if (hasChanges) {
        toast.success(t("account.updateSuccess"));
      }

      reset({
        name: data.name,
        username: data.username,
        email: data.email,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      if (
        error?.code === "CURRENT_PASSWORD_INVALID" ||
        error?.errorDetail?.code === "CURRENT_PASSWORD_INVALID" ||
        error?.response?.data?.code === "CURRENT_PASSWORD_INVALID" ||
        error?.message?.includes("Current password is incorrect")
      ) {
        toast.error(
          t("account.wrongCurrentPassword", "كلمة المرور الحالية غير صحيحة")
        );
      } else {
        toast.error(error.message || t("account.updateError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
  };

  return (
    <FormProvider {...methods}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("account.personalInfo")}</Text>

            <View style={styles.inputsGroup}>
              <TextInput
                name="name"
                label={t("account.fullName")}
                placeholder={t("account.fullNamePlaceholder")}
                disabled={loading}
              />

              <TextInput
                name="username"
                label={t("account.username")}
                placeholder={t("account.usernamePlaceholder")}
                disabled={loading}
              />

              <EmailVerificationSection emailValue={emailValue} loading={loading} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("account.changePassword")}
            </Text>
            <Text style={styles.sectionDescription}>
              {t("account.changePasswordDescription")}
            </Text>

            <View style={styles.inputsGroup}>
              <PasswordInput
                name="currentPassword"
                label={t("account.currentPassword")}
                placeholder={t("account.currentPasswordPlaceholder")}
                disabled={loading}
              />

              <PasswordInput
                name="newPassword"
                label={t("account.newPassword")}
                placeholder={t("account.newPasswordPlaceholder")}
                disabled={loading}
              />

              <PasswordInput
                name="confirmPassword"
                label={t("account.confirmPassword")}
                placeholder={t("account.confirmPasswordPlaceholder")}
                disabled={loading}
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={loading || !isDirty}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>{t("account.cancel")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                (!isDirty || loading) && styles.saveButtonDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={!isDirty || loading}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>
                {loading ? t("account.saving") : t("account.saveChanges")}
              </Text>
            </TouchableOpacity>
          </View>

          {children}
        </ScrollView>
      </View>
    </FormProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
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
  inputsGroup: {
    width: "100%",
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

export default AccountSettings;
