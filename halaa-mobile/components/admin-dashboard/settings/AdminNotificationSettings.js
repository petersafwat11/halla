import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { ToggleInput } from "../../commen";
import { useTranslation } from "../../../localization";
import { useToast } from "../../../contexts/ToastContext";
import LocalizedText from "../../commen/LocalizedText";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";

const AdminNotificationSettings = ({ initialData, onUpdate, emailVerified = false }) => {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Default values based on backend NotificationPreferencesModel for admin/super_admin/moderator
  const defaultValues = {
    appNotifications: {
      newUsers: true,
      vendorApprovals: true,
      supportTickets: true,
      systemAlerts: true,
      paymentAlerts: true,
      subscriptionAlerts: true,
    },
    emailNotifications: {
      dailyReport: true,
      weeklyReport: true,
      vendorApprovals: true,
      supportTickets: false,
      criticalAlerts: true,
    },
  };

  const methods = useForm({
    mode: "onChange",
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isDirty },
    reset,
  } = methods;

  // Merge server data with defaults when initialData loads
  React.useEffect(() => {
    if (initialData) {
      const serverApp = initialData.appNotifications || {};
      const serverEmail = initialData.emailNotifications || {};
      reset({
        appNotifications: {
          ...defaultValues.appNotifications,
          ...serverApp,
        },
        emailNotifications: {
          ...defaultValues.emailNotifications,
          ...serverEmail,
        },
      });
    }
  }, [initialData, reset]);

  const handleCancel = () => {
    reset(initialData || defaultValues);
  };

  const onSubmit = async (data) => {
    // Web parity: enabling email notifications requires a verified email.
    if (!emailVerified) {
      const hasEnabledEmailNotif = Object.values(
        data.emailNotifications || {}
      ).some((v) => v === true);
      if (hasEnabledEmailNotif) {
        toast.error(t("settings.notifications.emailNotVerified"));
        return;
      }
    }

    setLoading(true);
    try {
      await onUpdate(data);
      toast.success(t("settings.notifications.updateSuccess"));
      reset(data);
    } catch (error) {
      toast.error(error.message || t("settings.notifications.updateError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* App Notifications Section */}
          <View style={styles.section}>
            <LocalizedText role="sectionTitle" style={styles.sectionTitle}>
              {t("settings.notifications.appNotifications")}
            </LocalizedText>
            <LocalizedText role="description" style={styles.sectionDescription}>
              {t("settings.notifications.appDescription")}
            </LocalizedText>

            <View style={styles.togglesGroup}>
              <ToggleInput
                name="appNotifications.newUsers"
                label={t("settings.notifications.newUsers")}
                disabled={loading}
              />
              <ToggleInput
                name="appNotifications.vendorApprovals"
                label={t("settings.notifications.vendorApprovals")}
                disabled={loading}
              />
              <ToggleInput
                name="appNotifications.supportTickets"
                label={t("settings.notifications.supportTickets")}
                disabled={loading}
              />
              <ToggleInput
                name="appNotifications.systemAlerts"
                label={t("settings.notifications.systemAlerts")}
                disabled={loading}
              />
              <ToggleInput
                name="appNotifications.paymentAlerts"
                label={t("settings.notifications.paymentAlerts")}
                disabled={loading}
              />
              <ToggleInput
                name="appNotifications.subscriptionAlerts"
                label={t("settings.notifications.subscriptionAlerts")}
                disabled={loading}
              />
            </View>
          </View>

          {/* Email Notifications Section */}
          <View style={styles.section}>
            <LocalizedText role="sectionTitle" style={styles.sectionTitle}>
              {t("settings.notifications.emailNotifications")}
            </LocalizedText>
            <LocalizedText role="description" style={styles.sectionDescription}>
              {t("settings.notifications.emailDescription")}
            </LocalizedText>

            {/* Web parity: email preferences stay locked until the account
                email is verified (Account Settings → Send Code). */}
            {!emailVerified && (
              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={16} color="#8a6d3b" />
                <LocalizedText
                  role="description"
                  style={styles.warningText}
                >
                  {t("settings.notifications.emailNotVerifiedWarning")}
                </LocalizedText>
              </View>
            )}

            <View style={styles.togglesGroup}>
              <ToggleInput
                name="emailNotifications.dailyReport"
                label={t("settings.notifications.dailyReport")}
                disabled={loading || !emailVerified}
              />
              <ToggleInput
                name="emailNotifications.weeklyReport"
                label={t("settings.notifications.weeklyReport")}
                disabled={loading || !emailVerified}
              />
              <ToggleInput
                name="emailNotifications.vendorApprovals"
                label={t("settings.notifications.vendorApprovals")}
                disabled={loading || !emailVerified}
              />
              <ToggleInput
                name="emailNotifications.supportTickets"
                label={t("settings.notifications.supportTickets")}
                disabled={loading || !emailVerified}
              />
              <ToggleInput
                name="emailNotifications.criticalAlerts"
                label={t("settings.notifications.criticalAlerts")}
                disabled={loading || !emailVerified}
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
              <LocalizedText style={styles.cancelButtonText}>
                {t("common.cancel")}
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
              <LocalizedText style={styles.saveButtonText}>
                {loading ? t("common.loading") : t("common.save")}
              </LocalizedText>
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
    backgroundColor: backgrounds.card[1],
  },
  scrollContent: {
    padding: spacing[20],
    paddingBottom: spacing[40],
  },
  section: {
    marginBottom: spacing[32],
  },
  sectionTitle: {
    ...textStyles.titleMedium,
    color: colors.natural[900],
    marginBottom: spacing[8],
  },
  sectionDescription: {
    ...textStyles.bodyMedium,
    color: colors.natural[500],
    marginBottom: spacing[16],
    lineHeight: 20,
  },
  togglesGroup: {
    width: "100%",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    backgroundColor: "#fff8ec",
    borderColor: "#f0d9b5",
    borderWidth: 1,
    borderRadius: borderRadius[8],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    marginBottom: spacing[16],
  },
  warningText: {
    flex: 1,
    ...textStyles.bodyMedium,
    color: "#8a6d3b",
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing[24],
    gap: spacing[12],
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius[8],
    borderWidth: 1,
    borderColor: colors.primary[500],
    alignItems: "center",
    maxWidth: 140,
  },
  cancelButtonText: {
    color: colors.primary[500],
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.semibold,
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius[8],
    backgroundColor: colors.primary[500],
    alignItems: "center",
    maxWidth: 140,
  },
  saveButtonDisabled: {
    backgroundColor: colors.natural[200],
  },
  saveButtonText: {
    color: colors.natural[50],
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default AdminNotificationSettings;
