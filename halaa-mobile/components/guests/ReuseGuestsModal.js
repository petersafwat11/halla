/**
 * "Add from your guests" — pick from the host's reusable guest book (past
 * guests across all their events), filtered by category + search. Selected
 * contacts are returned via `onAdd`; persistence flows through the normal
 * Step-2 save. Rows already on the current list are disabled.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from "react-native";
import TextInput from "../commen/DirectionalTextInput";
import Svg, { Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { useTranslation } from "../../localization";
import Button from "../commen/Button";
import CategoryPickerSheet from "../commen/CategoryPickerSheet";
import KeyboardSafeModalSheet from "../commen/keyboard/KeyboardSafeModalSheet";
import { useMyContacts } from "../../hooks/guests/queries";

const CloseIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke="#656565" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ReuseGuestsModal = ({
  visible,
  onClose,
  onAdd,
  existingPhones = [],
  remainingCapacity = Infinity,
  isUnlimited = false,
}) => {
  const { t } = useTranslation("createEvent");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState(50);
  const [selected, setSelected] = useState({}); // phone -> { name, phone, category }
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const existingSet = useMemo(() => new Set(existingPhones), [existingPhones]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setLimit(50);
  }, [debouncedSearch, category]);

  useEffect(() => {
    if (!visible) {
      setSearch("");
      setDebouncedSearch("");
      setCategory("");
      setLimit(50);
      setSelected({});
      setShowCategoryPicker(false);
    }
  }, [visible]);

  // Stamp a chosen label onto every selected contact (overrides their
  // guest-book category for this add).
  const handleAssignCategory = (cat) => {
    setSelected((prev) => {
      const next = {};
      Object.keys(prev).forEach((phone) => {
        next[phone] = { ...prev[phone], category: cat };
      });
      return next;
    });
  };

  const { data, isLoading, isError } = useMyContacts(
    { search: debouncedSearch || undefined, category: category || undefined, page: 1, limit },
    { enabled: visible }
  );

  const contacts = data?.data?.contacts || [];
  const categories = data?.data?.categories || [];
  const total = data?.data?.pagination?.total || 0;

  const selectedCount = Object.keys(selected).length;
  const atCapacity = !isUnlimited && Number.isFinite(remainingCapacity) && selectedCount >= remainingCapacity;

  const toggle = (c) => {
    if (existingSet.has(c.phone)) return;
    setSelected((prev) => {
      const next = { ...prev };
      if (next[c.phone]) {
        delete next[c.phone];
      } else {
        if (atCapacity) return prev;
        next[c.phone] = { name: c.name || "", phone: c.phone, category: c.category || "" };
      }
      return next;
    });
  };

  const handleAdd = () => {
    const list = Object.values(selected);
    if (list.length > 0) onAdd(list);
    onClose();
  };

  const renderItem = ({ item }) => {
    const already = existingSet.has(item.phone);
    const isSelected = !!selected[item.phone];
    const disabled = already || (!isSelected && atCapacity);
    return (
      <TouchableOpacity
        style={[styles.row, disabled && styles.rowDisabled]}
        onPress={() => toggle(item)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxOn]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName}>{item.name}</Text>
          <Text style={styles.rowPhone}>{isolateLtr(item.phone)}</Text>
        </View>
        {item.category ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.category}</Text>
          </View>
        ) : null}
        {already && <Text style={styles.added}>{t("reuse_guests_added")}</Text>}
      </TouchableOpacity>
    );
  };

  const header = (
    <>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>{t("reuse_guests_title")}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <CloseIcon />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>{t("reuse_guests_subtitle")}</Text>
      </View>

      {/* Fixed above the virtualized body: the search field is always
          visible, so it never needs focus scrolling — the list below shrinks
          instead (§6.4 layout 2). */}
      <View style={styles.filters}>
        <TextInput
          style={styles.search}
          placeholder={t("reuse_guests_search_placeholder")}
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        {categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, category === "" && styles.chipActive]}
              onPress={() => setCategory("")}
            >
              <Text style={[styles.chipText, category === "" && styles.chipTextActive]}>
                {t("reuse_guests_all_categories")}
              </Text>
            </TouchableOpacity>
            {categories.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, category === c && styles.chipActive]}
                onPress={() => setCategory(category === c ? "" : c)}
              >
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </>
  );

  const footer = (
    <View style={styles.footer}>
      <View style={styles.footerTopRow}>
        <Text style={styles.count}>{t("reuse_guests_selected", { count: selectedCount })}</Text>
        {selectedCount > 0 && (
          <TouchableOpacity
            style={styles.linkCategoryBtn}
            onPress={() => setShowCategoryPicker(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="pricetag-outline" size={16} color="#C28E5C" />
            <Text style={styles.linkCategoryText}>{t("link_to_category")}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.footerActions}>
        <View style={styles.footerButton}>
          <Button text={t("confirm")} onPress={handleAdd} disabled={selectedCount === 0} />
        </View>
        <View style={styles.footerButton}>
          <Button text={t("cancel")} variant="secondary" onPress={onClose} />
        </View>
      </View>
    </View>
  );

  return (
    <>
      <KeyboardSafeModalSheet
        visible={visible}
        onClose={onClose}
        onRequestClose={onClose}
        header={header}
        footer={footer}
        scrollBody={false}
        accessibilityLabel={t("reuse_guests_title")}
      >
        {isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator size="small" color="#C28E5C" />
          </View>
        ) : isError ? (
          <View style={styles.state}>
            <Text style={styles.stateText}>{t("reuse_guests_error")}</Text>
          </View>
        ) : contacts.length === 0 ? (
          <View style={styles.state}>
            <Text style={styles.stateText}>{t("reuse_guests_empty")}</Text>
          </View>
        ) : (
          <FlatList
            data={contacts}
            renderItem={renderItem}
            keyExtractor={(item) => item.phone}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              total > contacts.length ? (
                <TouchableOpacity style={styles.loadMore} onPress={() => setLimit((l) => l + 50)}>
                  <Text style={styles.loadMoreText}>{t("reuse_guests_load_more")}</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        )}
      </KeyboardSafeModalSheet>

      <CategoryPickerSheet
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        onSelect={handleAssignCategory}
        options={categories}
        title={t("link_to_category_title")}
      />
    </>
  );
};

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  headerTitle: { fontSize: 20, fontFamily: "Cairo_700Bold", color: "#2C2C2C" },
  closeButton: { padding: 4 },
  headerSubtitle: { fontSize: 13, fontFamily: "Cairo_400Regular", color: "#656565" },
  filters: { paddingHorizontal: 24, paddingTop: 12, gap: 10 },
  search: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
  },
  chipRow: { gap: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "#E0D5C7", backgroundColor: "#F9F4EF" },
  chipActive: { backgroundColor: "#C28E5C", borderColor: "#C28E5C" },
  chipText: { fontSize: 12, fontFamily: "Cairo_500Medium", color: "#8A6B47" },
  chipTextActive: { color: "#FFF" },
  state: { paddingVertical: 50, alignItems: "center" },
  stateText: { fontSize: 14, fontFamily: "Cairo_400Regular", color: "#999" },
  listContent: { paddingHorizontal: 24, paddingTop: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F9F4EF",
    borderRadius: 12,
    marginBottom: 10,
  },
  rowDisabled: { opacity: 0.5 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "#C28E5C", alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: "#C28E5C" },
  checkmark: { color: "#FFF", fontSize: 13, fontFamily: "Cairo_700Bold" },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: "Cairo_600SemiBold", color: "#2C2C2C" },
  rowPhone: { fontSize: 13, fontFamily: "Cairo_400Regular", color: "#656565", writingDirection: "ltr" },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: "#EFE3D4" },
  badgeText: { fontSize: 11, fontFamily: "Cairo_500Medium", color: "#8A6B47" },
  added: { fontSize: 11, fontFamily: "Cairo_400Regular", color: "#999" },
  loadMore: { paddingVertical: 12, alignItems: "center" },
  loadMoreText: { fontSize: 13, fontFamily: "Cairo_600SemiBold", color: "#C28E5C" },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    gap: 10,
  },
  footerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  count: { fontSize: 13, fontFamily: "Cairo_500Medium", color: "#656565" },
  linkCategoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E7D8C6",
    backgroundColor: "#F9F4EF",
  },
  linkCategoryText: { fontSize: 13, fontFamily: "Cairo_600SemiBold", color: "#8A6B47" },
  footerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  footerButton: { flex: 1 },
});

export default ReuseGuestsModal;
