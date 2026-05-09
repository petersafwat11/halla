import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "../../localization";
import {
  useHostTemplates,
  useTemplateCategories,
} from "../../hooks/queries/useTemplates";
import TemplateCategoryChips from "./_components/TemplateCategoryChips";
import TemplateCard from "./_components/TemplateCard";

const CARD_WIDTH = 123;
const CARD_SPACING = 12;
const STEP = CARD_WIDTH + CARD_SPACING;

const EventTemplates = ({ onSelectTemplate, selectedTemplateId }) => {
  const { t, currentLanguage, isRTL } = useTranslation("common");
  const locale = currentLanguage;

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [scrollX] = useState(new Animated.Value(0));
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef(null);

  const {
    data: catData,
    isLoading: loadingCats,
    isError: catsError,
  } = useTemplateCategories();

  const {
    data: tplData,
    isLoading: loadingTemplates,
    isError: tplError,
  } = useHostTemplates({ category: selectedCategory });

  const categories = catData?.data?.categories || [];
  const templates = tplData?.data?.templates || [];
  const maxIdx = Math.max(0, templates.length - 1);

  const handleTemplatePress = (template) => {
    if (onSelectTemplate) onSelectTemplate(template);
  };

  const scrollToIdx = (i) => {
    const clamped = Math.min(Math.max(0, i), maxIdx);
    setActiveIdx(clamped);
    scrollRef.current?.scrollTo({ x: clamped * STEP, animated: true });
  };

  const handleMomentumEnd = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / STEP);
    setActiveIdx(Math.min(Math.max(0, i), maxIdx));
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const goPrev = () => scrollToIdx(activeIdx - 1);
  const goNext = () => scrollToIdx(activeIdx + 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t("templates", "قوالب المناسبات")}
        </Text>
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
              contentContainerStyle={styles.templatesContent}
              onScroll={onScroll}
              onMomentumScrollEnd={handleMomentumEnd}
              scrollEventThrottle={16}
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
                    (isRTL ? activeIdx >= maxIdx : activeIdx <= 0) &&
                      styles.ctrlBtnDisabled,
                  ]}
                  onPress={isRTL ? goNext : goPrev}
                  disabled={isRTL ? activeIdx >= maxIdx : activeIdx <= 0}
                  activeOpacity={0.7}
                >
                  <Text style={styles.ctrlIcon}>
                    {isRTL ? "›" : "‹"}
                  </Text>
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
                    (isRTL ? activeIdx <= 0 : activeIdx >= maxIdx) &&
                      styles.ctrlBtnDisabled,
                  ]}
                  onPress={isRTL ? goPrev : goNext}
                  disabled={isRTL ? activeIdx <= 0 : activeIdx >= maxIdx}
                  activeOpacity={0.7}
                >
                  <Text style={styles.ctrlIcon}>
                    {isRTL ? "‹" : "›"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "column",
    alignItems: "flex-end",
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
  templatesContent: {
    paddingHorizontal: 0,
    gap: CARD_SPACING,
    flexDirection: "row-reverse",
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
});

export default EventTemplates;
