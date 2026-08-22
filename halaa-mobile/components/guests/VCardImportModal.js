/**
 * Import guests from an uploaded contacts file (.vcf / vCard).
 *
 * The user exports a .vcf from their phone/computer (clear per-platform
 * instructions shown here), picks the file, and we parse it on-device to pull
 * out name + Saudi mobile. Only the contacts the user selects are kept; the
 * file is never uploaded anywhere. Selected contacts are returned via `onAdd`
 * and persist through the normal Step-2 save.
 *
 * Independent of expo-contacts — works even where the native contacts module
 * isn't available.
 */
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import TextInput from "../commen/DirectionalTextInput";
import Svg, { Path } from "react-native-svg";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { parseVCards } from "@halaa/shared/utils/vcard";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { useTranslation } from "../../localization";
import Button from "../commen/Button";

const PLATFORMS = ["apple", "android", "computer"];

// Local copy — keeps this file independent of the expo-contacts util.
const normalizeSaudiMobile = (raw) => {
  if (!raw) return null;
  let d = String(raw).replace(/[^\d+]/g, "");
  d = d.replace(/^\+/, "");
  if (d.startsWith("00966")) d = d.slice(5);
  else if (d.startsWith("966")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return /^5\d{8}$/.test(d) ? d : null;
};

const CloseIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke="#656565" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const VCardImportModal = ({ visible, onClose, onAdd }) => {
  const { t } = useTranslation("createEvent");
  const [platform, setPlatform] = useState(Platform.OS === "ios" ? "apple" : "android");
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState(null); // null | [] | [{name,mobile}]
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState({}); // mobile -> {name, mobile}

  const reset = () => {
    setParsed(null);
    setSearch("");
    setCategory("");
    setSelected({});
    setBusy(false);
  };

  const handlePick = async () => {
    try {
      setBusy(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: ["text/vcard", "text/x-vcard", "public.vcard", "*/*"],
        copyToCacheDirectory: true,
      });
      if (res.canceled) {
        setBusy(false);
        return;
      }
      const uri = res.assets[0].uri;
      const text = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const cards = parseVCards(text);
      const seen = new Set();
      const contacts = [];
      for (const c of cards) {
        let mobile = null;
        for (const p of c.phones) {
          const norm = normalizeSaudiMobile(p);
          if (norm) {
            mobile = norm;
            break;
          }
        }
        if (!mobile || seen.has(mobile)) continue;
        seen.add(mobile);
        contacts.push({ name: (c.name || "").trim() || mobile, mobile });
      }
      setParsed(contacts);
    } catch (e) {
      setParsed([]);
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    if (!parsed) return [];
    const q = search.trim().toLowerCase();
    if (!q) return parsed;
    return parsed.filter((c) => c.name.toLowerCase().includes(q) || c.mobile.includes(q));
  }, [parsed, search]);

  const selectedCount = Object.keys(selected).length;

  const toggle = (c) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[c.mobile]) delete next[c.mobile];
      else next[c.mobile] = { name: c.name, mobile: c.mobile };
      return next;
    });
  };

  const handleAdd = () => {
    const cat = category.trim();
    const list = Object.values(selected).map((c) => ({ ...c, category: cat }));
    if (list.length > 0) onAdd(list);
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const steps = (t(`vcard_steps_${platform}`) || "").split("\n").filter(Boolean);

  const renderItem = ({ item }) => {
    const isSelected = !!selected[item.mobile];
    return (
      <TouchableOpacity style={styles.row} onPress={() => toggle(item)} activeOpacity={0.7}>
        <View style={[styles.checkbox, isSelected && styles.checkboxOn]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName}>{item.name}</Text>
          <Text style={styles.rowPhone}>{isolateLtr(item.mobile)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t("vcard_title")}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
              <CloseIcon />
            </TouchableOpacity>
          </View>

          {parsed === null ? (
            <ScrollView contentContainerStyle={styles.introScroll}>
              <Text style={styles.subtitle}>{t("vcard_subtitle")}</Text>

              <View style={styles.tabs}>
                {PLATFORMS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.tab, platform === p && styles.tabActive]}
                    onPress={() => setPlatform(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tabText, platform === p && styles.tabTextActive]}>
                      {t(`vcard_platform_${p}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.stepsBox}>
                {steps.map((s, i) => (
                  <Text key={i} style={styles.step}>{`${i + 1}. ${s}`}</Text>
                ))}
              </View>

              <Button text={busy ? t("loading") : t("vcard_choose_file")} onPress={handlePick} disabled={busy} />
              <Text style={styles.privacy}>{t("vcard_privacy_note")}</Text>
            </ScrollView>
          ) : parsed.length === 0 ? (
            <View style={styles.state}>
              <Text style={styles.stateText}>{t("vcard_none_found")}</Text>
              <Button text={t("vcard_choose_another")} onPress={handlePick} />
            </View>
          ) : (
            <>
              <View style={styles.foundBar}>
                <Text style={styles.foundText}>{t("vcard_found", { count: parsed.length })}</Text>
                <TouchableOpacity onPress={handlePick}>
                  <Text style={styles.linkText}>{t("vcard_choose_another")}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.filters}>
                <TextInput
                  style={styles.search}
                  placeholder={t("reuse_guests_search_placeholder")}
                  placeholderTextColor="#999"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>

              <FlatList
                data={filtered}
                renderItem={renderItem}
                keyExtractor={(item) => item.mobile}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              />

              <View style={styles.footer}>
                <TextInput
                  style={styles.categoryInput}
                  placeholder={t("contacts_category_placeholder")}
                  placeholderTextColor="#999"
                  value={category}
                  onChangeText={setCategory}
                  maxLength={60}
                />
                <View style={styles.footerActions}>
                  <View style={styles.footerButton}>
                    <Button text={t("confirm")} onPress={handleAdd} disabled={selectedCount === 0} />
                  </View>
                  <View style={styles.footerButton}>
                    <Button text={t("cancel")} variant="secondary" onPress={handleClose} />
                  </View>
                </View>
              </View>
            </>
          )}

          {busy && parsed === null && (
            <View style={styles.busyOverlay} pointerEvents="none">
              <ActivityIndicator size="small" color="#C28E5C" />
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContainer: { width: "100%", backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%" },
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
  introScroll: { padding: 24, gap: 16 },
  subtitle: { fontSize: 13, fontFamily: "Cairo_400Regular", color: "#656565", lineHeight: 21, marginBottom: 4 },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: "#E0D5C7", alignItems: "center", backgroundColor: "#FFF" },
  tabActive: { backgroundColor: "#C28E5C", borderColor: "#C28E5C" },
  tabText: { fontSize: 13, fontFamily: "Cairo_600SemiBold", color: "#8A6B47" },
  tabTextActive: { color: "#FFF" },
  stepsBox: { backgroundColor: "#F9F4EF", borderRadius: 12, padding: 16, gap: 10 },
  step: { fontSize: 13, fontFamily: "Cairo_400Regular", color: "#2C2C2C", lineHeight: 21 },
  privacy: { fontSize: 11, fontFamily: "Cairo_400Regular", color: "#999", textAlign: "center" },
  state: { padding: 40, alignItems: "center", gap: 16 },
  stateText: { fontSize: 14, fontFamily: "Cairo_400Regular", color: "#999", textAlign: "center" },
  foundBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 14 },
  foundText: { fontSize: 13, fontFamily: "Cairo_600SemiBold", color: "#2C2C2C" },
  linkText: { fontSize: 13, fontFamily: "Cairo_600SemiBold", color: "#C28E5C", textDecorationLine: "underline" },
  filters: { paddingHorizontal: 24, paddingTop: 12 },
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
  footer: { paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "#F0F0F0", gap: 12 },
  footerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  footerButton: { flex: 1 },
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
  busyOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
});

export default VCardImportModal;
