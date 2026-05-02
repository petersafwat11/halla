import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAdminWhitelabels } from "../../hooks";
import { useToast } from "../../contexts/ToastContext";
import { useTranslation } from "../../localization";
import TopBar from "../../components/plans/TopBar";
import { WhitelabelList, WhitelabelSubscriptionModal } from "../../components/admin-dashboard/whitelabels";
import { backgrounds } from "../../styles/tokens";

const AdminWhitelabelsScreen = ({ navigation }) => {
  const toast = useToast();
  const { t } = useTranslation("admin");
  const { data, isLoading, error, refetch } = useAdminWhitelabels({ page: 1, limit: 20 });

  const [subModalVisible, setSubModalVisible] = useState(false);
  const [selectedWhitelabel, setSelectedWhitelabel] = useState(null);

  if (error) toast.error(t("common.error"));

  const whitelabels =
    data?.data?.whitelabels || data?.data?.data || data?.whitelabels || [];

  const handleManageSub = (whitelabel) => {
    setSelectedWhitelabel(whitelabel);
    setSubModalVisible(true);
  };

  const handleSubClose = () => {
    setSubModalVisible(false);
    setSelectedWhitelabel(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("whitelabels.title")} showBack={true} />
        <WhitelabelList
          whitelabels={whitelabels}
          loading={isLoading}
          onRefresh={refetch}
          onWhitelabelPress={(w) =>
            navigation.navigate("WhitelabelDetails", { whitelabelId: w._id || w.id })
          }
          onManageSub={handleManageSub}
        />
        <WhitelabelSubscriptionModal
          visible={subModalVisible}
          onClose={handleSubClose}
          whitelabel={selectedWhitelabel}
          onSave={() => refetch()}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  container: { flex: 1, backgroundColor: backgrounds.artboard },
});

export default AdminWhitelabelsScreen;
