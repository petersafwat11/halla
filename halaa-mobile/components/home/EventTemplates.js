import React, { useRef, useState } from "react";
import {
  View,
  Text,
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

const LOCAL_TEMPLATES = [
  {
    _id: "tpl-1",
    nameEn: "Royal Groom",
    nameAr: "زفاف ملكي",
    categories: ["wedding"],
    src: require("../../assets/template-cards/1.png"),
  },
  {
    _id: "tpl-2",
    nameEn: "Pearl Da'wah Wedding",
    nameAr: "دعوة زفاف لؤلؤية",
    categories: ["wedding"],
    src: require("../../assets/template-cards/2.png"),
  },
  {
    _id: "tpl-3",
    nameEn: "Royal Da'wah Wedding",
    nameAr: "دعوة الفرح الملكي",
    categories: ["wedding"],
    src: require("../../assets/template-cards/3.png"),
  },
  {
    _id: "tpl-4",
    nameEn: "Gulf Groom",
    nameAr: "زفاف الخليج",
    categories: ["wedding"],
    src: require("../../assets/template-cards/4.png"),
  },
  {
    _id: "tpl-5",
    nameEn: "Rose Garden Wedding",
    nameAr: "زفاف الورد",
    categories: ["wedding"],
    src: require("../../assets/template-cards/5.png"),
  },
  {
    _id: "tpl-6",
    nameEn: "Burgundy Bloom Wedding",
    nameAr: "زفاف الورد الأرجواني",
    categories: ["wedding", "ladies_event"],
    src: require("../../assets/template-cards/6.png"),
  },
  {
    _id: "tpl-7",
    nameEn: "Floral Arch Wedding",
    nameAr: "قوس الزهور",
    categories: ["wedding"],
    src: require("../../assets/template-cards/7.png"),
  },
  {
    _id: "tpl-8",
    nameEn: "Candle Engagement",
    nameAr: "خطوبة الشموع",
    categories: ["wedding", "engagement"],
    src: require("../../assets/template-cards/8.png"),
  },
  {
    _id: "tpl-9",
    nameEn: "Sacred Vows",
    nameAr: "عقد قران مبارك",
    categories: ["wedding"],
    src: require("../../assets/template-cards/9.png"),
  },
  {
    _id: "tpl-10",
    nameEn: "Eid Al-Adha",
    nameAr: "عيد الأضحى",
    categories: ["general_event"],
    src: require("../../assets/template-cards/10.png"),
  },
  {
    _id: "tpl-11",
    nameEn: "Ramadan Iftar",
    nameAr: "سفرة إفطار رمضان",
    categories: ["general_event"],
    src: require("../../assets/template-cards/11.png"),
  },
  {
    _id: "tpl-12",
    nameEn: "Birthday Party",
    nameAr: "حفلة عيد ميلاد",
    categories: ["birthday"],
    src: require("../../assets/template-cards/12.png"),
  },
  {
    _id: "tpl-13",
    nameEn: "Newborn Boy",
    nameAr: "بشارة المولود",
    categories: ["baby_shower"],
    src: require("../../assets/template-cards/13.png"),
  },
  {
    _id: "tpl-14",
    nameEn: "Newborn Girl",
    nameAr: "بشارة الأميرة",
    categories: ["baby_shower"],
    src: require("../../assets/template-cards/14.jpg"),
  },
  {
    _id: "tpl-15",
    nameEn: "Graduation Celebration",
    nameAr: "حفل تخرج",
    categories: ["general_event"],
    src: require("../../assets/template-cards/15.png"),
  },
  {
    _id: "tpl-16",
    nameEn: "Pearl Promise",
    nameAr: "وعد لؤلؤي",
    categories: ["engagement"],
    src: require("../../assets/template-cards/16.png"),
  },
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
  const categories = categoriesData?.data?.categories || LOCAL_CATEGORIES;
  const templates = React.useMemo(() => {
    const remote = templatesData?.data?.templates;
    if (Array.isArray(remote)) return remote;
    // The local catalogue remains a home-screen-only offline fallback. The
    // picker renders its request error instead of opening metadata-less cards.
    if (templatesError) return LOCAL_TEMPLATES;
    return [];
  }, [templatesData, templatesError]);

  const maxIdx = Math.max(0, templates.length - 1);
  const previewImageSource = React.useMemo(() => {
    if (!previewTemplate) return null;
    if (previewTemplate.src) return previewTemplate.src;
    if (previewImageError && previewTemplate.fallbackSource) return previewTemplate.fallbackSource;

    const templateId = String(previewTemplate._id || previewTemplate.id || "");
    const isDatabaseTemplate = /^[a-f\d]{24}$/i.test(templateId);

    const raw =
      previewTemplate.imageUrl ||
      previewTemplate.thumbnailUrl ||
      (isDatabaseTemplate ? ENDPOINTS.TEMPLATES.ASSET(templateId) : null);

    if (!raw) return previewTemplate.fallbackSource || null;
    const uri = resolveApiUrl(raw);
    return {
      uri,
      ...(token ? { headers: { Authorization: `Bearer ${token}`, "X-Client": "mobile" } } : {}),
    };
  }, [previewTemplate, previewImageError, token]);

  // RTL indexing strategy (plan §3.1.6 / Phase 6 audit): on iOS an RTL
  // horizontal ScrollView reports contentOffset.x as 0 at the leading
  // (right) edge and NEGATIVE offsets when scrolling toward the end.
  // Android RTL keeps positive offsets from the leading edge. Normalize the
  // sign so scrollToIdx()/handleMomentumScrollEnd() agree on both platforms
  // and preserve the selected index, pagination, and scroll direction.
  const OFFSET_SIGN = isRTL && Platform.OS === "ios" ? -1 : 1;

  const handleTemplatePress = (template, fallbackSource) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    } else {
      setPreviewImageError(false);
      setPreviewTemplate({
        ...template,
        fallbackSource,
      });
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
        <Text style={styles.title}>{t("templates", "قوالب المناسبات")}</Text>
      </View>

      {loadingCats ? (
        <ActivityIndicator size="small" color="#C28E5C" />
      ) : catsError ? (
        <Text style={styles.errorText}>
          {t("templates_categories_error", "تعذر تحميل الفئات")}
        </Text>
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
          allLabel={t("common.all", "الكل")}
        />
      )}

      <View style={styles.templatesContainer}>
        {loadingTemplates ? (
          <ActivityIndicator size="small" color="#C28E5C" />
        ) : tplError ? (
          <Text style={styles.errorText}>
            {t("templates_load_error", "تعذر تحميل القوالب")}
          </Text>
        ) : templates.length === 0 ? (
          <Text style={styles.emptyText}>
            {t("no_templates_available", "لا توجد قوالب متاحة")}
          </Text>
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
                    fallbackSource={LOCAL_TEMPLATES[index % LOCAL_TEMPLATES.length]?.src}
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
                  >
                    <Ionicons name="close" size={20} color="#656565" />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalBody}>
                  {previewImageSource ? (
                    <Image
                      source={previewImageSource}
                      style={styles.modalImage}
                      resizeMode="contain"
                      onError={() => setPreviewImageError(true)}
                    />
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
