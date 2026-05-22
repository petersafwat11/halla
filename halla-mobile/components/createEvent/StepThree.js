import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFormContext, FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import EventTemplates from "../home/EventTemplates";
import PreviewInvitation from "./PreviewInvitation";
import { useTranslation } from "../../localization";
import {
  buildDynamicTemplateSchema,
  buildDefaultValues,
} from "../../utils/schemas/createEventSchema";
import { dateToTimeString } from "../../utils/timeFormat";
import TemplatePreviewCanvas from "../shared/TemplatePreviewCanvas";
import { bakeCanvas } from "../../utils/canvasBake";
import { renderTemplateField } from "./_components/TemplateFieldRenderer";

/**
 * Step 3 (mobile) — visual template selection.
 *
 * Mirrors the web flow in `labbe/app/[lang]/host/create-event/_components/stepThree`:
 *   - Step body shows the template thumbnail grid only (no inline canvas overlay).
 *   - Selecting a card opens an in-page modal (TemplateForm equivalent) where the
 *     host fills the dynamic fields with a live preview canvas alongside.
 *   - "Save" inside the modal bakes the canvas into a real File and stores it on
 *     `templateImage`. "Preview" opens `PreviewInvitation` with the customised image.
 *   - Until the modal saves, `templateImage` stays null so the bake is never skipped.
 */
const StepThree = () => {
  const {
    setValue: parentSetValue,
    watch: parentWatch,
  } = useFormContext();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showFormModal, setShowFormModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { t, currentLanguage } = useTranslation("createEvent");
  const locale = currentLanguage;

  const selectedTemplate = parentWatch("visualTemplate");
  const eventDate = parentWatch("eventDate");
  const eventTime = parentWatch("eventTime");
  const templateImage = parentWatch("templateImage");
  const templateConfirmed = !!templateImage;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleTemplateSelect = useCallback(
    (template) => {
      parentSetValue("visualTemplate", template, { shouldValidate: true });
      // Wipe the stale bake. The next bake happens when the host saves the
      // modal — preventing a stock thumbnail from leaking through if they
      // never confirm a customisation.
      parentSetValue("templateImage", null, { shouldValidate: true });
      if (template?.fields?.length > 0) {
        setShowFormModal(true);
      }
    },
    [parentSetValue],
  );

  const handleEditTemplate = useCallback(() => {
    if (selectedTemplate?.fields?.length > 0) setShowFormModal(true);
  }, [selectedTemplate]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.templateSection}>
        <Text style={styles.sectionLabel}>{t("select_template")}</Text>
        <EventTemplates
          onSelectTemplate={handleTemplateSelect}
          selectedTemplateId={selectedTemplate?._id || selectedTemplate?.id}
        />
      </View>

      {selectedTemplate && (
        <View style={styles.selectedRow}>
          <Text style={styles.selectedLabel}>
            {t("selected_template")}:{" "}
            <Text style={styles.selectedName}>
              {locale === "ar"
                ? selectedTemplate.nameAr || selectedTemplate.name
                : selectedTemplate.nameEn || selectedTemplate.name}
            </Text>
          </Text>

          <View style={styles.actionsRow}>
            {selectedTemplate?.fields?.length > 0 && (
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={handleEditTemplate}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={18} color="#C28E5C" />
                <Text style={styles.secondaryButtonText}>
                  {t("edit_design_template")}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1 }]}
              onPress={() => setShowPreview(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="eye-outline" size={18} color="#FFF" />
              <Text style={styles.primaryButtonText}>
                {t("preview_template")}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      )}

      <TemplateFormModal
        visible={showFormModal}
        template={selectedTemplate}
        eventDate={eventDate}
        eventTime={eventTime}
        locale={locale}
        t={t}
        onClose={() => setShowFormModal(false)}
        onSave={(baked, formValues) => {
          parentSetValue(
            "visualTemplate",
            {
              ...selectedTemplate,
              data: formValues,
              fieldValues: formValues,
            },
            { shouldValidate: true },
          );
          parentSetValue("templateImage", baked, { shouldValidate: true });
          setShowFormModal(false);
        }}
      />

      <PreviewInvitation
        visible={showPreview}
        onClose={() => setShowPreview(false)}
        template={selectedTemplate}
        templateImage={templateImage}
        eventTitle={parentWatch("eventName") || ""}
        previewBody={parentWatch("selectedTemplate")?.bodyText || ""}
        eventDate={eventDate}
        eventTime={eventTime}
        location={parentWatch("address")?.address || ""}
        templateData={selectedTemplate?.data || {}}
      />
    </Animated.View>
  );
};

/**
 * Subscribes to the template form via `useWatch` so the canvas re-renders on
 * keystrokes WITHOUT re-rendering the surrounding ScrollView and form fields.
 * The previous `methods.watch()` in the parent caused a re-render storm that
 * could interact badly with the keyboard manager and lose focus.
 */
const LiveCanvas = ({ template, control, hasFields }) => {
  const data = useWatch({ control });
  const primaryColor = useWatch({ control, name: "primaryColor" });
  return (
    <TemplatePreviewCanvas
      template={template}
      data={hasFields ? data : template?.data}
      primaryColor={
        hasFields ? primaryColor : template?.data?.primaryColor
      }
    />
  );
};

