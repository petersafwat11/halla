import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Platform,
  TouchableOpacity,
  Modal,
  Image,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import { ENDPOINTS, resolveApiUrl } from "../../config/api";
import { useAuthStore } from "../../stores/authStore";
import DirectionalIonicon from "../common/DirectionalIonicon";
import LocalizedText from "../commen/LocalizedText";
import TemplateCategoryChips from "./_components/TemplateCategoryChips";
import TemplateCard from "./_components/TemplateCard";
import { useHostTemplates, useTemplateCategories } from "../../hooks/templates";

const CARD_WIDTH = 123;
const CARD_SPACING = 12;
const STEP = CARD_WIDTH + CARD_SPACING;

const LOCAL_CATEGORIES = [
  { code: "wedding",       nameEn: "Wedding",       nameAr: "زفاف" },
  { code: "engagement",    nameEn: "Engagement",    nameAr: "خطوبة" },
  { code: "birthday",      nameEn: "Birthday",      nameAr: "عيد ميلاد" },
  { code: "baby_shower",   nameEn: "Baby Shower",   nameAr: "استقبال مولود" },
  { code: "ladies_event",  nameEn: "Ladies' Event", nameAr: "مناسبة نسائية" },
  { code: "general_event", nameEn: "General Event", nameAr: "مناسبات عامة" },
];

