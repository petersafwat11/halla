import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuthStore } from "../../stores/authStore";
import {
  useCreateEventForHost,
  useUpdateAdminEvent,
} from "../../hooks";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import TopBar from "../../components/plans/TopBar";
import { CreateEventForm } from "../../components/admin-dashboard/events";
import { backgrounds } from "../../styles/tokens";

// Unified create-event screen used by every role. The two legacy screens
// (`screens/host/CreateEventScreen.js`, `screens/admin/admin-dashboard/
// CreateEventScreen.js`) collapsed into this one so the host wizard, the
// admin "create for host / create for self" wizard, and the admin update
// flow all live behind a single navigation target.
//
// Role split:
//   - host → 5-step wizard, CreateEventForm owns chrome + submit
//     (`mode="host"`), so we just render the form.
//   - everyone else (super_admin / admin / moderator) →
//     6-step wizard with HostSelector. The screen owns the TopBar and
//     delegates submit to `useCreateEventForHost` / `useUpdateAdminEvent`.
const CreateEventScreen = () => {
  const role = useAuthStore((s) => s.user?.role);
  const isHostRole = role === "host";

  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation("admin");
  const toast = useToast();

  const eventId = route.params?.eventId;
  const initialData = route.params?.eventData;
  const isUpdate = !!eventId;

  const createEvent = useCreateEventForHost();
  const updateEvent = useUpdateAdminEvent();
  const mutation = isUpdate ? updateEvent : createEvent;

  if (isHostRole) {
    return <CreateEventForm mode="host" />;
  }

  const handleSubmit = async (eventData) => {
    try {
      if (isUpdate) {
        await updateEvent.mutateAsync({ eventId, eventData });
        toast.success(t("events.updateSuccess"));
      } else {
        await createEvent.mutateAsync(eventData);
        toast.success(t("events.createSuccess"));
      }
      navigation.goBack();
    } catch (e) {
      toast.error(isUpdate ? t("events.updateError") : t("events.createError"));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar
          title={isUpdate ? t("events.edit") : t("events.create")}
          showBack
        />
        <CreateEventForm
          onSubmit={handleSubmit}
          loading={mutation.isPending}
          initialData={initialData}
          isUpdate={isUpdate}
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
