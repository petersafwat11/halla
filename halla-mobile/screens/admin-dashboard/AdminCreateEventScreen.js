import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useCreateEventForHost } from "../../hooks";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import TopBar from "../../components/plans/TopBar";
import { CreateEventForm } from "../../components/admin-dashboard/events";
import { backgrounds } from "../../styles/tokens";

const AdminCreateEventScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation("admin");
  const toast = useToast();
  const createEvent = useCreateEventForHost();

  const handleSubmit = async (eventData) => {
    try {
      await createEvent.mutateAsync(eventData);
      toast.success(t("events.createSuccess"));
      navigation.goBack();
    } catch (e) {
      toast.error(t("events.createError"));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("events.create")} showBack={true} />
        <CreateEventForm onSubmit={handleSubmit} loading={createEvent.isPending} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  container: { flex: 1, backgroundColor: backgrounds.artboard },
});

export default AdminCreateEventScreen;
