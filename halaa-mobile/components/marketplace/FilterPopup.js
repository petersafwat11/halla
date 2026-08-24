import React, { useEffect } from "react";
import {
  View, StyleSheet, Modal, TouchableOpacity,
  ScrollView, Animated, Dimensions, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import LocalizedText from "../commen/LocalizedText";
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
          {/* Sheet header anatomy (blueprint §7): localized title at the
              reading start/center and the close affordance at the LOGICAL
              END — plain JSX order under the inherited direction, no
              physical anchoring. */}
          <View style={styles.header}>
            <View style={styles.headerBalance} />
            <LocalizedText center style={styles.title} numberOfLines={1}>
              {t("filters.title")}
            </LocalizedText>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, start: 10, end: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t("common.actions.close")}
            >
              <Ionicons name="close" size={24} color={COLORS.textDark} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {hasError && (
              <View style={styles.errorBanner}>
                <LocalizedText style={styles.errorText}>
                  {t("common.errors.locationLoadFailed")}
                </LocalizedText>
                <TouchableOpacity onPress={retryAll} activeOpacity={0.7} style={styles.retryButton} accessibilityRole="button">
                  <LocalizedText style={styles.retryButtonText}>
                    {t("common.actions.retry")}
                  </LocalizedText>
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
                  <LocalizedText center style={styles.noDataText}>{t("filters.noDistricts")}</LocalizedText>
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

          {/* Footer actions stay in logical source order: Reset → Apply. */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.7} accessibilityRole="button">
              <LocalizedText style={styles.resetButtonText}>{t("filters.reset")}</LocalizedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.7} accessibilityRole="button">
              <LocalizedText style={styles.applyButtonText}>{t("filters.apply")}</LocalizedText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const FilterField = ({ label, children }) => (
  <View style={filterGroup}>
    {/* Field metadata always follows the UI locale — never the picked value. */}
    <LocalizedText role="label" style={filterLabel}>{label}</LocalizedText>
    {children}
  </View>
);

const filterGroup = { marginBottom: 24 };
const filterLabel = {
  marginBottom: 8,
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
  headerBalance: { width: 24, height: 24 },
  title: {
    fontSize: 18, fontFamily: "Cairo_700Bold", color: COLORS.textDark,
    flex: 1, marginHorizontal: 12,
  },
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
    alignItems: "center", justifyContent: "center", minHeight: 48, borderWidth: 1, borderColor: COLORS.primary,
  },
  resetButtonText: { fontSize: 16, fontFamily: "Cairo_600SemiBold", color: COLORS.primary },
  applyButton: {
    flex: 1, backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: "center", justifyContent: "center", minHeight: 48,
  },
  applyButtonText: { fontSize: 16, fontFamily: "Cairo_600SemiBold", color: "#FFF" },
  noDataText: { fontSize: 13, fontFamily: "Cairo_400Regular", color: "#888", paddingVertical: 12 },
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
    minHeight: 36,
    justifyContent: "center",
  },
  retryButtonText: { fontSize: 13, fontFamily: "Cairo_600SemiBold", color: "#FFF" },
});