const EventTemplates = ({ onSelectTemplate, selectedTemplateId }) => {
  const { t, currentLanguage, isRTL } = useTranslation("common");
  const locale = currentLanguage;
  const token = useAuthStore((state) => state.token);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [scrollX] = useState(new Animated.Value(0));
  const [activeIdx, setActiveIdx] = useState(0);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [previewImageError, setPreviewImageError] = useState(false);
  const scrollRef = useRef(null);

  const {
    data: categoriesData,
    isLoading: loadingCats,
    error: categoriesError,
  } = useTemplateCategories();
  const {
    data: templatesData,
    isLoading: loadingTemplates,
    error: templatesError,
  } = useHostTemplates({ category: selectedCategory || undefined });

  const catsError = !!categoriesError;
  const tplError = !!templatesError;
  // Backend templates only — no bundled local catalogue fallback. When the
  // request fails the picker renders its error state instead of showing
  // placeholder cards.
  const categories = categoriesData?.data?.categories || LOCAL_CATEGORIES;
  const templates = React.useMemo(() => {
    const remote = templatesData?.data?.templates;
    return Array.isArray(remote) ? remote : [];
  }, [templatesData]);

  const maxIdx = Math.max(0, templates.length - 1);
  const previewImageSource = React.useMemo(() => {
    if (!previewTemplate) return null;
    if (previewTemplate.src) return previewTemplate.src;

    const templateId = String(previewTemplate._id || previewTemplate.id || "");
    const isDatabaseTemplate = /^[a-f\d]{24}$/i.test(templateId);

    const raw =
      previewTemplate.imageUrl ||
      previewTemplate.thumbnailUrl ||
      (isDatabaseTemplate ? ENDPOINTS.TEMPLATES.ASSET(templateId) : null);

    if (!raw) return null;
    const uri = resolveApiUrl(raw);
    return {
      uri,
      ...(token ? { headers: { Authorization: `Bearer ${token}`, "X-Client": "mobile" } } : {}),
    };
  }, [previewTemplate, token]);

  // RTL indexing strategy (plan §3.1.6 / Phase 6 audit): on iOS an RTL
  // horizontal ScrollView reports contentOffset.x as 0 at the leading
  // (right) edge and NEGATIVE offsets when scrolling toward the end.
  // Android RTL keeps positive offsets from the leading edge. Normalize the
  // sign so scrollToIdx()/handleMomentumScrollEnd() agree on both platforms
  // and preserve the selected index, pagination, and scroll direction.
  const OFFSET_SIGN = isRTL && Platform.OS === "ios" ? -1 : 1;

  const handleTemplatePress = (template) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    } else {
      setPreviewImageError(false);
      setPreviewTemplate(template);
    }
  };

  const scrollToIdx = (i) => {
    const clamped = Math.min(Math.max(0, i), maxIdx);
    setActiveIdx(clamped);
    scrollRef.current?.scrollTo({ x: OFFSET_SIGN * clamped * STEP, animated: true });
  };

  const handleMomentumEnd = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round((x / STEP) * OFFSET_SIGN);
    setActiveIdx(Math.min(Math.max(0, i), maxIdx));
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true }
  );

  const goPrev = () => scrollToIdx(activeIdx - 1);
  const goNext = () => scrollToIdx(activeIdx + 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Section heading: localized role, key only (no inline literals). */}
        <LocalizedText role="sectionTitle" style={styles.title}>
          {t("templates")}
        </LocalizedText>
      </View>

      {loadingCats ? (
        <ActivityIndicator size="small" color="#C28E5C" />
      ) : catsError ? (
        <LocalizedText role="hint" style={styles.errorText}>
          {t("templates_categories_error")}
        </LocalizedText>
      ) : (
        <TemplateCategoryChips
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={(cat) => {
            setSelectedCategory(cat);
            setActiveIdx(0);
            scrollRef.current?.scrollTo({ x: 0, animated: false });
          }}
          locale={locale}
          allLabel={t("common.all")}
        />
      )}

      <View style={styles.templatesContainer}>
        {loadingTemplates ? (
          <ActivityIndicator size="small" color="#C28E5C" />
        ) : tplError ? (
          <LocalizedText role="hint" style={styles.errorText}>
            {t("templates_load_error")}
          </LocalizedText>
        ) : templates.length === 0 ? (
          <LocalizedText role="hint" style={styles.emptyText}>
            {t("no_templates_available")}
          </LocalizedText>
        ) : (
          <>
            <Animated.ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={STEP}
              decelerationRate="fast"
              style={styles.scrollView}
              contentContainerStyle={styles.templatesContent}
              onScroll={onScroll}
              onMomentumScrollEnd={handleMomentumEnd}
              scrollEventThrottle={16}
              removeClippedSubviews={Platform.OS === "android"}
            >
              {templates.map((template, index) => {
                const templateId = template._id;
                const isSelected = selectedTemplateId === templateId;
                return (
                  <TemplateCard
                    key={templateId}
                    template={template}
                    index={index}
                    scrollX={scrollX}
                    cardSpacing={CARD_SPACING}
                    isSelected={isSelected}
                    onPress={handleTemplatePress}
                  />
                );
              })}
            </Animated.ScrollView>

            {templates.length > 1 && (
              <View style={styles.controls}>
                <TouchableOpacity
                  style={[
                    styles.ctrlBtn,
                    activeIdx <= 0 && styles.ctrlBtnDisabled,
                  ]}
                  onPress={goPrev}
                  disabled={activeIdx <= 0}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t("templates_previous")}
                >
                  <DirectionalIonicon
                    name="chevron-back"
                    size={18}
                    color="#6B4E33"
                  />
                </TouchableOpacity>

                <View style={styles.dots}>
                  {templates.map((_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.dot,
                        i === activeIdx && styles.dotActive,
                      ]}
                      onPress={() => scrollToIdx(i)}
                      accessibilityRole="button"
                      accessibilityLabel={`${i + 1}`}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.ctrlBtn,
                    activeIdx >= maxIdx && styles.ctrlBtnDisabled,
                  ]}
                  onPress={goNext}
                  disabled={activeIdx >= maxIdx}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t("templates_next")}
                >
                  <DirectionalIonicon
                    name="chevron-forward"
                    size={18}
                    color="#6B4E33"
                  />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      <Modal
        visible={!!previewTemplate}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewTemplate(null)}
      >
        <TouchableWithoutFeedback onPress={() => setPreviewTemplate(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    onPress={() => setPreviewTemplate(null)}
                    style={styles.modalCloseButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={t("buttons.close")}
                  >
                    {/* Close glyph: never mirrored; sits at logical end. */}
                    <Ionicons name="close" size={20} color="#656565" />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalBody}>
                  {previewImageSource && !previewImageError ? (
                    <Image
                      source={previewImageSource}
                      style={styles.modalImage}
                      resizeMode="contain"
                      onError={() => setPreviewImageError(true)}
                    />
                  ) : previewImageError ? (
                    <LocalizedText role="hint" style={styles.errorText}>
                      {t("templates_load_error")}
                    </LocalizedText>
                  ) : (
                    <ActivityIndicator size="large" color="#C28E5C" />
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "column",
    alignItems: "stretch",
    gap: 16,
    borderRadius: 12,
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    alignSelf: "stretch",
  },
  title: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 24,
    letterSpacing: 0.08,
  },
  templatesContainer: {
    width: "100%",
    alignItems: "center",
  },
  scrollView: {
    width: "100%",
  },
  templatesContent: {
    paddingHorizontal: 0,
    gap: CARD_SPACING,
  },
  errorText: {
    fontSize: 13,
    color: "#C0392B",
    fontFamily: "Cairo_500Medium",
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#656565",
    fontFamily: "Cairo_500Medium",
    paddingVertical: 8,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginTop: 12,
    width: "100%",
  },
  ctrlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E8D7C2",
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  ctrlBtnDisabled: {
    opacity: 0.3,
  },
  ctrlIcon: {
    fontSize: 20,
    color: "#6B4E33",
    lineHeight: 22,
    fontWeight: "600",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
    flexWrap: "nowrap",
    overflow: "hidden",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#E8D7C2",
  },
  dotActive: {
    width: 18,
    borderRadius: 3,
    backgroundColor: "#C28E5C",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    width: "100%",
    maxWidth: 360,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    padding: 16,
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
  },
  modalImage: {
    width: "100%",
    height: 480,
    borderRadius: 8,
  },
});

export default EventTemplates;
