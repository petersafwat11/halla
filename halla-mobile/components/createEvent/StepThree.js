import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { useFormContext, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import EventTemplates from "../home/EventTemplates";
import TextInput from "../commen/TextInput";
import TextAreaInput from "../commen/TextAreaInput";
import DatePicker from "../commen/DatePicker";
import TimePicker from "../commen/TimePicker";
import ColorPicker from "../commen/colorPicker";
import DropdownInput from "../commen/DropdownInput";
import PreviewInvitation from "./PreviewInvitation";
import { useTranslation } from "../../localization";
import { buildDynamicTemplateSchema, buildDefaultValues } from "../../utils/schemas/createEventSchema";
import { dateToTimeString } from "../../utils/timeFormat";
// Phase 4c hardening (post-review) — bake the visual canvas on confirm
// so the WhatsApp header carries the user-overlaid image (web bakes via
// html2canvas; mobile bakes via react-native-view-shot).
import TemplatePreviewCanvas from "../shared/TemplatePreviewCanvas";
import { bakeCanvas } from "../../utils/canvasBake";

const INPUT_MODE_TO_KEYBOARD = {
  text: "default",
  numeric: "numeric",
  decimal: "decimal-pad",
  tel: "phone-pad",
  email: "email-address",
  url: Platform.OS === "ios" ? "url" : "default",
};

function renderField(field, locale, t) {
  const label = locale === "ar" ? field.labelAr : field.labelEn;
  const placeholder = locale === "ar" ? field.placeholderAr : field.placeholderEn;
  const name = field.key;
  const writingDirection = field.dir === "ltr" ? "ltr" : field.dir === "rtl" ? "rtl" : "auto";

  switch (field.type) {
    case "text":
      return (
        <TextInput
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          keyboardType={INPUT_MODE_TO_KEYBOARD[field.inputMode] ?? "default"}
          autoCapitalize={field.autoCapitalize ?? "sentences"}
          style={{ writingDirection }}
        />
      );
    case "textarea":
      return (
        <TextAreaInput
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          numberOfLines={field.rows ?? 3}
          maxLength={field.maxLength}
          autoCapitalize={field.autoCapitalize ?? "sentences"}
          style={{ writingDirection }}
        />
      );
    case "date":
      return (
        <DatePicker
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
        />
      );
    case "time":
      return (
        <TimePicker
          key={name}
          name={name}
          label={label}
        />
      );
    case "color":
      return (
        <ColorPicker
          key={name}
          name={name}
          label={label}
          showPresets={true}
        />
      );
    case "font": {
      const fontOptions = [
        { label: "Cairo", value: "cairo" },
        { label: "Inter", value: "inter" },
        { label: "Lato", value: "lato" },
        { label: "Amiri", value: "amiri" },
        { label: "IBM Plex Sans Arabic", value: "ibm_plex_arabic" },
        { label: "Noto Sans Arabic", value: "noto_sans_arabic" },
      ];
      return (
        <DropdownInput
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          options={fontOptions}
        />
      );
    }
    case "number":
      return (
        <TextInput
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          keyboardType={INPUT_MODE_TO_KEYBOARD[field.inputMode] ?? "numeric"}
          style={{ writingDirection }}
        />
      );
    case "email":
      return (
        <TextInput
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          style={{ writingDirection: "ltr" }}
        />
      );
    case "password":
      return (
        <TextInput
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          secureTextEntry={true}
          autoCapitalize="none"
          style={{ writingDirection: "ltr" }}
        />
      );
    default:
      return null;
  }
}

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
    parentSetValue("templateImage", template.thumbnailUrl || template.imageUrl, { shouldValidate: true });
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

    // Phase 4c hardening — bake the canvas with the user-overlaid data
    // so the WhatsApp header carries the customised image. On any
    // capture failure, fall back to the stock template thumbnail so
    // submit is never blocked by an environment without view-shot.
    setBakeError(null);
    try {
      const baked = await bakeCanvas(canvasRef, {
        width: selectedTemplate?.naturalWidth,
        height: selectedTemplate?.naturalHeight,
      });
      if (baked?.file?.uri) {
        parentSetValue("templateImage", baked.file, { shouldValidate: true });
      }
    } catch (err) {
      console.warn("[StepThree] bakeCanvas failed — falling back to stock template:", err?.message);
      setBakeError(err?.message || "BAKE_FAILED");
      const fallback = selectedTemplate?.imageUrl || selectedTemplate?.thumbnailUrl;
      if (fallback) parentSetValue("templateImage", fallback, { shouldValidate: true });
    }
    setTemplateConfirmed(true);
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
              {selectedTemplate.fields.map(field => renderField(field, locale, t))}

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
                    {t("templates.stepThree.bakeFallback") ||
                      "تعذّر إنشاء معاينة مخصّصة — سيُستخدم القالب الأصلي."}
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
