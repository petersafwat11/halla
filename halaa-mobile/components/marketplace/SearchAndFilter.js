import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import TextInput from "../commen/DirectionalTextInput";
import LocalizedText from "../commen/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import { countToken } from "@halaa/shared/utils/displayTokens";

const SearchAndFilter = ({
  onSearch,
  onFilterPress,
  searchQuery,
  activeFiltersCount = 0,
}) => {
  const { t, currentLanguage } = useTranslation("marketplace");
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handleFilterPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onFilterPress && onFilterPress();
  };

  return (
    <View style={styles.container}>
      {/* Search Input — arbitrary user text, so the content mode is adaptive:
          the empty placeholder follows the UI locale while a typed value
          follows its own first strong character (blueprint §5.3). The search
          glyph is a semantic leading icon; it is never mirrored. */}
      <View style={[styles.searchContainer, isFocused && styles.searchFocused]}>
        <Ionicons
          name="search-outline"
          size={20}
          color="#2C2C2C"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          contentDirection="adaptive"
          placeholder={t("search.placeholder")}
          placeholderTextColor="#656565"
          value={searchQuery}
          onChangeText={onSearch}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          returnKeyType="search"
          accessibilityRole="search"
        />
      </View>

      {/* Filter Button */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={handleFilterPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t("search.filter")}
        >
          <Ionicons name="options-outline" size={20} color="#656565" />
          <LocalizedText style={styles.filterText}>{t("search.filter")}</LocalizedText>
          {activeFiltersCount > 0 && (
            <View style={styles.badge}>
              {/* Active-filter badge is an isolated locale-formatted count. */}
              <LocalizedText style={styles.badgeText}>
                {countToken(activeFiltersCount, currentLanguage)}
              </LocalizedText>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F2F2F2",
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 48,
  },
  searchFocused: {
    borderColor: "#C28E5C",
  },
  searchIcon: {
    marginEnd: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#2C2C2C",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F2F2F2",
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 48,
    gap: 6,
  },
  filterText: {
    fontSize: 14,
    color: "#656565",
  },
  badge: {
    backgroundColor: "#C28E5C",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginStart: 4,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default SearchAndFilter;
