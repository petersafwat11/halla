import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCreateEventForHost, useUpdateAdminEvent } from "../../hooks";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import TopBar from "../../components/plans/TopBar";
import { CreateEventForm } from "../../components/admin-dashboard/events";
import { backgrounds } from "../../styles/tokens";

const CreateEventScreen = () => {
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
        <TopBar title={isUpdate ? t("events.edit") : t("events.create")} showBack={true} />
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
