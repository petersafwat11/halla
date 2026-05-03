/**
 * StepFive (mobile) — Phase 4c W2-MOBILE-WIZARD
 *
 * Per D4c-1: messaging + auto-replies + host note. Mirrors the web
 * StepFive (`labbe/.../stepFive/StepFive.js`).
 *
 * Dual-writes legacy + canonical keys:
 *   guestReplies.{onAttend,onAbsent,onExpected}  ⇄ {attendance,absence,
 *                                                    expectedAttendance}AutoReply
 *   hostNote                                      ⇄ note
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useFormContext } from "react-hook-form";

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

const StepFive = () => {
  const { setValue, watch } = useFormContext();
  const [activeTab, setActiveTab] = useState("onAttend");

  const guestReplies = watch("guestReplies") || {};
  const invitationMessage = watch("invitationMessage") || "";
  const hostNote = watch("hostNote") || "";

  // Seed defaults once
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

  const activeReplyMeta = REPLY_TABS.find((tab) => tab.key === activeTab);
  const activeReplyValue = guestReplies?.[activeTab] || "";

  const handleReplyChange = (text) => {
    if (!activeReplyMeta) return;
    setValue(`guestReplies.${activeReplyMeta.key}`, text, { shouldDirty: true });
    setValue(activeReplyMeta.legacy, text, { shouldDirty: true });
  };

  const handleInvitationChange = (text) => {
    setValue("invitationMessage", text, { shouldDirty: true });
  };

  const handleNoteChange = (text) => {
    setValue("hostNote", text, { shouldDirty: true });
    setValue("note", text, { shouldDirty: true });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionLabel}>نص الدعوة</Text>
      <TextInput
        value={invitationMessage}
        onChangeText={handleInvitationChange}
        placeholder="اكتب نص الدعوة (اختياري)"
        placeholderTextColor="#999"
        multiline
        numberOfLines={3}
        maxLength={500}
        style={[styles.textArea, { writingDirection: "rtl" }]}
      />

      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>الردود التلقائية</Text>
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

      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
        ملاحظة المضيف <Text style={styles.optional}>(اختياري)</Text>
      </Text>
      <TextInput
        value={hostNote}
        onChangeText={handleNoteChange}
        placeholder="اكتب ملاحظتك هنا"
        placeholderTextColor="#999"
        maxLength={300}
        style={[styles.textInput, { writingDirection: "rtl" }]}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { paddingBottom: 24 },
  sectionLabel: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    marginBottom: 6,
    textAlign: "right",
  },
  optional: { color: "#999", fontSize: 13, fontFamily: "Cairo_400Regular" },
  hint: { fontSize: 12, color: "#666", marginBottom: 8, textAlign: "right" },
  textInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FFF",
    fontSize: 14,
    color: "#2C2C2C",
    fontFamily: "Cairo_400Regular",
    textAlign: "right",
  },
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

export default StepFive;
