import React, { useState, useMemo } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Svg, Path } from "react-native-svg";
import { formatPercent, formatNumber } from "@halaa/shared/utils/locale";
import EventListItem from "./EventListItem";
import { useExportEvents } from "../../hooks/events/mutations/useEventMutation";
import { saveBlobAndShare } from "../../utils/download";
import { useTranslation } from "../../localization";
import { useInputDirection } from "../../hooks/useInputDirection";

// Same SVG icons as home StatsCards
const PeopleIcon = ({ color }) => (
  <Svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M3 21V19C3 16.7909 4.79086 15 7 15H11C13.2091 15 15 16.7909 15 19V21"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M16 3.13C17.8604 3.58 19.1908 5.27 19.1908 7.19C19.1908 9.11 17.8604 10.8 16 11.26"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M21 21V19C20.99 17.08 19.67 15.4 18 14.94"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

const CheckCircleIcon = ({ color }) => (
  <Svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M8 12L10.5 14.5L16 9"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

const ChartIcon = ({ color }) => (
  <Svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 20V10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M12 20V4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M6 20V14" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

const EventList = ({
  events,
  onEventPress,
  ListItemComponent = EventListItem,
  allGuests = 0,
  attendanceRate = 0,
  responseRate = 0,
}) => {
  const { t, currentLanguage } = useTranslation("events");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exporting, setExporting] = useState(false);
  const exportEventsMutation = useExportEvents();
  // Explicit localized direction for the iOS search placeholder.
  const searchDirectionStyle = useInputDirection("localized");

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await exportEventsMutation.mutateAsync();
      if (!result?.blob) {
        throw new Error("Empty export response");
      }
      const share = await saveBlobAndShare(result.blob, result.filename || "events.xlsx", {
        dialogTitle: t("list.exportTitle", { defaultValue: "تصدير المناسبات" }),
      });
      if (!share.success && share.message) {
        Alert.alert(t("list.exportTitle", { defaultValue: "تصدير" }), share.message);
      }
    } catch (error) {
      console.error("[EventList] export failed:", error);
      Alert.alert(
        t("list.exportTitle", { defaultValue: "تصدير" }),
        error.message || t("list.exportError", { defaultValue: "تعذر تصدير المناسبات" })
      );
    } finally {
      setExporting(false);
    }
  };

  // Filter and search events
  const filteredEvents = useMemo(() => {
    if (!events) return [];

    let filtered = [...events];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((event) => {
        const status = event.status?.toLowerCase();
        if (statusFilter === "live") {
          return status === "live";
        }
        if (statusFilter === "scheduled") {
          return status === "scheduled";
        }
        if (statusFilter === "completed") {
          return status === "completed" || status === "cancelled";
        }
        if (statusFilter === "pending_scheduling") {
          return status === "pending_scheduling";
        }
        return true;
      });
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((event) => {
        const title = event.title?.toLowerCase() || "";
        const type = (event.eventType || event.type || "").toLowerCase();
        return title.includes(query) || type.includes(query);
      });
    }

    return filtered;
  }, [events, searchQuery, statusFilter]);

  const renderItem = ({ item, index }) => (
    <ListItemComponent
      event={item}
      onPress={() => onEventPress(item)}
      index={index}
    />
  );

  const filterTabs = [
    { key: "all", label: t("list.status.all", { defaultValue: "الكل" }) },
    { key: "live", label: t("list.status.live", { defaultValue: "مباشرة" }) },
    { key: "scheduled", label: t("list.status.scheduled", { defaultValue: "مجدولة" }) },
    { key: "completed", label: t("list.status.completed", { defaultValue: "منتهية" }) },
    { key: "pending_scheduling", label: t("list.status.pending_scheduling", { defaultValue: "في انتظار الجدولة" }) },
  ];

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: "#C28E5C18" }]}>
            <PeopleIcon color="#C28E5C" />
          </View>
          <Text style={styles.statValue}>{formatNumber(allGuests, currentLanguage)}</Text>
          <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>
            {t("list.totalGuests", { defaultValue: "إجمالي الضيوف" })}
          </Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: "#2A8C5B18" }]}>
            <CheckCircleIcon color="#2A8C5B" />
          </View>
          <Text style={styles.statValue}>{formatNumber(attendanceRate, currentLanguage)}</Text>
          <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>
            {t("list.confirmedCount", { defaultValue: "عدد القبول" })}
          </Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: "#D3820018" }]}>
            <ChartIcon color="#D38200" />
          </View>
          <Text style={styles.statValue}>{formatPercent(responseRate, currentLanguage)}</Text>
          <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>
            {t("list.responseRate", { defaultValue: "معدل الاستجابة" })}
          </Text>
        </View>
      </View>

      {/* Search Bar + Export */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={[styles.searchInput, searchDirectionStyle]}
            placeholder={t("list.searchPlaceholder", { defaultValue: "ابحث عن مناسبة..." })}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExport}
          disabled={exporting}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t("list.exportTitle", { defaultValue: "تصدير" })}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="download-outline" size={18} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Tabs — horizontal scrollable pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
        style={styles.filterScroll}
      >
        {filterTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.filterTab,
              statusFilter === tab.key && styles.filterTabActive,
            ]}
            onPress={() => setStatusFilter(tab.key)}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
          >
            <Text
              style={[
                styles.filterText,
                statusFilter === tab.key && styles.filterTextActive,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (!events || events.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {t("list.empty", { defaultValue: "لا توجد مناسبات حالياً" })}
          </Text>
        </View>
      </View>
    );
  }

  if (filteredEvents.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {t("list.noResults", { defaultValue: "لا توجد نتائج للبحث" })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredEvents}
      renderItem={renderItem}
      keyExtractor={(item, index) => item._id || item.id || index.toString()}
      ListHeaderComponent={renderHeader}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 88, // Clearance for floating action button
  },
  headerContainer: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F0EAE2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 28,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
    lineHeight: 16,
    textAlign: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    gap: 8,
  },
  exportButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#C28E5C",
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    paddingVertical: 0,
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
  },
  filterTabActive: {
    backgroundColor: "#C28E5C",
    borderColor: "#C28E5C",
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#656565",
  },
  filterTextActive: {
    color: "#FFF",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
  },
});

export default EventList;
