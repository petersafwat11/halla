import React, { useState, useMemo } from "react";
import {
  FlatList,
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
import EventListItem from "./EventListItem";
import { exportEvents } from "../../services/eventsService2";
import { saveBlobAndShare } from "../../utils/download";
import { useAuthStore } from "../../stores/authStore";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, live, ended, draft
  const [exporting, setExporting] = useState(false);
  const token = useAuthStore((state) => state.token);

  // Phase 4 W3-ADMIN — host export of all events to XLSX. The blob is
  // saved to cache and the native share sheet is opened so the user
  // can pipe it to Files / Mail / Drive.
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await exportEvents(token);
      if (!result?.blob) {
        throw new Error("Empty export response");
      }
      const share = await saveBlobAndShare(result.blob, result.filename || "events.xlsx", {
        dialogTitle: "تصدير المناسبات",
      });
      // Surface only real failures; user-cancel and the no-message
      // success path stay silent.
      if (!share.success && share.message) {
        Alert.alert("تصدير", share.message);
      }
    } catch (error) {
      console.error("[EventList] export failed:", error);
      Alert.alert("تصدير", error.message || "تعذر تصدير المناسبات");
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
        if (statusFilter === "draft") {
          return status === "draft";
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

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Stats Cards — same style as home StatsCards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: "#F9F4EF" }]}>
          <View style={styles.statIconContainer}>
            <PeopleIcon color="#C28E5C" />
          </View>
          <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>إجمالي الضيوف</Text>
          <Text style={styles.statValue}>{allGuests}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#EAF4EF" }]}>
          <View style={styles.statIconContainer}>
            <CheckCircleIcon color="#2A8C5B" />
          </View>
          <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>قبول الضيوف</Text>
          <Text style={styles.statValue}>{attendanceRate}%</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#FBF3E6" }]}>
          <View style={styles.statIconContainer}>
            <ChartIcon color="#D38200" />
          </View>
          <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>معدل الاستجابة</Text>
          <Text style={styles.statValue}>{responseRate}%</Text>
        </View>
      </View>

      {/* Search Bar + Export */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث عن مناسبة..."
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
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="download-outline" size={18} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {[
          { key: "all", label: "الكل" },
          { key: "live", label: "مباشرة" },
          { key: "scheduled", label: "مجدولة" },
          { key: "completed", label: "منتهية" },
          { key: "draft", label: "مسودة" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.filterTab,
              statusFilter === tab.key && styles.filterTabActive,
            ]}
            onPress={() => setStatusFilter(tab.key)}
          >
            <Text
              style={[
                styles.filterText,
                statusFilter === tab.key && styles.filterTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (!events || events.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>لا توجد مناسبات حالياً</Text>
        </View>
      </View>
    );
  }

  if (filteredEvents.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>لا توجد نتائج للبحث</Text>
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
    paddingBottom: 24,
  },
  headerContainer: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  statCard: {
    flex: 1,
    padding: 12,
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F2F2F2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statIconContainer: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 7,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 28,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Cairo_700Bold",
    color: "#656565",
    lineHeight: 16,
    letterSpacing: 0.06,
    textAlign: "center",
  },
  searchRow: {
    flexDirection: "row-reverse",
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
    textAlign: "right",
    paddingVertical: 0,
  },
  filterContainer: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: "#C28E5C",
    borderColor: "#C28E5C",
  },
  filterText: {
    fontSize: 12,
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
