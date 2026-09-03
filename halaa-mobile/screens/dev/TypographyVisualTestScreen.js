import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TopBar from "../../components/plans/TopBar";
import DirectionalTextInput from "../../components/commen/DirectionalTextInput";
import KeyboardSafeModalSheet from "../../components/commen/keyboard/KeyboardSafeModalSheet";

/**
 * Deterministic typography test fixture for F-14 investigation and verification.
 * Contains dotted Arabic glyphs at every loaded Cairo weight:
 * 300 (Light), 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold), 900 (Black).
 *
 * Covers:
 *  - Single-line titles & labels
 *  - Multiline paragraphs
 *  - DirectionalTextInputs
 *  - Buttons
 *  - Modal text presentation through KeyboardSafeModalSheet
 */
const DOTTED_SPECIMEN = "ب ت ث ن ي ج خ ذ ز ش ض ظ غ ف ق ة";
const PANGRAM_AR =
  "نَصٌّ حَكِيمٌ قَاطِعٌ يَثْبُتُ فِيهِ ضِيَاءُ البَهْجَةِ وَشُرُوقُ الغَيْثِ؛ فَنَسْعَدُ بِحُضُورِكُمُ الكَرِيمِ فِي حَفْلِ هَلَا 2026.";

const WEIGHT_CASES = [
  { weight: "300", family: "Cairo_300Light", name: "Light (300)" },
  { weight: "400", family: "Cairo_400Regular", name: "Regular (400)" },
  { weight: "500", family: "Cairo_500Medium", name: "Medium (500)" },
  { weight: "600", family: "Cairo_600SemiBold", name: "SemiBold (600)" },
  { weight: "700", family: "Cairo_700Bold", name: "Bold (700)" },
  { weight: "900", family: "Cairo_900Black", name: "Black (900)" },
];

const TypographyVisualTestScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [inputText, setInputText] = useState("حَفْلُ زَفَافٍ بَهِيجٌ فِي الرِّيَاضِ");

  return (
    <SafeAreaView style={styles.safeArea} testID="typography-visual-root">
      <TopBar title="فحص طباعة الخط العربي - F-14" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>
            فحص وضوح النقاط في الحروف العربية (Cairo Weights)
          </Text>
          <Text style={styles.introSubtitle}>
            الهدف: التأكد من ثبات نقاط الحروف (ب، ت، ث، ن، ي، ج، خ، ذ، ز، ش، ض، ظ، غ، ف، ق، ة) وعدم تآكلها بنظام Bolding الاصطناعي.
          </Text>
        </View>

        {WEIGHT_CASES.map(({ weight, family, name }) => (
          <View key={weight} style={styles.weightCard} testID={`specimen-weight-${weight}`}>
            <View style={styles.badgeRow}>
              <Text style={styles.badgeText}>{name}</Text>
              <Text style={styles.fontTag}>{family}</Text>
            </View>

            {/* Direct family usage without fontWeight */}
            <Text style={[styles.specimenFamily, { fontFamily: family }]}>
              {DOTTED_SPECIMEN}
            </Text>
            <Text style={[styles.pangramFamily, { fontFamily: family }]}>
              {PANGRAM_AR}
            </Text>

            {/* Redundant/synthetic fontWeight stress test */}
            <Text style={[styles.pangramWeight, { fontWeight: weight }]}>
              نص مع fontWeight: "{weight}" — {PANGRAM_AR}
            </Text>
          </View>
        ))}

        {/* Form Input Test */}
        <View style={styles.interactiveCard}>
          <Text style={styles.cardHeader}>حقل إدخال (DirectionalTextInput)</Text>
          <DirectionalTextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="اكتب نصاً منقوطاً للتجربة..."
            placeholderTextColor="#888"
            testID="typography-test-input"
          />
        </View>

        {/* Button & Modal Test */}
        <View style={styles.interactiveCard}>
          <Text style={styles.cardHeader}>زر تفاعلي ونافذة منبثقة (Modal)</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setModalVisible(true)}
            testID="open-typography-modal"
          >
            <Ionicons name="text-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>
              فتح نافذة فحص النقاط المنبثقة
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Specimen */}
      <KeyboardSafeModalSheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        testID="typography-modal-content"
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>حروف منقوطة داخل نافذة منبثقة</Text>
          <Text style={styles.modalBody}>
            تأكيد ثبات نقاط الحروف العربية داخل النوافذ:
          </Text>
          <Text style={styles.modalSpecimen}>{DOTTED_SPECIMEN}</Text>
          <Text style={styles.modalPangram}>{PANGRAM_AR}</Text>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
            testID="close-typography-modal"
          >
            <Text style={styles.closeButtonText}>إغلاق النافذة</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModalSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9F4EF" },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  introCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E4D6C8",
  },
  introTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#2C2C2C",
    textAlign: "right",
    marginBottom: 6,
  },
  introSubtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    color: "#666",
    textAlign: "right",
    lineHeight: 20,
  },
  weightCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E4D6C8",
    gap: 8,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0E7DD",
    paddingBottom: 6,
  },
  badgeText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#C28E5C",
  },
  fontTag: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#888",
  },
  specimenFamily: {
    fontSize: 18,
    textAlign: "right",
    color: "#1A1A1A",
    letterSpacing: 2,
  },
  pangramFamily: {
    fontSize: 14,
    textAlign: "right",
    color: "#2C2C2C",
    lineHeight: 24,
  },
  pangramWeight: {
    fontSize: 13,
    textAlign: "right",
    color: "#555",
    lineHeight: 22,
    borderTopWidth: 1,
    borderTopColor: "#F8F2EC",
    paddingTop: 6,
  },
  interactiveCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E4D6C8",
    gap: 10,
  },
  cardHeader: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#2C2C2C",
    textAlign: "right",
  },
  textInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#D4C2B0",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: "Cairo_500Medium",
    backgroundColor: "#FAF7F2",
    color: "#1A1A1A",
  },
  actionButton: {
    minHeight: 48,
    backgroundColor: "#C28E5C",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
    color: "#FFF",
  },
  modalContent: {
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#2C2C2C",
    textAlign: "right",
  },
  modalBody: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    color: "#666",
    textAlign: "right",
  },
  modalSpecimen: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 17,
    color: "#C28E5C",
    textAlign: "right",
    letterSpacing: 2,
    backgroundColor: "#FDF8F3",
    padding: 10,
    borderRadius: 8,
  },
  modalPangram: {
    fontFamily: "Cairo_500Medium",
    fontSize: 13,
    color: "#333",
    textAlign: "right",
    lineHeight: 22,
  },
  closeButton: {
    minHeight: 44,
    backgroundColor: "#2C2C2C",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  closeButtonText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    color: "#FFF",
  },
});

export default TypographyVisualTestScreen;
