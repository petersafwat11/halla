import React, { useEffect } from "react";
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, Animated, Dimensions, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import { FilterDropdown } from "./_components/FilterDropdown";
import { DistrictCheckboxes, PriceRangeInputs } from "./_components/FilterInputs";
import { useFilterData } from "../../hooks/useFilterData";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const COLORS = {
  primary: "#C28E5C", textDark: "#2C2C2C", bgLight: "#FFF",
  borderLight: "#F2F2F2", overlay: "rgba(0, 0, 0, 0.5)",
};

export default function FilterPopup({ visible, onClose, filters, onApplyFilters, onResetFilters }) {
  const { t, i18n } = useTranslation("marketplace");
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const {
    localFilters, setLocalFilters, regions, cities, districts,
    serviceTypes, loadingCities, loadingDistricts,
    regionsError, citiesError, districtsError,
    updateFilter, toggleDistrict, resetFilters, retryAll,
  } = useFilterData(i18n.language);
  const hasError = Boolean(regionsError || citiesError || districtsError);

  useEffect(() => {
    if (filters) setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0, tension: 50, friction: 8, useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT, duration: 300, useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleApply = () => { onApplyFilters?.(localFilters); onClose(); };
  const handleReset = () => { resetFilters(); onResetFilters?.(); };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.popup, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={COLORS.textDark} />
            </TouchableOpacity>
            <Text style={styles.title}>{t("filters.title")}</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {hasError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>
                  {t("common.errors.locationLoadFailed", "Couldn't load locations")}
                </Text>
                <TouchableOpacity onPress={retryAll} activeOpacity={0.7} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>
                    {t("common.actions.retry", "Retry")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <FilterField label={t("filters.section")}>
              <FilterDropdown
                value={localFilters.serviceType}
                onSelect={(v) => updateFilter("serviceType", v)}
                placeholder={t("filters.allSections")}
                options={[
                  { label: t("filters.allSections"), value: "all" },
                  ...serviceTypes.map((type) => ({ label: type.name, value: type.key })),
                ]}
              />
            </FilterField>

            <FilterField label={t("filters.region")}>
              <FilterDropdown
                value={localFilters.regionId}
                onSelect={(v) => updateFilter("regionId", v)}
                placeholder={t("filters.allRegions")}
                options={[
                  { label: t("filters.allRegions"), value: "" },
                  ...regions.map((r) => ({ label: r.displayName, value: r.region_id })),
                ]}
              />
            </FilterField>

            <FilterField label={t("filters.city")}>
              {loadingCities ? (
                <View style={styles.dropdownTrigger}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : (
                <FilterDropdown
                  value={localFilters.cityId}
                  onSelect={(v) => updateFilter("cityId", v)}
                  placeholder={t("filters.allCities")}
                  disabled={!localFilters.regionId}
                  options={[
                    { label: t("filters.allCities"), value: "" },
                    ...cities.map((c) => ({ label: c.displayName, value: c.city_id })),
                  ]}
                />
              )}
            </FilterField>

            {localFilters.cityId && (
              <FilterField label={t("filters.districts")}>
                {loadingDistricts ? (
                  <View style={styles.dropdownTrigger}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  </View>
                ) : districts.length > 0 ? (
                  <DistrictCheckboxes
                    districts={districts}
                    selectedIds={localFilters.districtIds}
                    onToggle={toggleDistrict}
                    loading={false}
                  />
                ) : (
                  <Text style={styles.noDataText}>{t("filters.noDistricts")}</Text>
                )}
              </FilterField>
            )}

            <FilterField label={t("filters.priceRange")}>
              <PriceRangeInputs
                minPrice={localFilters.minPrice}
                maxPrice={localFilters.maxPrice}
                onChange={updateFilter}
                t={t}
              />
            </FilterField>

            <FilterField label={t("filters.rating")}>
              <FilterDropdown
                value={localFilters.minRating}
                onSelect={(v) => updateFilter("minRating", v)}
                placeholder={t("filters.allRatings")}
                options={[
                  { label: t("filters.allRatings"), value: "" },
                  { label: t("filters.4stars"), value: "4" },
                  { label: t("filters.3stars"), value: "3" },
                  { label: t("filters.2stars"), value: "2" },
                ]}
              />
            </FilterField>

          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.7}>
              <Text style={styles.resetButtonText}>{t("filters.reset")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.7}>
              <Text style={styles.applyButtonText}>{t("filters.apply")}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const FilterField = ({ label, children }) => (
  <View style={filterGroup}>
    <Text style={filterLabel}>{label}</Text>
    {children}
  </View>
);

const filterGroup = { marginBottom: 24 };
const filterLabel = {
  fontSize: 14, fontFamily: "Cairo_600SemiBold",
  color: COLORS.textDark, marginBottom: 8, textAlign: "right",
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: "flex-end" },
  overlayTouchable: { flex: 1 },
  popup: {
    backgroundColor: COLORS.bgLight, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.8, minHeight: SCREEN_HEIGHT * 0.5,
  },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  title: {
    fontSize: 18, fontFamily: "Cairo_700Bold", color: COLORS.textDark,
    textAlign: "center", flex: 1,
  },
  placeholder: { width: 24, height: 24 },
  content: { flex: 1, padding: 20 },
  dropdownTrigger: {
    flexDirection: "row", alignItems: "center", backgroundColor: COLORS.bgLight,
    borderRadius: 12, borderWidth: 1.5, borderColor: "#DFDFDF",
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 50, gap: 10,
  },
  footer: {
    padding: 20, borderTopWidth: 1, borderTopColor: COLORS.borderLight,
    flexDirection: "row", gap: 12,
  },
  resetButton: {
    flex: 1, backgroundColor: COLORS.bgLight, borderRadius: 12, paddingVertical: 14,
    alignItems: "center", borderWidth: 1, borderColor: COLORS.primary,
  },
  resetButtonText: { fontSize: 16, fontFamily: "Cairo_600SemiBold", color: COLORS.primary },
  applyButton: {
    flex: 1, backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: "center",
  },
  applyButtonText: { fontSize: 16, fontFamily: "Cairo_600SemiBold", color: "#FFF" },
  noDataText: { fontSize: 13, fontFamily: "Cairo_400Regular", color: "#888", textAlign: "center", paddingVertical: 12 },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Cairo_500Medium", color: "#B91C1C" },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryButtonText: { fontSize: 13, fontFamily: "Cairo_600SemiBold", color: "#FFF" },
});
