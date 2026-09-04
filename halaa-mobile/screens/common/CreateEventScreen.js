import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as Sentry from "@sentry/react-native";
import { useAuthStore } from "../../stores/authStore";
import { useCreateEventForHost } from "../../hooks";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import TopBar from "../../components/plans/TopBar";
import { CreateEventForm } from "../../components/admin-dashboard/events";
import { presentError, formatErrorDisplay } from "@halaa/shared/errors";
import { backgrounds } from "../../styles/tokens";

// Unified create-event screen used by every role. The two legacy screens
// (`screens/host/CreateEventScreen.js`, `screens/admin/admin-dashboard/
// CreateEventScreen.js`) collapsed into this one so the host wizard and the
// admin "create for host / create for self" wizard live behind a single navigation target.
//
// Role split:
//   - host → 5-step wizard, CreateEventForm owns chrome + submit
//     (`mode="host"`), so we just render the form.
//   - everyone else (super_admin / admin / moderator) →
//     6-step wizard with HostSelector. The screen owns the TopBar and
//     delegates submit to `useCreateEventForHost`.
const CreateEventScreen = () => {
  const role = useAuthStore((s) => s.user?.role);
  const isHostRole = role === "host";

  const navigation = useNavigation();
  const { t, currentLanguage } = useTranslation("admin");
  const toast = useToast();

  const createEvent = useCreateEventForHost();

  if (isHostRole) {
    return <CreateEventForm mode="host" />;
  }

  const handleSubmit = async (eventData) => {
    try {
      await createEvent.mutateAsync(eventData);
      toast.success(t("events.createSuccess"));
      navigation.goBack();
    } catch (e) {
      Sentry.captureException(e, {
        tags: {
          operation: "event.create.admin",
          requestId: e?.requestId || "missing",
          backendCode: e?.code || "unknown",
        },
        extra: { status: e?.status || null, validationErrors: e?.errors || null },
      });
      const lang = currentLanguage === "en" ? "en" : "ar";
      const presented = presentError(e, { language: lang });
      const displayMsg = formatErrorDisplay(presented, lang);
      toast.error(displayMsg);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar
          title={t("events.create")}
          showBack
        />
        <CreateEventForm
          onSubmit={handleSubmit}
          loading={createEvent.isPending}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  container: { flex: 1, backgroundColor: backgrounds.artboard },
});

export default CreateEventScreen;
