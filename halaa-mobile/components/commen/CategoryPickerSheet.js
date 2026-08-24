import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Keyboard,
} from "react-native";
import DirectionalTextInput from "./DirectionalTextInput";
import LocalizedText from "./LocalizedText";
import AdaptiveText from "./AdaptiveText";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import KeyboardSafeModalSheet from "./keyboard/KeyboardSafeModalSheet";

/**
 * CategoryPickerSheet — the shared creatable category picker bottom-sheet.
 *
 * One implementation used everywhere a category is chosen on mobile: the
 * per-guest CategorySelect field, the bulk "link to category" flow on the
 * guest list, and the reuse/vCard pickers. Search an existing label, pick the
 * "none" row to clear, or create a new label from the typed text. Controlled
 * via `visible` + `onSelect(value)`.
 *
 * Keyboard contract (blueprint §6.4/§10): presented through the shared
 * KeyboardSafeModalSheet; the search field is focused only after the native
 * modal reports `onShow` (never via pre-presentation autoFocus), and picking
 * a row dismisses the keyboard before the sheet closes.
 *
 * Direction contract (blueprint §5/§6): sheet title and the "none" row are
 * localized app copy; search queries and user-created category labels are
 * arbitrary user text rendered adaptively (first strong character) with
 * first-strong isolation; the search icon leads, the close action and
 * selected checkmark trail — all through logical JSX order.
 */
const CategoryPickerSheet = ({
  visible,
  onClose,
  onSelect,
  value = "",
  options = [],
  title,
  searchPlaceholder,
  noneLabel,
  createLabel,
}) => {
  const { t } = useTranslation("createEvent");
  const [query, setQuery] = useState("");
  const searchInputRef = useRef(null);

  const resolvedSearchPlaceholder = searchPlaceholder ?? t("category_search_placeholder");
  const resolvedNoneLabel = noneLabel ?? t("category_none_label");
  const resolvedCreateLabel = createLabel ?? ((q) => t("category_create_label", { query: q }));

  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  // Focus handoff happens after native presentation (§10): the sheet's final
  // geometry is known, so no autofocus-before-measurement jump occurs.
  const handleShow = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const choose = useCallback(
    (val) => {
      // Dismiss the keyboard before closing so the close transition does not
      // tear against the keyboard animation (§10).
      Keyboard.dismiss();
      onSelect?.(val);
      onClose?.();
    },
    [onSelect, onClose]
  );

  const q = query.trim();
  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(q.toLowerCase())),
    [options, q]
  );
  const exactExists = options.some((o) => o.toLowerCase() === q.toLowerCase());

  const header = (
    <>
      {title ? (
        <LocalizedText role="sectionTitle" center style={styles.title}>
          {title}
        </LocalizedText>
      ) : null}

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#929FA5" />
        <DirectionalTextInput
          ref={searchInputRef}
          style={styles.searchInput}
          contentDirection="adaptive"
          placeholder={resolvedSearchPlaceholder}
          placeholderTextColor="#929FA5"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => q && choose(q)}
          returnKeyType="done"
        />
        <TouchableOpacity
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("close")}
        >
          <Ionicons name="close" size={22} color="#2C2C2C" />
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <KeyboardSafeModalSheet
      visible={visible}
      onClose={onClose}
      onShow={handleShow}
      header={header}
      scrollBody={false}
      maxHeightRatio={0.7}
      accessibilityLabel={title}
    >
      <FlatList
        data={filtered}
        keyExtractor={(item, index) => `${item}-${index}`}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        ListHeaderComponent={
          <TouchableOpacity
            style={[styles.option, !value && styles.optionSelected]}
            onPress={() => choose("")}
            activeOpacity={0.7}
          >
            <LocalizedText style={styles.optionText}>{resolvedNoneLabel}</LocalizedText>
          </TouchableOpacity>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.option, value === item && styles.optionSelected]}
            onPress={() => choose(item)}
            activeOpacity={0.7}
          >
            <AdaptiveText style={styles.optionText}>{item}</AdaptiveText>
            {value === item && (
              <Ionicons name="checkmark" size={18} color="#C28E5C" />
            )}
          </TouchableOpacity>
        )}
        ListFooterComponent={
          q && !exactExists ? (
            <TouchableOpacity style={styles.option} onPress={() => choose(q)} activeOpacity={0.7}>
              <Ionicons name="add" size={18} color="#C28E5C" />
              <AdaptiveText style={[styles.optionText, styles.createText]}>
                {resolvedCreateLabel(q)}
              </AdaptiveText>
            </TouchableOpacity>
          ) : null
        }
      />
    </KeyboardSafeModalSheet>
  );
};

const styles = StyleSheet.create({
  title: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    paddingVertical: 0,
  },
  list: { flexShrink: 1, paddingHorizontal: 12 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F4F4F4",
  },
  optionSelected: { backgroundColor: "#F5ECE4", borderRadius: 10 },
  optionText: { flex: 1, fontSize: 15, fontFamily: "Cairo_500Medium", color: "#2c2c2c" },
  createText: { color: "#C28E5C" },
});

export default CategoryPickerSheet;
