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
import { ToggleInput } from "../../commen";
import { useTranslation } from "../../../localization";
import { useToast } from "../../../contexts/ToastContext";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";

const AdminNotificationSettings = ({ initialData, onUpdate }) => {
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

  const onSubmit = async (data) => {
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

  const handleCancel = () => {
    reset(initialData || defaultValues);
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
            <Text style={styles.sectionTitle}>
              {t("settings.notifications.appNotifications")}
            </Text>
            <Text style={styles.sectionDescription}>
              {t("settings.notifications.appDescription")}
            </Text>

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
            <Text style={styles.sectionTitle}>
              {t("settings.notifications.emailNotifications")}
            </Text>
            <Text style={styles.sectionDescription}>
              {t("settings.notifications.emailDescription")}
            </Text>

            <View style={styles.togglesGroup}>
              <ToggleInput
                name="emailNotifications.dailyReport"
                label={t("settings.notifications.dailyReport")}
                disabled={loading}
              />
              <ToggleInput
                name="emailNotifications.weeklyReport"
                label={t("settings.notifications.weeklyReport")}
                disabled={loading}
              />
              <ToggleInput
                name="emailNotifications.vendorApprovals"
                label={t("settings.notifications.vendorApprovals")}
                disabled={loading}
              />
              <ToggleInput
                name="emailNotifications.supportTickets"
                label={t("settings.notifications.supportTickets")}
                disabled={loading}
              />
              <ToggleInput
                name="emailNotifications.criticalAlerts"
                label={t("settings.notifications.criticalAlerts")}
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
              <Text style={styles.cancelButtonText}>
                {t("common.cancel")}
              </Text>
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
                {loading ? t("common.loading") : t("common.save")}
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
