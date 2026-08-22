/**
 * StepFour (mobile) — Taqnyat picker + auto-replies.
 *
 * Step 4 combines the Taqnyat-template picker with the auto-replies
 * editor below it.
 *
 * Saves under both `selectedTemplate` and `taqnyatTemplate.templateRef`.
 * Auto-replies write guestReplies.* plus the legacy keys.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import {
  resolveTaqnyatPlaceholders,
  buildTaqnyatPreviewContext,
  formatDate,
} from "@halaa/shared/utils";
import { useHostTaqnyatTemplates } from "../../hooks/taqnyatTemplates";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import PreviewInvitation from "./PreviewInvitation";
import {
  INVITATION_TYPE_OPTIONS,
  DEFAULT_INVITATION_TYPE,
  invitationAllowsReply,
} from "../../utils/invitationTypes";

const CATEGORY_LABELS_AR = {
  wedding: "حفل زفاف",
  birthday: "عيد ميلاد",
  graduation: "حفل تخرج",
  engagement: "خطوبة",
  conference: "مؤتمر",
  meeting: "اجتماع",
  other: "أخرى",
};

const REPLY_TABS = [
  {
    key: "onAttend",
    labelKey: "auto_replies_tab_attending",
    fallback: "الحضور",
    defaultKey: "auto_replies_default_attending",
    defaultText: "شكرًا لتأكيد حضورك! يسعدنا أن تكون معنا في هذه المناسبة. 🎉",
  },
  {
    key: "onAbsent",
    labelKey: "auto_replies_tab_absence",
    fallback: "الاعتذار",
    defaultKey: "auto_replies_default_absence",
    defaultText: "شكراً لإعلامنا. نتفهم ظروفك ونتمنى لك دوام الصحة والسعادة. 🌹",
  },
];

const StepFour = () => {
  const { setValue, watch } = useFormContext();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState("onAttend");
  const [showPreview, setShowPreview] = useState(false);
  const previousCategoryRef = useRef("");
  const previousInvitationTypeRef = useRef("");
  const { t, currentLanguage } = useTranslation("createEvent");

  const categoryLabel = (cat) =>
    cat ? t(`event_types.${cat}`, CATEGORY_LABELS_AR[cat] || cat) : "";

  const visualTemplate = watch("visualTemplate");
  const selectedTemplate = watch("selectedTemplate");
  // Filter templates by the event category chosen in step 1 (eventType),
  // not the visual template picked in step 3.
  const category = watch("eventType") || "";
  const guestReplies = watch("guestReplies") || {};
  const invitationType = watch("invitationType") || DEFAULT_INVITATION_TYPE;
  const replyAllowed = invitationAllowsReply(invitationType);
  const eventName = watch("eventName");
  const eventDate = watch("eventDate");
  const eventTime = watch("eventTime");
  const address = watch("address");
  const hostName = useAuthStore(
    (state) => state.user?.name || state.user?.username || ""
  );

  // Build a preview-resolution context once per form change so template
  // previews on screen match what the guest will receive.
  const previewContext = useMemo(() => {
    const dateFormatted = eventDate
      ? formatDate(eventDate, currentLanguage || "ar")
      : "";
    return buildTaqnyatPreviewContext({
      guestName: t("preview_guest_placeholder", "ضيفنا الكريم"),
      eventTitle: eventName,
      dateFormatted,
      eventTime,
      locationAddress: address?.address || "",
      hostName,
    });
  }, [eventName, eventDate, eventTime, address?.address, hostName, t, currentLanguage]);

  const { data, isLoading, error } = useHostTaqnyatTemplates(
    {
      category: category || undefined,
      type: "invite",
      invitationMode: invitationType,
    },
    { enabled: Boolean(category) }
  );

  const templates = data?.data?.templates || [];

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => {
    REPLY_TABS.forEach((tab) => {
      if (!guestReplies?.[tab.key]) {
        setValue(`guestReplies.${tab.key}`, t(tab.defaultKey, tab.defaultText), { shouldDirty: false });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const previousCategory = previousCategoryRef.current;
    if (previousCategory && category && previousCategory !== category) {
      setValue("selectedTemplate", null, { shouldDirty: true });
      setValue("taqnyatTemplate", { templateRef: null }, { shouldDirty: true });
    }
    previousCategoryRef.current = category;
  }, [category, setValue]);

  useEffect(() => {
    const previousMode = previousInvitationTypeRef.current;
    if (previousMode && previousMode !== invitationType) {
      setValue("selectedTemplate", null, { shouldDirty: true });
      setValue("taqnyatTemplate", { templateRef: null }, { shouldDirty: true });
    }
    previousInvitationTypeRef.current = invitationType;
  }, [invitationType, setValue]);

  const handleTemplateSelect = (template) => {
    const enriched = {
      id: template._id,
      _id: template._id,
      name: template.templateName,
      templateName: template.templateName,
      language: template.language || "ar",
      hasImageHeader: template.hasImageHeader || false,
      bodyText: template.bodyText,
      category: template.category || category,
      invitationMode: template.invitationMode || invitationType,
      buttons: template.buttons || [],
    };
    setValue("selectedTemplate", enriched, { shouldValidate: true });
    setValue("taqnyatTemplate", { templateRef: template._id }, { shouldValidate: false });
  };

  const activeReplyMeta = REPLY_TABS.find((tab) => tab.key === activeTab);
  const activeReplyValue = guestReplies?.[activeTab] || "";

  const handleReplyChange = (text) => {
    if (!activeReplyMeta) return;
    setValue(`guestReplies.${activeReplyMeta.key}`, text, { shouldDirty: true });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Invitation type ──────────────────────────────────── */}
        <View style={styles.inviteTypeSection}>
          <Text style={styles.sectionTitle}>{t("invitation_type", "نوع الدعوة")}</Text>
          <Text style={styles.hint}>
            {t(
              "invitation_type_hint",
              "حدّد الرسالة التي تصل بعد تأكيد الضيف، أو أرسل دعوة نصية فقط بدون أزرار."
            )}
          </Text>
          <View style={styles.inviteTypeList}>
            {INVITATION_TYPE_OPTIONS.map((opt) => {
              const isSelected = invitationType === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.inviteTypeCard,
                    isSelected && styles.inviteTypeCardSelected,
                  ]}
                  onPress={() =>
                    setValue("invitationType", opt.value, { shouldDirty: true })
                  }
                  activeOpacity={0.85}
                >
                  <View style={styles.cardHeaderRow}>
                    <View
                      style={[
                        styles.iconContainer,
                        isSelected && styles.iconContainerSelected,
                      ]}
                    >
                      <Ionicons
                        name={opt.iconName || "mail-outline"}
                        size={22}
                        color={isSelected ? "#FFF" : "#8A7E74"}
                      />
                    </View>

                    <View style={styles.titleColumn}>
                      <View style={styles.titleRow}>
                        <Text
                          style={[
                            styles.inviteTypeTitle,
                            isSelected && styles.inviteTypeTitleSelected,
                          ]}
                        >
                          {t(opt.labelKey)}
                        </Text>
                        {opt.badgeKey && (
                          <View style={styles.featureBadge}>
                            <Text style={styles.featureBadgeText}>
                              {t(opt.badgeKey, "شامل رمز الدخول")}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.inviteTypeDesc}>
                        {t(opt.descKey)}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleSelected,
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={13} color="#FFF" />
                      )}
                    </View>
                  </View>

                  {/* Feature chips */}
                  {opt.features && opt.features.length > 0 && (
                    <View style={styles.featureChipsRow}>
                      {opt.features.map((feat) => (
                        <View
                          key={feat.key}
                          style={[
                            styles.featureChip,
                            feat.included
                              ? styles.featureChipIncluded
                              : styles.featureChipExcluded,
                            isSelected &&
                              feat.included &&
                              styles.featureChipIncludedActive,
                          ]}
                        >
                          <Ionicons
                            name={
                              feat.included
                                ? "checkmark-circle"
                                : "close-circle-outline"
                            }
                            size={12}
                            color={
                              feat.included
                                ? isSelected
                                  ? "#2A8C5B"
                                  : "#43805B"
                                : "#A89E94"
                            }
                          />
                          <Text
                            style={[
                              styles.featureChipText,
                              !feat.included && styles.featureChipTextExcluded,
                            ]}
                          >
                            {t(feat.labelKey, feat.fallback)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Taqnyat template picker ──────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>{t("step4_title")}</Text>
          {category ? (
            <View style={styles.filterRow}>
              <Text style={styles.subtitle}>{t("step4_description")}</Text>
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>
                  {categoryLabel(category)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.subtitle}>{t("step4_description")}</Text>
          )}
        </View>

        {selectedTemplate ? (
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => setShowPreview(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="eye-outline" size={18} color="#C28E5C" />
            <Text style={styles.previewButtonText}>{t("preview_template")}</Text>
          </TouchableOpacity>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#C28E5C" />
          </View>
        ) : error ? (
          <View style={styles.emptyBox}>
            <Ionicons name="alert-circle-outline" size={36} color="#C0392B" />
            <Text style={styles.emptyTitle}>{t("taqnyat_load_failed", "تعذّر تحميل القوالب")}</Text>
            <Text style={styles.emptyHint}>{t("try_again_later", "حاول مرة أخرى لاحقاً")}</Text>
          </View>
        ) : templates.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="mail-outline" size={36} color="#999" />
            <Text style={styles.emptyTitle}>{t("no_taqnyat_templates", "لا توجد قوالب لهذه الفئة")}</Text>
            <Text style={styles.emptyHint}>
              {t("no_taqnyat_templates_hint", "تواصل مع الإدارة لتعيين قوالب لفئتك")}
            </Text>
          </View>
        ) : (
          <View style={styles.templateList}>
            {templates.map((tpl) => {
              const isSelected =
                selectedTemplate?._id === tpl._id ||
                selectedTemplate?.id === tpl._id ||
                selectedTemplate?.name === tpl.templateName;
              const tplCategory = tpl.category || category;
              return (
                <TouchableOpacity
                  key={tpl._id}
                  style={[styles.card, isSelected && styles.cardSelected]}
                  onPress={() => handleTemplateSelect(tpl)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.cardAccent,
                      isSelected && styles.cardAccentActive,
                    ]}
                  />
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardLabel}>
                        <View style={styles.cardLabelIcon}>
                          <Ionicons name="mail-outline" size={14} color="#A87040" />
                        </View>
                        <Text style={styles.cardLabelText}>
                          {tplCategory ? categoryLabel(tplCategory) : t("invitation_message_label")}
                        </Text>
                      </View>
                    </View>
                    {tpl.bodyText ? (
                      <View style={styles.bubble}>
                        <Text style={styles.bubbleText}>
                          {resolveTaqnyatPlaceholders(
                            tpl.bodyText,
                            tpl.varMapping,
                            previewContext
                          )}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={12} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Auto-replies (only for reply-enabled invitation types) ── */}
        <View style={styles.repliesSection}>
          <Text style={styles.sectionTitle}>{t("auto_replies")}</Text>
          <Text style={styles.hint}>{t("auto_replies_hint")}</Text>

          {replyAllowed ? (
            <>
              <View style={styles.tabsRow}>
                {REPLY_TABS.map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>
                      {t(tab.labelKey, tab.fallback)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                value={activeReplyValue}
                onChangeText={handleReplyChange}
                placeholder={t("auto_reply_placeholder")}
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                maxLength={500}
                style={styles.textArea}
              />
            </>
          ) : (
            <View style={styles.repliesDisabledNote}>
              <Text style={styles.repliesDisabledText}>
                {t(
                  "auto_replies_disabled_note",
                  "لا تحتوي هذه الدعوة على إمكانية الرد، لذلك لن تُرسل ردود تلقائية."
                )}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <PreviewInvitation
        visible={showPreview}
        onClose={() => setShowPreview(false)}
        templateImage={watch("templateImage")}
        template={visualTemplate}
        eventTitle={eventName || ""}
        previewBody={selectedTemplate?.bodyText || ""}
        selectedTemplate={selectedTemplate}
        eventDate={eventDate}
        eventTime={eventTime}
        location={address?.address || ""}
        templateData={visualTemplate?.data || {}}
        invitationType={invitationType}
      />
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
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#C28E5C",
    backgroundColor: "#FDF9F4",
    marginBottom: 16,
  },
  previewButtonText: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#A87040",
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
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    flexWrap: "wrap",
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#F5E9D8",
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: "Cairo_700Bold",
    color: "#6B4E33",
    letterSpacing: 0.2,
  },
  templateList: { marginBottom: 24 },
  card: {
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E8E2DA",
    backgroundColor: "#FFF",
    marginBottom: 12,
    position: "relative",
  },
  cardSelected: {
    borderColor: "#C28E5C",
    backgroundColor: "#FDF9F4",
    shadowColor: "#C28E5C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  cardAccent: {
    width: 4,
    backgroundColor: "#E8E2DA",
  },
  cardAccentActive: {
    backgroundColor: "#C28E5C",
  },
  cardContent: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardLabelIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#F9EFDE",
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabelText: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    flex: 1,
  },
  bubble: {
    backgroundColor: "#FAF6EF",
    borderRadius: 10,
    borderTopRightRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EFE6D6",
  },
  bubbleText: {
    fontSize: 13,
    color: "#4A3D33",
    lineHeight: 22,
    fontFamily: "Cairo_400Regular",
  },
  checkBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#C28E5C",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C28E5C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  repliesSection: {
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  hint: { fontSize: 12, color: "#666", marginBottom: 12 },
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

  // ── Invitation-type selector ──
  inviteTypeSection: { marginBottom: 24 },
  inviteTypeList: {
    gap: 12,
    marginTop: 8,
  },
  inviteTypeCard: {
    position: "relative",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#EAE4DC",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  inviteTypeCardSelected: {
    borderColor: "#C28E5C",
    backgroundColor: "#FFFDF9",
    shadowColor: "#C28E5C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F4EFE7",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainerSelected: {
    backgroundColor: "#C28E5C",
    shadowColor: "#C28E5C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  titleColumn: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  inviteTypeTitle: {
    fontSize: 14.5,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    textAlign: "right",
  },
  inviteTypeTitleSelected: {
    color: "#241D17",
  },
  featureBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#FFF3E3",
    borderWidth: 1,
    borderColor: "#F0DCB8",
  },
  featureBadgeText: {
    fontSize: 10.5,
    fontFamily: "Cairo_700Bold",
    color: "#A87040",
  },
  inviteTypeDesc: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#7D7267",
    textAlign: "right",
    lineHeight: 18,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#DCD5CC",
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  radioCircleSelected: {
    borderColor: "#C28E5C",
    backgroundColor: "#C28E5C",
    shadowColor: "#C28E5C",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  featureChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F4EFE9",
  },
  featureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#F7F5F0",
  },
  featureChipIncluded: {
    backgroundColor: "#F0F7F2",
  },
  featureChipIncludedActive: {
    backgroundColor: "#E8F4EC",
  },
  featureChipExcluded: {
    backgroundColor: "#F5F2EC",
  },
  featureChipText: {
    fontSize: 11,
    fontFamily: "Cairo_600SemiBold",
    color: "#2A8C5B",
  },
  featureChipTextExcluded: {
    color: "#8A7E74",
    fontFamily: "Cairo_400Regular",
  },
  repliesDisabledNote: {
    marginTop: 4,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5DED4",
    borderStyle: "dashed",
    backgroundColor: "#FAF6EF",
  },
  repliesDisabledText: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#8A7E74",
    lineHeight: 22,
    textAlign: "right",
  },
});

export default StepFour;
