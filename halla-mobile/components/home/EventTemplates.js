import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { templateService } from "../../services/templateService";
import { useAuthStore } from "../../stores/authStore";
import { useTranslation } from "../../localization";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = 123;
const CARD_SPACING = 12;

const EventTemplates = ({ onSelectTemplate, selectedTemplateId }) => {
  const { t, currentLanguage } = useTranslation("common");
  const { token } = useAuthStore();
  const locale = currentLanguage;

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [scrollX] = useState(new Animated.Value(0));

  // Fetch categories on mount
  useEffect(() => {
    templateService
      .getCategories(token)
      .then((res) => setCategories(res.categories || res.data || []))
      .catch(console.error)
      .finally(() => setLoadingCats(false));
  }, []);

  // Fetch templates when category changes
  useEffect(() => {
    setLoadingTemplates(true);
    const params = selectedCategory ? { category: selectedCategory } : {};
    templateService
      .getTemplates(params, token)
      .then((res) => setTemplates(res.templates || res.data || []))
      .catch(console.error)
      .finally(() => setLoadingTemplates(false));
  }, [selectedCategory]);

  const handleTemplatePress = (template) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("templates") || "قوالب المناسبات"}</Text>
      </View>

      {/* Categories */}
      {loadingCats ? (
        <ActivityIndicator size="small" color="#C28E5C" />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {/* All categories chip */}
          <TouchableOpacity
            style={[
              styles.categoryButton,
              selectedCategory === null && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(null)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === null && styles.categoryTextActive,
              ]}
            >
              {t("navigation.events") || "الكل"}
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => {
            const label =
              locale === "ar"
                ? cat.nameAr || cat.nameEn
                : cat.nameEn || cat.nameAr;
            const catId = cat._id || cat.id;
            return (
              <TouchableOpacity
                key={catId}
                style={[
                  styles.categoryButton,
                  selectedCategory === catId && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(catId)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === catId && styles.categoryTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Templates */}
      <View style={styles.templatesContainer}>
        {loadingTemplates ? (
          <ActivityIndicator size="small" color="#C28E5C" />
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
              const inputRange = [
                (index - 1) * (CARD_WIDTH + CARD_SPACING),
                index * (CARD_WIDTH + CARD_SPACING),
                (index + 1) * (CARD_WIDTH + CARD_SPACING),
              ];

              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [0.9, 1, 0.9],
                extrapolate: "clamp",
              });

              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.7, 1, 0.7],
                extrapolate: "clamp",
              });

              const templateId = template._id || template.id;
              const isSelected = selectedTemplateId === templateId;
              const imgUri = template.thumbnailUrl || template.imageUrl;

              return (
                <TouchableOpacity
                  key={templateId}
                  onPress={() => handleTemplatePress(template)}
                  activeOpacity={0.8}
                >
                  <Animated.View
                    style={[
                      styles.templateCard,
                      { transform: [{ scale }], opacity },
                      isSelected && styles.templateCardSelected,
                    ]}
                  >
                    <View style={styles.cardBackground}>
                      {imgUri ? (
                        <Image
                          source={{ uri: imgUri }}
                          style={styles.templateImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[styles.templateImage, styles.placeholderImage]}
                        />
                      )}
                      {isSelected && (
                        <View style={styles.selectedOverlay}>
                          <View style={styles.checkmarkContainer}>
                            <Text style={styles.checkmark}>✓</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </Animated.View>
                </TouchableOpacity>
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
  categoriesContainer: {
    width: "100%",
  },
  categoriesContent: {
    paddingRight: 0,
    gap: 8,
    flexDirection: "row",
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F2F2F2",
  },
  categoryButtonActive: {
    backgroundColor: "#C28E5C",
  },
  categoryText: {
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
    lineHeight: 20,
    letterSpacing: 0.014,
  },
  categoryTextActive: {
    color: "#FFF",
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
  templateCard: {
    width: CARD_WIDTH,
    height: 150,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0.625 },
    shadowOpacity: 0.1,
    shadowRadius: 1.875,
    elevation: 3,
  },
  templateCardSelected: {
    borderWidth: 2,
    borderColor: "#C28E5C",
    shadowColor: "#C28E5C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cardBackground: {
    width: "100%",
    height: "100%",
    borderRadius: 3.738,
    backgroundColor: "#FFFAEA",
    overflow: "hidden",
  },
  templateImage: {
    width: 103,
    height: 138,
    borderRadius: 6.417,
    position: "absolute",
    left: 10,
    top: 6,
  },
  placeholderImage: {
    backgroundColor: "#F2ECD8",
  },
  selectedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(194, 142, 92, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#C28E5C",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
  },
});

export default EventTemplates;
