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
import { mobileNotificationSettingsSchema as notificationSettingsSchema } from "@halla/shared/schemas/settings";
import { ToggleInput } from "../commen";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";

const NotificationSettings = ({ initialData, onUpdate }) => {
  const { t } = useTranslation("settings");
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

  // Matches backend NotificationPreferencesModel defaults for host role.
  // Email + SMS preferences were removed — plan/payment emails always fire,
  // every other host email was deleted with the preferences UI.
  const defaultValues = {
    appNotifications: {
      eventUpdates: true,
      eventReminders: true,
      guestResponses: true,
      guestCheckIns: true,
      subscriptionAlerts: true,
      systemUpdates: true,
    },
  };

  const methods = useForm({
    resolver: zodResolver(notificationSettingsSchema),
    mode: "onChange",
    defaultValues: defaultValues,
  });

  const {
    handleSubmit,
    formState: { isDirty },
    reset,
  } = methods;

  // Reset form when initialData changes
  React.useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await onUpdate(data);
      toast.success(t("notifications.updateSuccess"));
      reset(data);
    } catch (error) {
      toast.error(error.message || t("notifications.updateError"));
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
              {t("notifications.appNotifications")}
            </Text>
            <Text style={[styles.sectionDescription]}>
              {t("notifications.appNotificationsDescription")}
            </Text>

            <View style={styles.togglesGroup}>
              <ToggleInput
                name="appNotifications.eventUpdates"
                label={t("notifications.eventUpdates")}
                disabled={loading}
              />

              <ToggleInput
                name="appNotifications.eventReminders"
                label={t("notifications.eventReminders")}
                disabled={loading}
              />

              <ToggleInput
                name="appNotifications.guestResponses"
                label={t("notifications.guestResponses")}
                disabled={loading}
              />

              <ToggleInput
                name="appNotifications.guestCheckIns"
                label={t("notifications.guestCheckIns")}
                disabled={loading}
              />

              <ToggleInput
                name="appNotifications.subscriptionAlerts"
                label={t("notifications.subscriptionAlerts")}
                disabled={loading}
              />

              <ToggleInput
                name="appNotifications.systemUpdates"
                label={t("notifications.systemUpdates")}
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
                {t("notifications.cancel")}
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
                {loading
                  ? t("notifications.saving")
                  : t("notifications.saveChanges")}
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
  togglesGroup: {
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

export default NotificationSettings;
