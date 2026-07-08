import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
const TabsSearchAndFilters = ({
  onTabChange,
  onSearchChange,
  onFilterPress
}) => {
  const [activeTab, setActiveTab] = useState("guests");

  const handleTabPress = (tab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabWrapper}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "guests" && styles.tabActive]}
            onPress={() => handleTabPress("guests")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "guests" && styles.tabTextActive]}
            >
              المدعوين
            </Text>
            <Ionicons
              name="people-outline"
              size={16}
              color={activeTab === "guests" ? "#2C2C2C" : "#656565"}
            />
          </TouchableOpacity>
          {activeTab === "guests" && <View style={styles.activeIndicator} />}
        </View>
        <View style={styles.tabWrapper}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "moderators" && styles.tabActive]}
            onPress={() => handleTabPress("moderators")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "moderators" && styles.tabTextActive]}
            >
              المشرفين
            </Text>
            <Ionicons
              name="people-outline"
              size={16}
              color={activeTab === "moderators" ? "#2C2C2C" : "#656565"}
            />
          </TouchableOpacity>
          {activeTab === "moderators" && <View style={styles.activeIndicator} />}
        </View>
      </View>

      <View style={styles.divider} />

      {/* Search and Filter */}
      <View
        style={styles.searchContainer}
      >
        {/* Search Input */}
        <View style={styles.searchInput}>
          <Ionicons name="search-outline" size={16} color="#767676" />
          <TextInput
            placeholder="اسم المدعو"
            placeholderTextColor="#656565"
            style={styles.input}
            onChangeText={onSearchChange}
          />
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={onFilterPress}
          activeOpacity={0.7}
        >
          <Text style={styles.filterText}>
            التصفية
          </Text>
          <Ionicons name="options-outline" size={16} color="#767676" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12
  },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    padding: 12
  },  tabWrapper: {
    position: "relative",
    flex: 1
  },
  tab: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 4
  },  tabActive: {
    backgroundColor: "transparent"
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#656565",
    lineHeight: 20
  },  tabTextActive: {
    color: "#2C2C2C"
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#C28E5C",
    borderRadius: 9999
  },
  divider: {
    height: 3,
    backgroundColor: "#F2F2F2",
    borderRadius: 9999,
    marginHorizontal: 12
  },
  searchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    gap: 16
  },  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F7F7F7",
    borderRadius: 8
  },  filterText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#656565",
    lineHeight: 16
  },  searchInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#F2F2F2",
    borderRadius: 8,
    height: 36
  },  input: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#656565",
    lineHeight: 16
  },});

export default TabsSearchAndFilters;
