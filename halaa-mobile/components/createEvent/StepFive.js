/**
 * StepFive (mobile) — messaging + auto-replies + host note.
 *
 * Dual-writes legacy + canonical keys:
 *   guestReplies.{onAttend,onAbsent}  ⇄ {attendance,absence}AutoReply
 *   hostNote                                      ⇄ note
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import TextInput from "../commen/DirectionalTextInput";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "../../localization";

const StepFive = () => {
  const { t } = useTranslation("createEvent");
  const { setValue, watch } = useFormContext();
  const [activeTab, setActiveTab] = useState("onAttend");

  // Defaults must match `messaging.service.handleButtonResponse`'s
  // fallback strings (server side) so the host preview lines up with
  // what guests would receive if no override is saved.
  const AUTO_REPLIES_DEFAULTS = useMemo(
    () => ({
      onAttend: t("auto_replies_default_attending"),
      onAbsent: t("auto_replies_default_absence"),
    }),
    [t]
  );

  const REPLY_TABS = useMemo(
    () => [
      { key: "onAttend", label: t("auto_replies_tab_attending") },
      { key: "onAbsent", label: t("auto_replies_tab_absence") },
    ],
    [t]
  );

  const guestReplies = watch("guestReplies") || {};
  const invitationMessage = watch("invitationMessage") || "";
  const hostNote = watch("hostNote") || "";

  // Seed defaults once
  useEffect(() => {
    if (!guestReplies?.onAttend) {
      setValue("guestReplies.onAttend", AUTO_REPLIES_DEFAULTS.onAttend, { shouldDirty: false });
    }
    if (!guestReplies?.onAbsent) {
      setValue("guestReplies.onAbsent", AUTO_REPLIES_DEFAULTS.onAbsent, { shouldDirty: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeReplyMeta = REPLY_TABS.find((tab) => tab.key === activeTab);
  const activeReplyValue = guestReplies?.[activeTab] || "";

  const handleReplyChange = (text) => {
    if (!activeReplyMeta) return;
    setValue(`guestReplies.${activeReplyMeta.key}`, text, { shouldDirty: true });
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
      <Text style={styles.sectionLabel}>{t("invitation_message_label")}</Text>
      <TextInput
        contentDirection="adaptive"
        value={invitationMessage}
        onChangeText={handleInvitationChange}
        placeholder={t("invitation_message_placeholder")}
        placeholderTextColor="#999"
        multiline
        numberOfLines={3}
        maxLength={500}
        style={styles.textArea}
      />

      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>{t("auto_replies")}</Text>
      <Text style={styles.hint}>{t("auto_replies_hint")}</Text>

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
        contentDirection="adaptive"
        value={activeReplyValue}
        onChangeText={handleReplyChange}
        placeholder={t("auto_reply_placeholder")}
        placeholderTextColor="#999"
        multiline
        numberOfLines={4}
        maxLength={500}
        style={styles.textArea}
      />

      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
        {t("add_note_label")} <Text style={styles.optional}>{t("optional")}</Text>
      </Text>
      <TextInput
        contentDirection="adaptive"
        value={hostNote}
        onChangeText={handleNoteChange}
        placeholder={t("add_note_placeholder")}
        placeholderTextColor="#999"
        maxLength={300}
        style={styles.textInput}
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
  },
  optional: { color: "#999", fontSize: 13, fontFamily: "Cairo_400Regular" },
  hint: { fontSize: 12, color: "#666", marginBottom: 8 },
  textInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FFF",
    fontSize: 14,
    color: "#2C2C2C",
    fontFamily: "Cairo_400Regular",
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
