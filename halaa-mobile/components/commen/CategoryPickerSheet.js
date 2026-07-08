import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * CategoryPickerSheet — the shared creatable category picker bottom-sheet.
 *
 * One implementation used everywhere a category is chosen on mobile: the
 * per-guest CategorySelect field, the bulk "link to category" flow on the
 * guest list, and the reuse/vCard pickers. Search an existing label, pick the
 * "none" row to clear, or create a new label from the typed text. Controlled
 * via `visible` + `onSelect(value)`.
 */
const CategoryPickerSheet = ({
  visible,
  onClose,
  onSelect,
  value = "",
  options = [],
  title,
  searchPlaceholder = "ابحث أو اكتب تصنيفاً",
  noneLabel = "بدون تصنيف",
  createLabel = (q) => `إنشاء «${q}»`,
}) => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  const q = query.trim();
  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(q.toLowerCase())),
    [options, q]
  );
  const exactExists = options.some((o) => o.toLowerCase() === q.toLowerCase());

  const choose = (val) => {
    onSelect?.(val);
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {title ? <Text style={styles.title}>{title}</Text> : null}

          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color="#929FA5" />
            <TextInput
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor="#929FA5"
              value={query}
              onChangeText={setQuery}
              autoFocus
              onSubmitEditing={() => q && choose(q)}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#2C2C2C" />
            </TouchableOpacity>
          </View>

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
                <Text style={styles.optionText}>{noneLabel}</Text>
              </TouchableOpacity>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.option, value === item && styles.optionSelected]}
                onPress={() => choose(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionText}>{item}</Text>
                {value === item && <Ionicons name="checkmark" size={18} color="#C28E5C" />}
              </TouchableOpacity>
            )}
            ListFooterComponent={
              q && !exactExists ? (
                <TouchableOpacity style={styles.option} onPress={() => choose(q)} activeOpacity={0.7}>
                  <Ionicons name="add" size={18} color="#C28E5C" />
                  <Text style={[styles.optionText, styles.createText]}>{createLabel(q)}</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    textAlign: "center",
    paddingTop: 16,
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
  list: { paddingHorizontal: 12 },
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
  createText: { color: "#C28E5C", flex: 0 },
});

export default CategoryPickerSheet;
