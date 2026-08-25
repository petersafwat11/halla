import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { mobileAccountSettingsSchema as accountSettingsSchema } from "@halaa/shared/schemas/settings";
import { TextInput, PasswordInput, LocalizedText } from "../commen";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import EmailVerificationSection from "./_components/EmailVerificationSection";
import KeyboardAwareFormScrollView from "../commen/keyboard/KeyboardAwareFormScrollView";

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

  // Schema factory resolves the opaque `validation.*` keys through the
  // active locale so field errors always follow the UI language.
  const methods = useForm({
    resolver: zodResolver(accountSettingsSchema(t)),
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

  React.useEffect(() => {
    reset({
      name: user?.name || "",
      username: user?.username || "",
      email: user?.email || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }, [user?.name, user?.username, user?.email, reset]);

  const emailValue = watch("email");

  const onSubmit = async (data) => {
    setLoading(true);
    let profileSuccess = false;
    let passwordSuccess = false;
    let profileError = null;
    let passwordError = null;

    const profileChanged =
      data.name !== (user?.name || "") ||
      data.username !== user?.username ||
      data.email !== user?.email;
    const passwordProvided = !!(data.currentPassword && data.newPassword);

    if (profileChanged) {
      try {
        const profileData = {
          name: data.name,
          username: data.username,
          email: data.email,
        };
        await onProfileUpdate(profileData);
        profileSuccess = true;
      } catch (err) {
        profileError = err;
      }
    }

    if (passwordProvided) {
      try {
        await onPasswordChange({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword,
        });
        passwordSuccess = true;
      } catch (err) {
        passwordError = err;
      }
    }

    if (profileSuccess && passwordSuccess) {
      toast.success(t("account.updateSuccess"));
    } else if (profileSuccess && !passwordError) {
      toast.success(t("account.updateSuccess"));
    } else if (passwordSuccess && !profileError) {
      toast.success(t("account.passwordUpdateSuccess"));
    } else if (profileSuccess && passwordError) {
      toast.error(t("account.profileSavedPasswordFailed"));
    } else if (passwordSuccess && profileError) {
      toast.error(t("account.passwordSavedProfileFailed"));
    } else if (passwordError || profileError) {
      const error = passwordError || profileError;
      if (
        error?.code === "CURRENT_PASSWORD_INVALID" ||
        error?.errorDetail?.code === "CURRENT_PASSWORD_INVALID" ||
        error?.response?.data?.code === "CURRENT_PASSWORD_INVALID" ||
        error?.message?.includes("Current password is incorrect")
      ) {
        toast.error(t("account.wrongCurrentPassword"));
      } else {
        toast.error(error.message || t("account.updateError"));
      }
    }

    reset({
      name: profileSuccess ? data.name : (user?.name || ""),
      username: profileSuccess ? data.username : (user?.username || ""),
      email: profileSuccess ? data.email : (user?.email || ""),
      currentPassword: passwordSuccess ? "" : data.currentPassword,
      newPassword: passwordSuccess ? "" : data.newPassword,
      confirmPassword: passwordSuccess ? "" : data.confirmPassword,
    });
    setLoading(false);
  };

  const handleCancel = () => {
    reset();
  };

  return (
    <FormProvider {...methods}>
      <View style={styles.container}>
        <KeyboardAwareFormScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <LocalizedText role="sectionTitle" style={styles.sectionTitle}>
              {t("account.personalInfo")}
            </LocalizedText>

            <View style={styles.inputsGroup}>
              {/* Full name is arbitrary user content: empty placeholder
                  follows the UI locale; a filled value follows its first
                  strong character so "Ali" stays LTR and "علي" stays RTL. */}
              <TextInput
                name="name"
                label={t("account.fullName")}
                placeholder={t("account.fullNamePlaceholder")}
                contentDirection="adaptive"
                disabled={loading}
              />

              <TextInput
                name="username"
                label={t("account.username")}
                placeholder={t("account.usernamePlaceholder")}
                contentDirection="ltr"
                disabled={loading}
              />

              <EmailVerificationSection emailValue={emailValue} loading={loading} />
            </View>
          </View>

          <View style={styles.section}>
            <LocalizedText role="sectionTitle" style={styles.sectionTitle}>
              {t("account.changePassword")}
            </LocalizedText>
            <LocalizedText
              role="description"
              style={styles.sectionDescription}
            >
              {t("account.changePasswordDescription")}
            </LocalizedText>

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
              <LocalizedText role="label" style={styles.cancelButtonText}>
                {t("account.cancel")}
              </LocalizedText>
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
              <LocalizedText role="label" style={styles.saveButtonText}>
                {loading ? t("account.saving") : t("account.saveChanges")}
              </LocalizedText>
            </TouchableOpacity>
          </View>

          {children}
        </KeyboardAwareFormScrollView>
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
