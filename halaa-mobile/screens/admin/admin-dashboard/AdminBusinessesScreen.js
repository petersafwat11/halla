import React, { useMemo, useState, useEffect, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAdminBusinessesInfinite } from "../../../hooks";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, PAGES } from "../../../utils/adminPermissions";
import { useTranslation } from "../../../localization";
import { useToast } from "../../../contexts/ToastContext";
import TopBar from "../../../components/plans/TopBar";
import LocalizedText from "../../../components/commen/LocalizedText";
import {
  AdminFlatList,
  SearchBar,
  ManagePlanModal,
} from "../../../components/admin-dashboard/common";
import {
  BusinessListItem,
  AddBusinessModal,
} from "../../../components/admin-dashboard/businesses";
import {
  colors,
  spacing,
  backgrounds,
  borderRadius,
  typography,
} from "../../../styles/tokens";

const FILTERS = ["all", "active", "suspended", "inactive"];

const AdminBusinessesScreen = ({ navigation }) => {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const role = useAuthStore((state) => state.user?.role);
  const canEdit = canEditPage(role, PAGES.BUSINESSES);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [addModalVisible, setAddModalVisible] = useState(false);

  const filters = useMemo(
    () => ({ search, status: activeFilter }),
    [search, activeFilter]
  );

  const {
    items: businesses,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error,
  } = useAdminBusinessesInfinite(filters);

  useEffect(() => {
    if (error) toast.error(t("common.error"));
  }, [error]);

  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);

  const handleManagePlan = useCallback((business) => {
    setSelectedBusiness(business);
    setPlanModalVisible(true);
  }, []);

  const renderItem = useCallback(
    ({ item }) => (
      <BusinessListItem
        business={item}
        onPress={() =>
          navigation.navigate("BusinessDetails", {
            businessId: item.id || item._id,
          })
        }
        onManagePlan={() => handleManagePlan(item)}
      />
    ),
    [navigation, handleManagePlan]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar
          title={t("businesses.title")}
          showBack={true}
          rightContent={
            canEdit ? (
              <TouchableOpacity
                onPress={() => setAddModalVisible(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={t("businesses.create.title", "Add Business")}
              >
                <Ionicons name="add" size={26} color={colors.natural[50]} />
              </TouchableOpacity>
            ) : null
          }
        />

        <View style={styles.controls}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={t("businesses.searchPlaceholder")}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map((f) => {
              const active = activeFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setActiveFilter(f)}
                  activeOpacity={0.7}
                >
                  <LocalizedText style={[styles.chipText, active && styles.chipTextActive]}>
                    {t(`businesses.filter.${f}`)}
                  </LocalizedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <AdminFlatList
          data={businesses}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id || item._id)}
          loading={isLoading}
          onRefresh={refetch}
          hasMore={hasNextPage}
          onLoadMore={fetchNextPage}
          loadingMore={isFetchingNextPage}
          emptyIcon="briefcase-outline"
          emptyTitle={t("businesses.empty.title")}
          emptyMessage={t("businesses.empty.message")}
        />

        <ManagePlanModal
          visible={planModalVisible}
          onClose={() => {
            setPlanModalVisible(false);
            setSelectedBusiness(null);
          }}
          entity={selectedBusiness}
          entityType="business"
          onSave={() => refetch()}
        />

        <AddBusinessModal
          visible={addModalVisible}
          onClose={() => setAddModalVisible(false)}
          onSaved={() => refetch()}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  container: { flex: 1, backgroundColor: backgrounds.artboard },
  controls: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
    paddingBottom: spacing[8],
    gap: spacing[12],
  },
  filterRow: {
    gap: spacing[8],
    paddingVertical: spacing[4],
  },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chip: {
    paddingHorizontal: spacing[16],
    height: 44,
    minWidth: 72,
    borderRadius: borderRadius[20],
    backgroundColor: backgrounds.card[1],
    borderWidth: 1,
    borderColor: colors.natural[200],
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  chipText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.large,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[700],
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: typography.fontWeight.semibold,
  },
});

export default AdminBusinessesScreen;
