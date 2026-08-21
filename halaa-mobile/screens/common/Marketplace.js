import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TopBar from "../../components/plans/TopBar";
import { FilterPopup, SearchAndFilter, VendorCards } from "../../components/marketplace";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import { useMarketplaceVendors, useVendorCategories } from "../../hooks/marketplace";
import { backgrounds, colors, spacing } from "../../styles/tokens";

const EMPTY_FILTERS = { serviceType: "all", regionId: "", cityId: "", districtIds: [], minPrice: "", maxPrice: "", minRating: "" };

// Canonical service-category → Ionicons map.
const CATEGORY_ICONS = {
  all: "grid-outline",
  eventPlanning: "calendar-outline",
  mediaProduction: "videocam-outline",
  giftsAndGiveaways: "gift-outline",
  foodAndBeverages: "restaurant-outline",
  beautyAndFashion: "sparkles-outline",
  logisticsAndDelivery: "cube-outline",
  corporateServices: "briefcase-outline",
  supportServices: "help-buoy-outline",
  technicalServices: "construct-outline",
  soundLightingEntertainment: "musical-notes-outline",
  hallsAndVenues: "business-outline",
};

export default function Marketplace({ navigation }) {
  const { t, i18n } = useTranslation("marketplace");
  const toast = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const categoriesQuery = useVendorCategories();

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const queryFilters = useMemo(() => ({ ...filters, search, districtIds: filters.districtIds, rating: filters.minRating, lang: i18n.language }), [filters, search, i18n.language]);
  const { data, isLoading, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useMarketplaceVendors(queryFilters);
  useEffect(() => { if (error) toast.error(t("errors.loadFailed")); }, [error, toast, t]);

  const vendors = useMemo(() => (data?.pages?.flatMap((page) => page?.data || []) || []).map((vendor) => {
    const value = vendor.location || vendor.serviceLocation;
    const isAr = i18n.language === "ar";
    return {
      ...vendor,
      description: vendor.tagline || vendor.shortDescription,
      serviceCategories: vendor.categories || vendor.serviceCategories || [],
      location: [isAr ? value?.cityNameAr : value?.cityNameEn, isAr ? value?.regionNameAr : value?.regionNameEn].filter(Boolean).join("، ") || t("vendor.defaultLocation"),
      minPrice: vendor.startingPrice?.amount ?? vendor.minPrice,
      currency: vendor.startingPrice?.currency || t("vendor.sar"),
    };
  }), [data, i18n.language, t]);

  const categories = categoriesQuery.data?.data?.categories || [];
  const total = data?.pages?.[0]?.pagination?.total || vendors.length;
  const activeFilterCount = [filters.serviceType !== "all", filters.regionId, filters.cityId, filters.districtIds?.length, filters.minPrice, filters.maxPrice, filters.minRating].filter(Boolean).length;
  const chooseCategory = (value) => setFilters((current) => ({ ...current, serviceType: value }));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary[500]} />
      <TopBar title={`${t("title")}${total ? ` (${total})` : ""}`} onBack={() => navigation?.goBack()} showBack={false} />
      <View style={styles.content}>
        <SearchAndFilter searchQuery={searchInput} onSearch={setSearchInput} onFilterPress={() => setFiltersOpen(true)} activeFiltersCount={activeFilterCount} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categories}
        >
          {[{ key: "all", label: t("sections.all") }, ...categories.map((item) => ({ key: item.key, label: i18n.language === "ar" ? item.nameAr : item.nameEn }))].map((item) => {
            const active = filters.serviceType === item.key;
            return (
              <TouchableOpacity key={item.key} style={[styles.category, active && styles.categoryActive]} onPress={() => chooseCategory(item.key)}>
                <Ionicons name={CATEGORY_ICONS[item.key] || "grid-outline"} size={15} color={active ? colors.natural[50] : colors.primary[500]} />
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.resultRow}><Text style={styles.resultTitle}>{t("results.title", { count: total })}</Text><Text style={styles.resultHint}>{t("results.subtitle")}</Text></View>
        <VendorCards vendors={vendors} onVendorPress={(vendor) => navigation.navigate("VendorPublicProfile", { vendorId: vendor.id })} loading={isLoading} error={error} onRetry={refetch} onReset={() => { setFilters(EMPTY_FILTERS); setSearchInput(""); setSearch(""); }} refreshing={isRefetching} onRefresh={refetch} onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()} isFetchingNextPage={isFetchingNextPage} />
      </View>
      <FilterPopup visible={filtersOpen} onClose={() => setFiltersOpen(false)} filters={filters} onApplyFilters={setFilters} onResetFilters={() => setFilters(EMPTY_FILTERS)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary[500] },
  content: { flex: 1, backgroundColor: backgrounds.artboard },
  categoriesScroll: { flexGrow: 0, flexShrink: 0 },
  categories: { paddingHorizontal: spacing[16], paddingBottom: spacing[12], gap: spacing[8] },
  category: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing[14] || 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.natural[250], backgroundColor: colors.natural[50] },
  categoryActive: { borderColor: colors.primary[500], backgroundColor: colors.primary[500] },
  categoryText: { fontFamily: "Cairo_600SemiBold", fontSize: 12, color: colors.natural[450] },
  categoryTextActive: { color: colors.natural[50] },
  resultRow: { paddingHorizontal: spacing[24], paddingBottom: spacing[8] },
  resultTitle: { fontFamily: "Cairo_700Bold", fontSize: 17, color: colors.natural[900] },
  resultHint: { fontFamily: "Cairo_400Regular", fontSize: 11, color: colors.natural[450] },
});
