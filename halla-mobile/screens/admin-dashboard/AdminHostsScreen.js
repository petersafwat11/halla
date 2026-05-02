import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAdminHosts } from "../../hooks";
import { useAuthStore } from "../../stores/authStore";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import { canEditPage, PAGES } from "../../utils/adminPermissions";
import TopBar from "../../components/plans/TopBar";
import { HostList, AddHostModal, SubscriptionModal } from "../../components/admin-dashboard/hosts";
import { backgrounds } from "../../styles/tokens";

const AdminHostsScreen = ({ navigation }) => {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const role = useAuthStore((state) => state.user?.role);
  const { data, isLoading, error, refetch } = useAdminHosts({ page: 1, limit: 20 });

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [subModalVisible, setSubModalVisible] = useState(false);
  const [selectedHostForSub, setSelectedHostForSub] = useState(null);

  if (error) toast.error(t("common.error"));

  const handleManageSubscription = (host) => {
    setSelectedHostForSub(host);
    setSubModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("hosts.title")} showBack={true} />
        <HostList
          hosts={data?.data?.hosts || []}
          loading={isLoading}
          onRefresh={refetch}
          onHostPress={(host) => navigation.navigate("HostDetails", { hostId: host.id || host._id })}
          onManageSubscription={handleManageSubscription}
          onAdd={canEditPage(role, PAGES.HOSTS) ? () => setAddModalVisible(true) : undefined}
          addLabel={t("hosts.addHost")}
        />
        <AddHostModal visible={addModalVisible} onClose={() => setAddModalVisible(false)} onSuccess={() => refetch()} />
        <SubscriptionModal
          visible={subModalVisible}
          onClose={() => { setSubModalVisible(false); setSelectedHostForSub(null); }}
          host={selectedHostForSub}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  container: { flex: 1, backgroundColor: backgrounds.artboard },
});

export default AdminHostsScreen;
