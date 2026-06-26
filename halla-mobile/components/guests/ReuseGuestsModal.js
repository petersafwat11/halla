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
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "../../localization";
import Button from "../commen/Button";
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
    }
  }, [visible]);

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
          <Text style={styles.rowPhone}>{item.phone}</Text>
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.headerTitle}>{t("reuse_guests_title")}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
                <CloseIcon />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerSubtitle}>{t("reuse_guests_subtitle")}</Text>
          </View>

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
              ListFooterComponent={
                total > contacts.length ? (
                  <TouchableOpacity style={styles.loadMore} onPress={() => setLimit((l) => l + 50)}>
                    <Text style={styles.loadMoreText}>{t("reuse_guests_load_more")}</Text>
                  </TouchableOpacity>
                ) : null
              }
            />
          )}

          <View style={styles.footer}>
            <Text style={styles.count}>{t("reuse_guests_selected", { count: selectedCount })}</Text>
            <View style={styles.footerActions}>
              <Button
                text={t("reuse_guests_add", { count: selectedCount })}
                onPress={handleAdd}
                disabled={selectedCount === 0}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContainer: { width: "100%", backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%" },
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
  count: { fontSize: 13, fontFamily: "Cairo_500Medium", color: "#656565", textAlign: "center" },
  footerActions: { width: "100%" },
});

export default ReuseGuestsModal;
