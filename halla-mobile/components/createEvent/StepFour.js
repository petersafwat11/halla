/**
 * StepFour (mobile) — Taqnyat picker + auto-replies (5-step wizard)
 *
 * Step 4 combines the Taqnyat-template picker with the auto-replies
 * editor below it.
 *
 * Saves under both legacy `selectedTemplate` and canonical
 * `taqnyatTemplate.templateRef`. Auto-replies dual-write canonical
 * guestReplies.* + legacy keys.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from "react-native";
import { useFormContext } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { taqnyatTemplatesService } from "../../services/taqnyatTemplatesService";

const AUTO_REPLIES_DEFAULTS = {
  onAttend:
    "شكراً لتأكيد حضورك! يسعدنا أن تكون معنا في هذه المناسبة. سيصلك رمز الدخول الخاص بك قريباً. 🎉",
  onExpected: "شكراً لردّك! نأمل أن تتمكن من الحضور ونتطلع إلى رؤيتك بيننا. 🤍",
  onAbsent: "شكراً لإعلامنا. نتفهم ظروفك ونتمنى لك دوام الصحة والسعادة. 🌹",
};

const REPLY_TABS = [
  { key: "onAttend", label: "الحضور", legacy: "attendanceAutoReply" },
  { key: "onExpected", label: "ربما", legacy: "expectedAttendanceAutoReply" },
  { key: "onAbsent", label: "الاعتذار", legacy: "absenceAutoReply" },
];

const StepFour = () => {
  const { setValue, watch } = useFormContext();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState("onAttend");

  const visualTemplate = watch("visualTemplate");
  const selectedTemplate = watch("selectedTemplate");
  const category = visualTemplate?.categories?.[0] || "";
  const guestReplies = watch("guestReplies") || {};

  const { data, isLoading } = useQuery({
    queryKey: ["taqnyat-templates", "host", category || "all"],
    queryFn: () => taqnyatTemplatesService.getTemplates({ category: category || undefined }),
    staleTime: 5 * 60 * 1000,
  });

  const templates = data?.data?.templates || data?.templates || [];

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (!guestReplies?.onAttend) {
      setValue("guestReplies.onAttend", AUTO_REPLIES_DEFAULTS.onAttend, { shouldDirty: false });
      setValue("attendanceAutoReply", AUTO_REPLIES_DEFAULTS.onAttend, { shouldDirty: false });
    }
    if (!guestReplies?.onAbsent) {
      setValue("guestReplies.onAbsent", AUTO_REPLIES_DEFAULTS.onAbsent, { shouldDirty: false });
      setValue("absenceAutoReply", AUTO_REPLIES_DEFAULTS.onAbsent, { shouldDirty: false });
    }
    if (!guestReplies?.onExpected) {
      setValue("guestReplies.onExpected", AUTO_REPLIES_DEFAULTS.onExpected, { shouldDirty: false });
      setValue("expectedAttendanceAutoReply", AUTO_REPLIES_DEFAULTS.onExpected, { shouldDirty: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTemplateSelect = (template) => {
    const enriched = {
      id: template._id,
      _id: template._id,
      name: template.templateName,
      templateName: template.templateName,
      language: template.language || "ar",
      hasImageHeader: template.hasImageHeader || false,
      bodyText: template.bodyText,
    };
    setValue("selectedTemplate", enriched, { shouldValidate: true });
    setValue("invitationSettings.selectedTemplate", enriched, { shouldValidate: false });
    setValue("taqnyatTemplate", { templateRef: template._id }, { shouldValidate: false });
    setValue("taqnyatTemplateRef", template._id, { shouldValidate: false });
  };

  const activeReplyMeta = REPLY_TABS.find((tab) => tab.key === activeTab);
  const activeReplyValue = guestReplies?.[activeTab] || "";

  const handleReplyChange = (text) => {
    if (!activeReplyMeta) return;
    setValue(`guestReplies.${activeReplyMeta.key}`, text, { shouldDirty: true });
    setValue(activeReplyMeta.legacy, text, { shouldDirty: true });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Taqnyat template picker ──────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>اختر قالب الواتساب</Text>
          {category ? (
            <Text style={styles.subtitle}>تم الفلترة حسب الفئة: {category}</Text>
          ) : (
            <Text style={styles.subtitle}>اختر قالباً معتمداً من Meta</Text>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#C28E5C" />
          </View>
        ) : templates.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="mail-outline" size={36} color="#999" />
            <Text style={styles.emptyTitle}>لا توجد قوالب لهذه الفئة</Text>
            <Text style={styles.emptyHint}>
              تواصل مع الإدارة لتعيين قوالب لفئتك
            </Text>
          </View>
        ) : (
          <View style={styles.templateList}>
            {templates.map((tpl) => {
              const isSelected =
                selectedTemplate?._id === tpl._id ||
                selectedTemplate?.id === tpl._id ||
                selectedTemplate?.name === tpl.templateName;
              return (
                <TouchableOpacity
                  key={tpl._id}
                  style={[styles.card, isSelected && styles.cardSelected]}
                  onPress={() => handleTemplateSelect(tpl)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{tpl.templateName}</Text>
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </View>
                  {tpl.bodyText ? (
                    <Text style={styles.cardBody} numberOfLines={4}>
                      {tpl.bodyText}
                    </Text>
                  ) : null}
                  {tpl.varMapping?.length > 0 && (
                    <Text style={styles.cardMeta}>متغيرات: {tpl.varMapping.length}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Auto-replies ─────────────────────────────────────── */}
        <View style={styles.repliesSection}>
          <Text style={styles.sectionTitle}>الردود التلقائية</Text>
          <Text style={styles.hint}>
            تُرسل تلقائياً للضيف فور اختياره — يمكنك تعديل النص
          </Text>

          <View style={styles.tabsRow}>
            {REPLY_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            value={activeReplyValue}
            onChangeText={handleReplyChange}
            placeholder="اكتب الرد التلقائي هنا"
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            maxLength={500}
            style={[styles.textArea, { writingDirection: "rtl" }]}
          />
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  loadingBox: { padding: 32, alignItems: "center" },
  emptyBox: {
    padding: 24,
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEE",
    borderStyle: "dashed",
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#444",
    marginTop: 8,
  },
  emptyHint: { fontSize: 12, color: "#999", marginTop: 4, textAlign: "center" },
  templateList: { marginBottom: 24 },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEE",
    backgroundColor: "#FFF",
    marginBottom: 10,
  },
  cardSelected: {
    borderColor: "#C28E5C",
    backgroundColor: "#FFF7EB",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    flex: 1,
  },
  cardBody: {
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
  },
  cardMeta: {
    fontSize: 11,
    color: "#888",
    marginTop: 6,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#DDD",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: "#C28E5C" },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C28E5C",
  },
  repliesSection: {
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  hint: { fontSize: 12, color: "#666", marginBottom: 12, textAlign: "right" },
  textArea: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FFF",
    fontSize: 14,
    color: "#2C2C2C",
    fontFamily: "Cairo_400Regular",
    minHeight: 80,
    textAlignVertical: "top",
    textAlign: "right",
  },
  tabsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#FFF",
  },
  tabBtnActive: {
    borderColor: "#C28E5C",
    backgroundColor: "#FFF7EB",
  },
  tabBtnText: { fontSize: 13, color: "#666", fontFamily: "Cairo_500Medium" },
  tabBtnTextActive: { color: "#5A4A42", fontFamily: "Cairo_700Bold" },
});

export default StepFour;