/**
 * Modal that owns the dynamic template form + live preview canvas. Lifted into
 * a separate component so it gets its own `FormProvider` scope — keeps the
 * inner RHF context fully isolated from the parent wizard form and avoids the
 * nested-ScrollView focus issue that disabled the inputs previously.
 */
const TemplateFormModal = ({
  visible,
  template,
  eventDate,
  eventTime,
  locale,
  t,
  onClose,
  onSave,
}) => {
  const canvasRef = useRef(null);
  const [baking, setBaking] = useState(false);
  const [bakeError, setBakeError] = useState(null);

  const fields = template?.fields || [];
  const hasFields = fields.length > 0;

  const methods = useForm({
    resolver: hasFields
      ? zodResolver(buildDynamicTemplateSchema(fields, t))
      : undefined,
    defaultValues: hasFields
      ? buildDefaultValues(template, eventDate, eventTime)
      : {},
  });

  useEffect(() => {
    if (visible && template?._id) {
      methods.reset(buildDefaultValues(template, eventDate, eventTime));
      setBakeError(null);
    }
    // Re-seed each time the modal opens for a new template; otherwise stale
    // values from a prior template can bleed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, template?._id]);

  const onSubmit = methods.handleSubmit(async (data) => {
    const converted = { ...data };
    for (const field of fields) {
      if (field.type === "time" && converted[field.key] instanceof Date) {
        converted[field.key] = dateToTimeString(converted[field.key]);
      }
    }

    setBakeError(null);
    setBaking(true);
    try {
      const baked = await bakeCanvas(canvasRef, {
        width: template?.naturalWidth,
        height: template?.naturalHeight,
      });
      if (!baked?.file?.uri) {
        throw new Error("bakeCanvas returned no file");
      }
      onSave(baked.file, converted);
    } catch (err) {
      console.error("[StepThree] bakeCanvas failed:", err);
      setBakeError(err?.message || "BAKE_FAILED");
    } finally {
      setBaking(false);
    }
  });

  if (!template) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t("edit_design_template")}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.modalCloseBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#2C2C2C" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <FormProvider {...methods}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Live preview — also the bake source. The canvas subscribes
                  via `useWatch` (inside LiveCanvas) so it re-renders without
                  forcing the surrounding ScrollView + every TextInput to
                  re-render on each keystroke. */}
              <View
                style={styles.canvasWrapper}
                collapsable={false}
                ref={canvasRef}
              >
                <LiveCanvas
                  template={template}
                  control={methods.control}
                  hasFields={hasFields}
                />
              </View>

              {hasFields && (
                <View style={styles.formContainer}>
                  {fields.map((field) =>
                    renderTemplateField(field, locale, t),
                  )}
                </View>
              )}

              {bakeError && (
                <View style={styles.bakeWarningBadge}>
                  <Text style={styles.bakeWarningText}>
                    {t("template_bake_failed")}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.footerBtn, styles.footerBtnSecondary]}
                onPress={onClose}
                activeOpacity={0.85}
                disabled={baking}
              >
                <Text style={styles.footerBtnSecondaryText}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.footerBtn,
                  styles.footerBtnPrimary,
                  baking && { opacity: 0.6 },
                ]}
                onPress={onSubmit}
                activeOpacity={0.85}
                disabled={baking}
              >
                <Text style={styles.footerBtnPrimaryText}>
                  {baking ? t("saving") : t("save")}
                </Text>
              </TouchableOpacity>
            </View>
          </FormProvider>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  templateSection: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    marginBottom: 12,
    textAlign: "right",
  },
  selectedRow: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5ECE4",
    padding: 14,
    gap: 12,
  },
  selectedLabel: {
    fontSize: 13,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
    textAlign: "right",
  },
  selectedName: {
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C28E5C",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  primaryButtonText: {
    color: "#FFF",
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#C28E5C",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#FFF",
    gap: 6,
  },
  secondaryButtonText: {
    color: "#C28E5C",
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
  },
  confirmedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#E8F5E9",
    gap: 6,
  },
  confirmedText: {
    fontSize: 12,
    fontFamily: "Cairo_700Bold",
    color: "#2E7D32",
  },
  // ── modal ──
  modalContainer: { flex: 1, backgroundColor: "#F9F4EF" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E6DB",
    backgroundColor: "#FFF",
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    flex: 1,
    textAlign: "right",
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  canvasWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFF",
  },
  formContainer: {
    gap: 4,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5ECE4",
    padding: 16,
  },
  bakeWarningBadge: {
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
    fontFamily: "Cairo_500Medium",
    color: "#8D6E00",
    textAlign: "center",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F0E6DB",
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  footerBtnSecondary: {
    backgroundColor: "#F5F1EA",
  },
  footerBtnSecondaryText: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
  },
  footerBtnPrimary: {
    backgroundColor: "#C28E5C",
  },
  footerBtnPrimaryText: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#FFF",
  },
});

export default StepThree;
