import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import RNTextInput from "../../commen/DirectionalTextInput";
import LocalizedText from "../../commen/LocalizedText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import ServiceCard from "./Service";

const EmptyServiceState = React.memo(({ onAddService, t }) => (
  <View style={styles.emptyStateContainer}>
    <MaterialCommunityIcons name="briefcase-outline" size={48} color="#CCC" />
    <LocalizedText role="sectionTitle" center style={styles.emptyStateTitle}>
      {t("services.noServices")}
    </LocalizedText>
    <LocalizedText role="description" center style={styles.emptyStateSubtitle}>
      {t("services.noServicesHint")}
    </LocalizedText>
    <TouchableOpacity
      style={styles.addButton}
      onPress={onAddService}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t("services.addService")}
    >
      <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
      <LocalizedText style={styles.addButtonText}>
        {t("services.addService")}
      </LocalizedText>
    </TouchableOpacity>
  </View>
));

const Services = ({
  services = [],
  onAddService,
  onEditService,
  onDeleteService,
  onToggleService,
  headerComponent = null,
}) => {
  const { t } = useTranslation("vendor");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filters = [
    { id: "all", label: t("services.filterAll"), icon: "list" },
    { id: "active", label: t("services.filterActive"), icon: "check-circle" },
    { id: "inactive", label: t("services.filterInactive"), icon: "circle-outline" },
  ];

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesFilter =
        selectedFilter === "active"
          ? service.isAvailable
          : selectedFilter === "inactive"
            ? !service.isAvailable
            : true;
      if (!matchesFilter) return false;
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      const nameMatch = service.name?.toLowerCase().includes(query);
      const nameArMatch = service._raw?.nameAr?.toLowerCase().includes(query);
      const tagMatch = service.categories?.some((c) =>
        c?.toLowerCase().includes(query)
      );
      return nameMatch || nameArMatch || tagMatch;
    });
  }, [services, selectedFilter, searchQuery]);

  const handleFilterChange = useCallback((filterId) => {
    setSelectedFilter(filterId);
  }, []);

  const renderService = useCallback(
    ({ item }) => (
      <ServiceCard
        id={item.id}
        name={item.name}
        imageUri={item.imageUri}
        categories={item.categories}
        price={item.price}
        isAvailable={item.isAvailable}
        onEdit={() => onEditService?.(item)}
        onDelete={() => onDeleteService?.(item.id)}
        onToggle={() => onToggleService?.(item.id)}
      />
    ),
    [onEditService, onDeleteService, onToggleService],
  );

  const renderListHeader = useCallback(
    () => (
      <View>
        {headerComponent}

        {/* Header with Search and Add Button */}
        <View style={styles.headerContainer}>
          <View style={styles.searchAndAddContainer}>
            <TouchableOpacity
              style={styles.addServiceButton}
              onPress={onAddService}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t("services.addService")}
            >
              <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.searchInputContainer}>
              {/* Search glyph is a semantic leading icon — never mirrored. */}
              <MaterialCommunityIcons name="magnify" size={16} color="#767676" />
              {/* Search queries are arbitrary user text (blueprint §5.3):
                  empty placeholder follows the UI locale, a filled value
                  follows its first strong character. */}
              <RNTextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t("services.searchPlaceholder")}
                placeholderTextColor="#767676"
                contentDirection="adaptive"
                style={styles.searchInput}
              />
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filtersContainer}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                selectedFilter === filter.id && styles.filterButtonActive,
              ]}
              onPress={() => handleFilterChange(filter.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedFilter === filter.id }}
            >
              <MaterialCommunityIcons
                name={filter.icon}
                size={14}
                color={selectedFilter === filter.id ? "#C28E5C" : "#656565"}
              />
              <LocalizedText
                role="label"
                style={[
                  styles.filterText,
                  selectedFilter === filter.id && styles.filterTextActive,
                ]}
              >
                {filter.label}
              </LocalizedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    ),
    [
      headerComponent,
      onAddService,
      searchQuery,
      t,
      filters,
      selectedFilter,
      handleFilterChange,
    ],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredServices}
        renderItem={renderService}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          <EmptyServiceState onAddService={onAddService} t={t} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F4EF",
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#FFF",
  },
  searchAndAddContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  addServiceButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#C28E5C",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#C28E5C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
    paddingVertical: 0,
  },
  filtersContainer: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F2F2F2",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: "#F5ECE4",
  },
  filterText: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
    lineHeight: 16,
  },
  filterTextActive: {
    color: "#C28E5C",
    fontFamily: "Cairo_600SemiBold",
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C",
    marginTop: 16,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    marginTop: 8,
    textAlign: "center",
  },
  addButton: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#C28E5C",
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
    lineHeight: 20,
  },
});

export default Services;
