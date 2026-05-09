import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
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

const EventTemplates = ({ onSelectTemplate, selectedTemplateId }) => {
  const { t, currentLanguage } = useTranslation("common");
  const locale = currentLanguage;

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [scrollX] = useState(new Animated.Value(0));

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

  const handleTemplatePress = (template) => {
    if (onSelectTemplate) onSelectTemplate(template);
  };

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
          onSelect={setSelectedCategory}
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
          <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            decelerationRate="fast"
            contentContainerStyle={styles.templatesContent}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
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
});

export default EventTemplates;
