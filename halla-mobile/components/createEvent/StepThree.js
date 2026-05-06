import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useFormContext, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import EventTemplates from "../home/EventTemplates";
import PreviewInvitation from "./PreviewInvitation";
import { useTranslation } from "../../localization";
import { buildDynamicTemplateSchema, buildDefaultValues } from "../../utils/schemas/createEventSchema";
import { dateToTimeString } from "../../utils/timeFormat";
import TemplatePreviewCanvas from "../shared/TemplatePreviewCanvas";
import { bakeCanvas } from "../../utils/canvasBake";
import { renderTemplateField } from "./_components/TemplateFieldRenderer";

const StepThree = () => {
  const { setValue: parentSetValue, watch: parentWatch } = useFormContext();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const canvasRef = useRef(null);
  const [showPreview, setShowPreview] = useState(false);
  const [templateConfirmed, setTemplateConfirmed] = useState(false);
  const [bakeError, setBakeError] = useState(null);
  const { t, currentLanguage } = useTranslation("admin");
  const locale = currentLanguage;

  const selectedTemplate = parentWatch("visualTemplate");
  const eventDate = parentWatch("eventDate");
  const eventTime = parentWatch("eventTime");

  const hasFields = selectedTemplate?.fields?.length > 0;

  const innerMethods = useForm({
    resolver: hasFields ? zodResolver(buildDynamicTemplateSchema(selectedTemplate.fields, t)) : undefined,
    defaultValues: buildDefaultValues(selectedTemplate, eventDate, eventTime),
  });

  // Reset inner form when template changes
  useEffect(() => {
    if (selectedTemplate?._id) {
      innerMethods.reset(buildDefaultValues(selectedTemplate, eventDate, eventTime));
      setTemplateConfirmed(false);
    }
  }, [selectedTemplate?._id]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handleTemplateSelect = useCallback((template) => {
    parentSetValue("visualTemplate", template, { shouldValidate: true });
    // Do not seed templateImage with the stock thumbnail/imageUrl.
    // The host must confirm via handleConfirmTemplate, which bakes the
    // canvas with their entered overlay data into a real File. Pre-
    // populating with the URL would let a stock image silently slip
    // through if the bake step is skipped.
    parentSetValue("templateImage", null, { shouldValidate: true });
    setTemplateConfirmed(false);
  }, [parentSetValue]);

  const handleConfirmTemplate = innerMethods.handleSubmit(async (data) => {
    const converted = { ...data };
    if (selectedTemplate?.fields) {
      for (const field of selectedTemplate.fields) {
        if (field.type === "time" && converted[field.key] instanceof Date) {
          converted[field.key] = dateToTimeString(converted[field.key]);
        }
      }
    }
    parentSetValue("visualTemplate", {
      ...selectedTemplate,
      data: converted,
      fieldValues: converted,
    }, { shouldValidate: true });

    // Bake the canvas with the user-overlaid data so the WhatsApp
    // header carries the customised image. No fallback: if the bake
    // fails, surface the error to the host and do NOT mark the
    // template as confirmed — they must retry rather than silently
    // shipping a stock thumbnail with no overlay data.
    setBakeError(null);
    try {
      const baked = await bakeCanvas(canvasRef, {
        width: selectedTemplate?.naturalWidth,
        height: selectedTemplate?.naturalHeight,
      });
      if (!baked?.file?.uri) {
        throw new Error("bakeCanvas returned no file");
      }
      parentSetValue("templateImage", baked.file, { shouldValidate: true });
      setTemplateConfirmed(true);
    } catch (err) {
      console.error("[StepThree] bakeCanvas failed:", err);
      setBakeError(err?.message || "BAKE_FAILED");
      parentSetValue("templateImage", null, { shouldValidate: true });
    }
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Template Selection */}
        <View style={styles.templateSection}>
          <EventTemplates
            onSelectTemplate={handleTemplateSelect}
            selectedTemplateId={selectedTemplate?._id || selectedTemplate?.id}
          />
        </View>

        {/* Live preview canvas — also the bake source for the WhatsApp
            header image. Watches the inner form so overlays update as
            the host types. */}
        {selectedTemplate && (
          <View style={styles.canvasWrapper} collapsable={false} ref={canvasRef}>
            <TemplatePreviewCanvas
              template={selectedTemplate}
              data={hasFields ? innerMethods.watch() : selectedTemplate?.data}
              primaryColor={hasFields ? innerMethods.watch("primaryColor") : selectedTemplate?.data?.primaryColor}
            />
          </View>
        )}

        {/* Dynamic Template Fields */}
        {selectedTemplate && hasFields && (
          <FormProvider {...innerMethods}>
            <Text style={styles.formTitle}>
              {t("templates.stepThree.customizeTitle") || "تصميم قالب الدعوة"}
            </Text>
            <View style={styles.formContainer}>
              {selectedTemplate.fields.map(field => renderTemplateField(field, locale, t))}

              <TouchableOpacity
                style={styles.previewButton}
                onPress={() => setShowPreview(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.previewButtonText}>
                  {t("templates.stepThree.previewBtn") || "معاينة الدعوة"}
                </Text>
              </TouchableOpacity>

              {!templateConfirmed && (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirmTemplate}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmButtonText}>
                    {t("templates.stepThree.confirmBtn") || "تأكيد القالب"}
                  </Text>
                </TouchableOpacity>
              )}

              {templateConfirmed && (
                <View style={styles.confirmedBadge}>
                  <Text style={styles.confirmedText}>✓ {t("templates.stepThree.confirmed") || "تم تأكيد القالب"}</Text>
                </View>
              )}

              {bakeError && (
                <View style={styles.bakeWarningBadge}>
                  <Text style={styles.bakeWarningText}>
                    {t("templates.stepThree.bakeFailed") ||
                      "تعذّر إنشاء صورة الدعوة. يرجى المحاولة مرة أخرى."}
                  </Text>
                </View>
              )}
            </View>
          </FormProvider>
        )}

        {/* No dynamic fields — just template selection */}
        {selectedTemplate && !hasFields && (
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => setShowPreview(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.previewButtonText}>
              {t("templates.stepThree.previewBtn") || "معاينة الدعوة"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <PreviewInvitation
        visible={showPreview}
        onClose={() => setShowPreview(false)}
        template={selectedTemplate}
        data={innerMethods.getValues()}
        eventDate={eventDate}
        eventTime={eventTime}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  templateSection: { marginBottom: 24 },
  formTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 24,
    letterSpacing: 0.08,
    marginBottom: 16,
  },
  formContainer: { gap: 0 },
  previewButton: {
    marginTop: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#C28E5C",
    alignItems: "center",
    justifyContent: "center",
  },
  previewButtonText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
    lineHeight: 24,
    letterSpacing: 0.08,
  },
  confirmButton: {
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#C28E5C",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#C28E5C",
    lineHeight: 24,
    letterSpacing: 0.08,
  },
  confirmedBadge: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
  },
  confirmedText: {
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: "#2E7D32",
  },
  canvasWrapper: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  bakeWarningBadge: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#FFF8E1",
    borderWidth: 1,
    borderColor: "#FFE082",
    alignItems: "center",
  },
  bakeWarningText: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#8D6E00",
    textAlign: "center",
  },
});

export default StepThree;
