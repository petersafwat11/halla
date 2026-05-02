import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  TextInput,
  ActivityIndicator,
  FlatList,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import marketplaceService from "../../services/marketplaceService";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const FilterDropdown = ({ value, options, onSelect, placeholder, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder;
  const isPlaceholder = !options.find((o) => o.value === value);

  return (
    <>
      <TouchableOpacity
        style={[styles.dropdownTrigger, disabled && styles.dropdownDisabled]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-down" size={18} color={disabled ? "#B0B0B0" : "#656565"} />
        <Text
          style={[styles.dropdownText, isPlaceholder && styles.dropdownPlaceholder]}
          numberOfLines={1}
        >
          {selectedLabel}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.dropdownOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.dropdownModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dropdownModalHeader}>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#2C2C2C" />
              </TouchableOpacity>
              <Text style={styles.dropdownModalTitle}>{placeholder}</Text>
              <View style={{ width: 22 }} />
            </View>
            <FlatList
              data={options}
              keyExtractor={(item, i) => String(item.value ?? i)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dropdownOption, value === item.value && styles.dropdownOptionActive]}
                  onPress={() => { onSelect(item.value); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownOptionText, value === item.value && styles.dropdownOptionTextActive]}>
                    {item.label}
                  </Text>
                  {value === item.value && <Ionicons name="checkmark" size={18} color="#C28E5C" />}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.dropdownOptionsList}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const FilterPopup = ({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
}) => {
  const { t, i18n } = useTranslation("marketplace");
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Local state for filters
  const [localFilters, setLocalFilters] = useState({
    serviceType: "all",
    regionId: "",
    cityId: "",
    districtIds: [],
    minPrice: "",
    maxPrice: "",
    minRating: "",
  });

  // Location data
  const [regions, setRegions] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // Initialize local filters from props
  useEffect(() => {
    if (filters) {
      setLocalFilters(filters);
    }
  }, [filters]);

  // Fetch regions on mount
  useEffect(() => {
    fetchRegions();
    fetchServiceTypes();
  }, []);

  // Fetch cities when region changes
  useEffect(() => {
    if (localFilters.regionId) {
      fetchCities(localFilters.regionId);
    } else {
      setCities([]);
      setDistricts([]);
    }
  }, [localFilters.regionId]);

  // Fetch districts when city changes
  useEffect(() => {
    if (localFilters.cityId) {
      fetchDistricts(localFilters.cityId);
    } else {
      setDistricts([]);
    }
  }, [localFilters.cityId]);

  const fetchRegions = async () => {
    try {
      const response = await marketplaceService.getRegions();
      if (response.status === "success") {
        const regionsData = response.data?.regions || response.data || [];
        setRegions(Array.isArray(regionsData) ? regionsData : []);
      }
    } catch (error) {
      console.error("Error fetching regions:", error);
    }
  };

  const fetchServiceTypes = async () => {
    try {
      const response = await marketplaceService.getServiceTypes(i18n.language);
      if (response.status === "success") {
        const isAr = i18n.language === "ar";
        const categories = response.data?.categories || response.data || [];
        setServiceTypes(
          (Array.isArray(categories) ? categories : []).map((c) => ({
            key: c.key,
            name: isAr ? c.nameAr : c.nameEn,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching service types:", error);
    }
  };

  const fetchCities = async (regionId) => {
    try {
      setLoadingCities(true);
      const response = await marketplaceService.getCities(regionId);
      if (response.status === "success") {
        const citiesData = response.data?.cities || response.data || [];
        setCities(Array.isArray(citiesData) ? citiesData : []);
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchDistricts = async (cityId) => {
    try {
      setLoadingDistricts(true);
      const response = await marketplaceService.getDistricts(cityId);
      if (response.status === "success") {
        const districtsData = response.data?.districts || response.data || [];
        setDistricts(Array.isArray(districtsData) ? districtsData : []);
      }
    } catch (error) {
      console.error("Error fetching districts:", error);
    } finally {
      setLoadingDistricts(false);
    }
  };

  const updateFilter = (key, value) => {
    setLocalFilters((prev) => {
      const newFilters = { ...prev, [key]: value };
      // Clear dependent filters
      if (key === "regionId") {
        newFilters.cityId = "";
        newFilters.districtIds = [];
      }
      if (key === "cityId") {
        newFilters.districtIds = [];
      }
      return newFilters;
    });
  };

  const toggleDistrict = (districtId) => {
    setLocalFilters((prev) => {
      const districtIds = prev.districtIds || [];
      const index = districtIds.indexOf(districtId);
      if (index > -1) {
        return {
          ...prev,
          districtIds: districtIds.filter((id) => id !== districtId),
        };
      } else {
        return {
          ...prev,
          districtIds: [...districtIds, districtId],
        };
      }
    });
  };

  const handleApply = () => {
    onApplyFilters && onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      serviceType: "all",
      regionId: "",
      cityId: "",
      districtIds: [],
      minPrice: "",
      maxPrice: "",
      minRating: "",
    };
    setLocalFilters(resetFilters);
    onResetFilters && onResetFilters();
  };

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.popup,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#2C2C2C" />
            </TouchableOpacity>
            <Text style={styles.title}>{t("filters.title")}</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Section Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.label}>{t("filters.section")}</Text>
              <FilterDropdown
                value={localFilters.serviceType}
                onSelect={(value) => updateFilter("serviceType", value)}
                placeholder={t("filters.allSections")}
                options={[
                  { label: t("filters.allSections"), value: "all" },
                  ...serviceTypes.map((type) => ({ label: type.name, value: type.key })),
                ]}
              />
            </View>

            {/* Region Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.label}>{t("filters.region")}</Text>
              <FilterDropdown
                value={localFilters.regionId}
                onSelect={(value) => updateFilter("regionId", value)}
                placeholder={t("filters.allRegions")}
                options={[
                  { label: t("filters.allRegions"), value: "" },
                  ...regions.map((r) => ({ label: r.name_ar, value: r.region_id })),
                ]}
              />
            </View>

            {/* City Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.label}>{t("filters.city")}</Text>
              {loadingCities ? (
                <View style={styles.dropdownTrigger}>
                  <ActivityIndicator size="small" color="#C28E5C" />
                </View>
              ) : (
                <FilterDropdown
                  value={localFilters.cityId}
                  onSelect={(value) => updateFilter("cityId", value)}
                  placeholder={t("filters.allCities")}
                  disabled={!localFilters.regionId}
                  options={[
                    { label: t("filters.allCities"), value: "" },
                    ...cities.map((c) => ({ label: c.name_ar, value: c.city_id })),
                  ]}
                />
              )}
            </View>

            {/* Districts Filter */}
            {localFilters.cityId && districts.length > 0 && (
              <View style={styles.filterGroup}>
                <Text style={styles.label}>{t("filters.districts")}</Text>
                {loadingDistricts ? (
                  <ActivityIndicator size="small" color="#C28E5C" />
                ) : (
                  <View style={styles.checkboxGroup}>
                    {districts.map((district) => (
                      <TouchableOpacity
                        key={district.district_id}
                        style={styles.checkboxItem}
                        onPress={() => toggleDistrict(district.district_id)}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            localFilters.districtIds?.includes(
                              district.district_id,
                            ) && styles.checkboxActive,
                          ]}
                        >
                          {localFilters.districtIds?.includes(
                            district.district_id,
                          ) && (
                            <Ionicons name="checkmark" size={16} color="#FFF" />
                          )}
                        </View>
                        <Text style={styles.checkboxLabel}>
                          {district.name_ar}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Price Range Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.label}>{t("filters.priceRange")}</Text>
              <View style={styles.priceRangeContainer}>
                <TextInput
                  style={styles.priceInput}
                  placeholder={t("filters.minPrice")}
                  keyboardType="numeric"
                  value={localFilters.minPrice}
                  onChangeText={(value) => updateFilter("minPrice", value)}
                />
                <Text style={styles.priceSeparator}>-</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder={t("filters.maxPrice")}
                  keyboardType="numeric"
                  value={localFilters.maxPrice}
                  onChangeText={(value) => updateFilter("maxPrice", value)}
                />
              </View>
            </View>

            {/* Rating Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.label}>{t("filters.rating")}</Text>
              <FilterDropdown
                value={localFilters.minRating}
                onSelect={(value) => updateFilter("minRating", value)}
                placeholder={t("filters.allRatings")}
                options={[
                  { label: t("filters.allRatings"), value: "" },
                  { label: t("filters.4stars"), value: "4" },
                  { label: t("filters.3stars"), value: "3" },
                  { label: t("filters.2stars"), value: "2" },
                ]}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <Text style={styles.resetButtonText}>{t("filters.reset")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
              activeOpacity={0.7}
            >
              <Text style={styles.applyButtonText}>{t("filters.apply")}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  overlayTouchable: {
    flex: 1,
  },
  popup: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
    minHeight: SCREEN_HEIGHT * 0.5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  title: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    textAlign: "center",
    flex: 1,
  },
  placeholder: {
    width: 24,
    height: 24,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  filterGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C",
    marginBottom: 8,
    textAlign: "right",
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#DFDFDF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 50,
    gap: 10,
  },
  dropdownDisabled: {
    backgroundColor: "#F5F5F5",
    opacity: 0.6,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
    textAlign: "right",
    lineHeight: 22,
  },
  dropdownPlaceholder: {
    color: "#9CA3AF",
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  dropdownModal: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
  },
  dropdownModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  dropdownModalTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
  },
  dropdownOptionsList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dropdownOption: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  dropdownOptionActive: {
    backgroundColor: "#FBF5EF",
    borderRadius: 10,
    borderBottomColor: "transparent",
  },
  dropdownOptionText: {
    fontSize: 15,
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
    lineHeight: 24,
  },
  dropdownOptionTextActive: {
    color: "#C28E5C",
    fontFamily: "Cairo_600SemiBold",
  },
  priceRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priceInput: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#DFDFDF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    textAlign: "right",
  },
  priceSeparator: {
    fontSize: 16,
    color: "#2C2C2C",
  },
  checkboxGroup: {
    gap: 12,
  },
  checkboxItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: "#C28E5C",
    borderColor: "#C28E5C",
  },
  checkboxLabel: {
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F2",
    flexDirection: "row",
    gap: 12,
  },
  resetButton: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C28E5C",
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#C28E5C",
  },
  applyButton: {
    flex: 1,
    backgroundColor: "#C28E5C",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
  },
});

export default FilterPopup;
