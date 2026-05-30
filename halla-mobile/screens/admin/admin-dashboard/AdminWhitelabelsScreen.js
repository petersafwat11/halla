import React, { useMemo, useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAdminWhitelabelsInfinite, useDebounce } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import TopBar from "../../../components/plans/TopBar";
import { WhitelabelList } from "../../../components/admin-dashboard/whitelabels";
import { SubscriptionAssignmentModal } from "../../../components/admin-dashboard/common";
import { backgrounds } from "../../../styles/tokens";

const AdminWhitelabelsScreen = ({ navigation }) => {
  const toast = useToast();
  const { t } = useTranslation("admin");

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const debouncedSearch = useDebounce(search, 350);
  const filters = useMemo(
    () => ({ search: debouncedSearch, status: activeFilter }),
    [debouncedSearch, activeFilter]
  );

  const {
    items: whitelabels,
    isLoading,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useAdminWhitelabelsInfinite(filters);

  useEffect(() => {
    if (error) toast.error(t("common.error"));
  }, [error, t, toast]);

  const [subModalVisible, setSubModalVisible] = useState(false);
  const [selectedWhitelabel, setSelectedWhitelabel] = useState(null);

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
          hasMore={hasNextPage}
          onLoadMore={fetchNextPage}
          loadingMore={isFetchingNextPage}
          search={search}
          onSearchChange={setSearch}
          activeFilter={activeFilter}
          onActiveFilterChange={setActiveFilter}
          onWhitelabelPress={(w) =>
            navigation.navigate("WhitelabelDetails", { whitelabelId: w._id || w.id })
          }
          onManageSub={handleManageSub}
        />
        <SubscriptionAssignmentModal
          visible={subModalVisible}
          onClose={handleSubClose}
          entity={selectedWhitelabel}
          entityType="whitelabel"
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
