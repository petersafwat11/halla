/**
 * Native phone-contacts import (expo-contacts). Shows a pre-permission
 * explanation BEFORE the OS prompt, then a searchable multi-select list of
 * device contacts. Selected contacts (name + first valid Saudi mobile) are
 * returned via `onAdd`, with an optional category applied to all.
 *
 * Privacy: name + phone only; never the full phonebook; only selected
 * contacts leave the device (and only into the local guest list).
 *
 * Keyboard contract (blueprint §6.4/§6.5): presented through the shared
 * KeyboardSafeModalSheet — fixed header, virtualized FlatList body that
 * shrinks with the keyboard, and an editable category/Add footer slot that
 * remains attached above the keyboard while typing.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import TextInput from "../../commen/DirectionalTextInput";
import AdaptiveText from "../../commen/AdaptiveText";
import Svg, { Path } from "react-native-svg";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { useTranslation } from "../../../localization";
import Button from "../../commen/Button";
import KeyboardSafeModalSheet from "../../commen/keyboard/KeyboardSafeModalSheet";
import {
  requestContactsPermission,
  loadDeviceContacts,
} from "../../../utils/contacts/phoneContacts";

const CloseIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke="#656565" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ContactsImportModal = ({ visible, onClose, onAdd }) => {
  const { t } = useTranslation("createEvent");
  const [phase, setPhase] = useState("intro"); // intro | loading | list | denied
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({}); // id -> { name, phone }
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (!visible) {
      setPhase("intro");
      setContacts([]);
      setSearch("");
      setSelected({});
      setCategory("");
    }
  }, [visible]);

  const handleContinue = async () => {
    try {
      setPhase("loading");
      const status = await requestContactsPermission();
      if (status !== "granted") {
        setPhase("denied");
        return;
      }
      const list = await loadDeviceContacts();
      setContacts(list);
      setPhase("list");
    } catch (e) {
      setPhase("denied");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phones.some((p) => p.includes(q))
    );
  }, [contacts, search]);

  const toggle = (c) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[c.id]) delete next[c.id];
      else next[c.id] = { name: c.name, phone: c.phones[0] };
      return next;
    });
  };

  const handleAdd = () => {
    // Dismissing first prevents the keyboard animation tearing across the
    // close/navigation transition (blueprint §10).
    Keyboard.dismiss();
    const cat = category.trim();
    const list = Object.values(selected).map((c) => ({ ...c, category: cat }));
    if (list.length > 0) onAdd(list);
    onClose();
  };

  const selectedCount = Object.keys(selected).length;

  const renderItem = ({ item }) => {
    const isSelected = !!selected[item.id];
    return (
      <TouchableOpacity style={styles.row} onPress={() => toggle(item)} activeOpacity={0.7}>
        <View style={[styles.checkbox, isSelected && styles.checkboxOn]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={styles.rowInfo}>
          {/* Device contact names are arbitrary user content — first-strong
              direction with isolation; the phone stays an LTR token. */}
          <AdaptiveText style={styles.rowName} numberOfLines={1}>
            {item.name}
          </AdaptiveText>
          <Text style={styles.rowPhone}>{isolateLtr(item.phones[0])}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const header = (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{t("import_from_phone")}</Text>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t("close")}
      >
        <CloseIcon />
      </TouchableOpacity>
    </View>
  );

  const footer =
    phase === "list" ? (
      <View style={styles.footer}>
        {/* Deliberately sticky editable/action footer (§6.5): must stay
            operable while the keyboard is open; the shared sheet keeps it
            attached above the keyboard. */}
        <TextInput
          contentDirection="adaptive"
          style={styles.categoryInput}
          placeholder={t("contacts_category_placeholder")}
          placeholderTextColor="#999"
          value={category}
          onChangeText={setCategory}
          maxLength={60}
        />
        <Button
          text={t("reuse_guests_add", { count: selectedCount })}
          onPress={handleAdd}
          disabled={selectedCount === 0}
        />
      </View>
    ) : null;

  return (
    <KeyboardSafeModalSheet
      visible={visible}
      onClose={onClose}
      header={header}
      footer={footer}
      scrollBody={phase !== "list"}
      accessibilityLabel={t("import_from_phone")}
    >
      {phase === "intro" && (
        <View style={styles.introBox}>
          <Text style={styles.introText}>{t("contacts_permission_explanation")}</Text>
          <Button text={t("continue")} onPress={handleContinue} />
        </View>
      )}

      {phase === "loading" && (
        <View style={styles.state}>
          <ActivityIndicator size="small" color="#C28E5C" />
        </View>
      )}

      {phase === "denied" && (
        <View style={styles.introBox}>
          <Text style={styles.introText}>{t("contacts_permission_denied")}</Text>
          <Button text={t("close")} onPress={onClose} />
        </View>
      )}

      {phase === "list" && (
        <>
          <View style={styles.filters}>
            <TextInput
              contentDirection="adaptive"
              style={styles.search}
              placeholder={t("reuse_guests_search_placeholder")}
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
          </View>

          {filtered.length === 0 ? (
            <View style={styles.state}>
              <Text style={styles.stateText}>{t("contacts_empty")}</Text>
            </View>
          ) : (
            <FlatList
              style={styles.list}
              data={filtered}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </>
      )}
    </KeyboardSafeModalSheet>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 20, fontFamily: "Cairo_700Bold", color: "#2C2C2C" },
  closeButton: { padding: 4 },
  introBox: { padding: 24, gap: 16 },
  introText: { fontSize: 14, fontFamily: "Cairo_400Regular", color: "#656565", lineHeight: 22 },
  state: { paddingVertical: 50, alignItems: "center" },
  stateText: { fontSize: 14, fontFamily: "Cairo_400Regular", color: "#999" },
  filters: { paddingHorizontal: 24, paddingTop: 16 },
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
  list: { flexShrink: 1 },
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
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "#C28E5C", alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: "#C28E5C" },
  checkmark: { color: "#FFF", fontSize: 13, fontFamily: "Cairo_700Bold" },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: "Cairo_600SemiBold", color: "#2C2C2C" },
  rowPhone: { fontSize: 13, fontFamily: "Cairo_400Regular", color: "#656565", writingDirection: "ltr" },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F0F0F0", gap: 12 },
  categoryInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
  },
});

export default ContactsImportModal;
