/**
 * StepFour (mobile) — Phase 4c W2-MOBILE-WIZARD
 *
 * Per D4c-1 locked structure: Step 4 is the Taqnyat-template picker
 * (filtered by the visual template's category). Reads from the new
 * backend cache `GET /taqnyat-templates?category=…`.
 *
 * The auto-replies UI moved to StepFive (per the locked 6-step flow).
 *
 * Saves under both legacy `selectedTemplate` and canonical
 * `taqnyatTemplate.templateRef` so the dual-write window resolves
 * correctly.
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useFormContext } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { taqnyatTemplatesService } from "../../services/taqnyatTemplatesService";

const StepFour = () => {
  const { setValue, watch } = useFormContext();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const visualTemplate = watch("visualTemplate");
  const selectedTemplate = watch("selectedTemplate");
  const category = visualTemplate?.categories?.[0] || "";

  const { data, isLoading } = useQuery({
    queryKey: ["taqnyat-templates", "host", category || "all"],
    queryFn: () => taqnyatTemplatesService.getTemplates({ category: category || undefined }),
    staleTime: 5 * 60 * 1000,
  });

  const templates = data?.data?.templates || data?.templates || [];

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [fadeAnim]);

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

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
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
        <ScrollView showsVerticalScrollIndicator={false}>
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
        </ScrollView>
      )}
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
});

export default StepFour;
