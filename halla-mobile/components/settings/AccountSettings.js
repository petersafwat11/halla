import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountSettingsSchema } from "../../utils/schemas/settingsSchema";
import {
  TextInput,
  EmailInput,
  PasswordInput,
  Button,
  OTPInput,
} from "../commen";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import {
  sendEmailVerificationCodeAPI,
  verifyEmailAPI,
} from "../../services/settingsService";

const AccountSettings = ({
  onProfileUpdate,
  onPasswordChange,
}) => {
  const { t } = useTranslation("settings");
  const toast = useToast();
  const { user, token } = useAuthStore();

  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const methods = useForm({
    resolver: zodResolver(accountSettingsSchema),
    mode: "onChange",
    defaultValues: {
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
  const currentPassword = watch("currentPassword");
  const newPassword = watch("newPassword");

  const handleSendVerificationCode = async () => {
    setIsVerifyingEmail(true);
    try {
      await sendEmailVerificationCodeAPI(token);
      setShowVerificationInput(true);
      toast.success(t("account.verificationCodeSent"));
    } catch (error) {
      toast.error(error.message || t("account.verificationCodeError"));
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error(t("account.invalidVerificationCode"));
      return;
    }

    setIsVerifyingEmail(true);
    try {
      await verifyEmailAPI(verificationCode, token);
      toast.success(t("account.emailVerified"));
      setShowVerificationInput(false);
      setVerificationCode("");
    } catch (error) {
      toast.error(error.message || t("account.verificationError"));
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Update profile info if changed
      if (data.username !== user?.username || data.email !== user?.email) {
        const profileData = {
          username: data.username,
          email: data.email,
        };
        await onProfileUpdate(profileData);
      }

      // Change password if provided
      if (data.currentPassword && data.newPassword) {
        await onPasswordChange(data.currentPassword, data.newPassword);
      }

      toast.success(t("account.updateSuccess"));
      reset({
        username: data.username,
        email: data.email,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast.error(error.message || t("account.updateError"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
  };

  return (
    <FormProvider {...methods}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Personal Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("account.personalInfo")}</Text>

            <View style={styles.inputsGroup}>
              <TextInput
                name="username"
                label={t("account.fullName")}
                placeholder={t("account.fullNamePlaceholder")}
                disabled={loading}
              />

              <View style={styles.emailWrapper}>
                <EmailInput
                  name="email"
                  label={t("account.email")}
                  placeholder={t("account.emailPlaceholder")}
                  disabled={loading}
                />

                {!user?.emailVerified && !showVerificationInput && (
                  <TouchableOpacity
                    style={[styles.verifyButton]}
                    onPress={handleSendVerificationCode}
                    disabled={isVerifyingEmail || !emailValue}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.verifyButtonText}>
                      {isVerifyingEmail
                        ? t("account.sending")
                        : t("account.sendCode")}
                    </Text>
                  </TouchableOpacity>
                )}

                {user?.emailVerified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>
                      ✓ {t("account.emailVerified")}
                    </Text>
                  </View>
                )}

                {showVerificationInput && (
                  <View style={styles.verificationGroup}>
                    <OTPInput
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      length={6}
                    />
                    <TouchableOpacity
                      style={[
                        styles.verifyCodeButton,
                        (isVerifyingEmail || verificationCode.length !== 6) &&
                          styles.verifyCodeButtonDisabled,
                      ]}
                      onPress={handleVerifyCode}
                      disabled={
                        isVerifyingEmail || verificationCode.length !== 6
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.verifyCodeButtonText}>
                        {isVerifyingEmail
                          ? t("account.verifying")
                          : t("account.verifyCode")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Change Password Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("account.changePassword")}
            </Text>
            <Text style={[styles.sectionDescription]}>
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

          {/* Action Buttons */}
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

        </ScrollView>
      </Animated.View>
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
  emailWrapper: {
    width: "100%",
  },
  verifyButton: {
    backgroundColor: "#c28e5c",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  verifiedBadge: {
    backgroundColor: "#4caf50",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  verifiedText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  verificationGroup: {
    marginTop: 16,
    width: "100%",
  },
  verifyCodeButton: {
    backgroundColor: "#c28e5c",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  verifyCodeButtonDisabled: {
    backgroundColor: "#e0e0e0",
  },
  verifyCodeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  buttonContainer: {
    flexDirection: "row-reverse",
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
