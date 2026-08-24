import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
  Image as RNImage,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFormContext, FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import EventTemplates from "../home/EventTemplates";
import PreviewInvitation from "./PreviewInvitation";
import { useTranslation } from "../../localization";
import { useFieldDirection } from "../../hooks/useInputDirection";
import AdaptiveText from "../commen/AdaptiveText";
import {
  buildDynamicTemplateSchema,
  buildDefaultValues,
} from "../../utils/schemas/createEventSchema";
import { dateToTimeString } from "../../utils/timeFormat";
import TemplatePreviewCanvas from "../shared/TemplatePreviewCanvas";
import { bakeCanvas } from "../../utils/canvasBake";
import { renderTemplateField } from "./_components/TemplateFieldRenderer";
import { resolveMediaUri } from "../../utils/resolveMediaUri";

// Server limit lives in s3Upload.js (uploadInvitationImage, 10MB).
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXT = /\.(jpe?g|png|webp)$/i;

/**
 * Resolve a possibly-relative template image path to a full URL.
 * Freshly-baked images come as File-like objects with `uri`; saved
 * images from the backend may be bare paths like "uploads/…".
 */
/**
 * Step 3 (mobile) — visual template selection.
 *
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

  // Mode resolution — upload mode is sticky once the host enters it or
  // a saved event was created in upload mode (mapEventToFormValues sets
  // the flag).
  const isUploadMode = !!selectedTemplate?.isCustomUpload;
  const [mode, setMode] = useState(isUploadMode ? "upload" : "template");

  // Keep mode in sync with form state on remote reset (update wizard
  // re-seeds defaults after the event API resolves).
  useEffect(() => {
    setMode(isUploadMode ? "upload" : "template");
  }, [isUploadMode]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleTemplateSelect = useCallback(
    (template) => {
      parentSetValue(
        "visualTemplate",
        { ...template, isCustomUpload: false },
        { shouldValidate: true },
      );
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

  // ── Mode switching ──────────────────────────────────────────────────
  const switchToTemplateMode = useCallback(() => {
    if (mode === "template") return;
    setMode("template");
    parentSetValue("visualTemplate", null, { shouldValidate: true });
    parentSetValue("templateImage", null, { shouldValidate: true });
  }, [mode, parentSetValue]);

  const switchToUploadMode = useCallback(() => {
    if (mode === "upload") return;
    setMode("upload");
    parentSetValue(
      "visualTemplate",
      { isCustomUpload: true, fieldValues: {} },
      { shouldValidate: true },
    );
    parentSetValue("templateImage", null, { shouldValidate: true });
  }, [mode, parentSetValue]);

  // ── Picker ──────────────────────────────────────────────────────────
  const pickInvitationImage = useCallback(async () => {
    try {
      // No explicit permission request: the expo-image-picker (v17) system
      // photo picker needs no media-library permission, and gating on
      // requestMediaLibraryPermissionsAsync() silently bailed here when the
      // OS returned anything but "granted" — so the picker never opened.
      // Matches the working ImageInput / MultiImageInput / BusinessSettings.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      const name = asset.fileName || asset.uri?.split("/").pop() || "card.jpg";
      if (!ACCEPTED_EXT.test(name) && !(asset.mimeType || "").startsWith("image/")) {
        Alert.alert(
          t("upload_card_invalid_type_title", "Unsupported file"),
          t(
            "upload_card_invalid_type",
            "Use JPG, PNG or WEBP only.",
          ),
        );
        return;
      }
      if (typeof asset.fileSize === "number" && asset.fileSize > MAX_UPLOAD_BYTES) {
        Alert.alert(
          t("upload_card_too_big_title", "Image too large"),
          t("upload_card_too_big", "Maximum size is 10 MB."),
        );
        return;
      }

      const file = {
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        fileName: name,
        width: asset.width,
        height: asset.height,
      };

      parentSetValue(
        "visualTemplate",
        { isCustomUpload: true, fieldValues: {} },
        { shouldValidate: true },
      );
      parentSetValue("templateImage", file, { shouldValidate: true });
    } catch (err) {
      console.error("[StepThree] custom upload failed", err);
      Alert.alert(
        t("errors.upload_failed_title", "Upload failed"),
        err?.message || t("errors.upload_failed", "Could not open the picker."),
      );
    }
  }, [parentSetValue, t]);

  // Preview URI for the upload-mode tile. File pick → uri; saved
  // backend URL → resolve relative paths via the API base URL.
  const uploadPreviewUri = useMemo(() => {
    return resolveMediaUri(templateImage);
  }, [templateImage]);

  // ── Remove selection ──────────────────────────────────────────────
  const handleRemoveSelection = useCallback(() => {
    parentSetValue("visualTemplate", null, { shouldValidate: true });
    parentSetValue("templateImage", null, { shouldValidate: true });
    setMode("template");
  }, [parentSetValue]);

  // The selection is "confirmed" when the user has completed the
  // customisation modal (template mode) or uploaded an image (upload mode).
  // In template mode, `templateImage` becomes truthy only after bake.
  //
  // For update-mode (previously saved events), the saved `visualTemplate`
  // may reference a template that has since been deleted. We still show
  // the confirmed card as long as `templateRef` + `templateImage` exist.
  const hasTemplateRef = !!(
    selectedTemplate?.templateRef || selectedTemplate?._id
  );
  const hasConfirmedSelection =
    (mode === "template" &&
      (selectedTemplate || hasTemplateRef) &&
      !isUploadMode &&
      !!templateImage) ||
    (mode === "upload" && !!uploadPreviewUri);

  // Resolved preview URI for the confirmed card.
  const confirmedPreviewUri = useMemo(() => {
    if (mode === "upload") return uploadPreviewUri;
    return resolveMediaUri(templateImage);
  }, [mode, templateImage, uploadPreviewUri]);

  // The "selected template" summary row should NOT appear in upload
  // mode (there's no predefined template name to show).
  const showPredefinedSelectionRow = mode === "template" && selectedTemplate;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {hasConfirmedSelection ? (
        /* ── Confirmed selection card ────────────────────────────── */
        <View style={styles.confirmedCard}>
          <Text style={styles.confirmedCardLabel}>
            {mode === "upload"
              ? t("uploaded_design_label", "Uploaded Design")
              : t("confirmed_design_label", "Selected Design")}
          </Text>
          <View style={styles.confirmedCardImageWrapper}>
            {confirmedPreviewUri ? (
              <RNImage
                source={{ uri: confirmedPreviewUri }}
                style={styles.confirmedCardImg}
                resizeMode="contain"
              />
            ) : mode === "template" &&
              (selectedTemplate?.imageUrl ||
                selectedTemplate?.thumbnailUrl ||
                selectedTemplate?.src ||
                selectedTemplate?._id) ? (
              <TemplatePreviewCanvas
                template={selectedTemplate}
                data={
                  selectedTemplate?.fieldValues ||
                  selectedTemplate?.data ||
                  {}
                }
                primaryColor={
                  selectedTemplate?.fieldValues?.primaryColor ||
                  selectedTemplate?.data?.primaryColor
                }
              />
            ) : null}
          </View>
          {mode === "template" && selectedTemplate && (
            /* Backend template names are arbitrary content — adaptive
               first-strong rendering, never the page locale. */
            <AdaptiveText style={styles.confirmedCardTemplateName} numberOfLines={1}>
              {locale === "ar"
                ? selectedTemplate.nameAr || selectedTemplate.name || selectedTemplate.templateName
                : selectedTemplate.nameEn || selectedTemplate.name || selectedTemplate.templateName}
            </AdaptiveText>
          )}
          {mode === "template" && !selectedTemplate && hasTemplateRef && (
            <Text style={styles.confirmedCardTemplateName}>
              {t("saved_design", "Saved Design")}
            </Text>
          )}
          <View style={styles.confirmedCardActions}>
            <TouchableOpacity
              style={[styles.dangerButton, { flex: 1 }]}
              onPress={handleRemoveSelection}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={18} color="#A13D3D" />
              <Text style={styles.dangerButtonText}>
                {t("remove_selection", "Remove")}
              </Text>
            </TouchableOpacity>
            {mode === "template" && selectedTemplate?.fields?.length > 0 && (
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={handleEditTemplate}
                activeOpacity={0.85}
              >
                <Ionicons name="create-outline" size={18} color="#C28E5C" />
                <Text style={styles.secondaryButtonText}>
                  {t("edit_design_template")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        /* ── Selection UI (toggle + grid / dropzone) ────────────── */
        <>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[
                styles.modeBtn,
                mode === "template" && styles.modeBtnActive,
              ]}
              onPress={switchToTemplateMode}
              activeOpacity={0.85}
            >
              <Ionicons
                name="grid-outline"
                size={16}
                color={mode === "template" ? "#2C2C2C" : "#6B4E33"}
              />
              <Text
                style={[
                  styles.modeBtnText,
                  mode === "template" && styles.modeBtnTextActive,
                ]}
              >
                {t("choose_from_templates", "Choose from templates")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "upload" && styles.modeBtnActive]}
              onPress={switchToUploadMode}
              activeOpacity={0.85}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={16}
                color={mode === "upload" ? "#2C2C2C" : "#6B4E33"}
              />
              <Text
                style={[
                  styles.modeBtnText,
                  mode === "upload" && styles.modeBtnTextActive,
                ]}
              >
                {t("upload_own_card", "Upload your own card")}
              </Text>
            </TouchableOpacity>
          </View>

          {mode === "template" && (
            <>
              <View style={styles.templateSection}>
                <EventTemplates
                  onSelectTemplate={handleTemplateSelect}
                  selectedTemplateId={
                    selectedTemplate?._id || selectedTemplate?.id
                  }
                />
              </View>

              {showPredefinedSelectionRow && (
                <View style={styles.selectedRow}>
                  {/* Label run stays localized; the backend template name is
                      an isolated adaptive run so a Latin name cannot reorder
                      the localized "Selected:" prefix around it. */}
                  <Text style={styles.selectedLabel}>
                    {t("selected_template")}:{" "}
                    <AdaptiveText style={styles.selectedName}>
                      {locale === "ar"
                        ? selectedTemplate.nameAr || selectedTemplate.name
                        : selectedTemplate.nameEn || selectedTemplate.name}
                    </AdaptiveText>
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
            </>
          )}

          {mode === "upload" && (
            <View style={styles.uploadSection}>
              {uploadPreviewUri ? (
                <View style={styles.uploadPreviewWrapper}>
                  <RNImage
                    source={{ uri: uploadPreviewUri }}
                    style={styles.uploadPreviewImg}
                    resizeMode="contain"
                  />
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.primaryButton, { flex: 1 }]}
                      onPress={pickInvitationImage}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
                      <Text style={styles.primaryButtonText}>
                        {t("replace_image", "Replace image")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.uploadHintSmall}>
                    {t(
                      "upload_card_saved_hint",
                      "This image will be sent to guests exactly as shown.",
                    )}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadDropzone}
                  onPress={pickInvitationImage}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={36}
                    color="#C28E5C"
                  />
                  <Text style={styles.uploadDropzoneTitle}>
                    {t("upload_card_cta", "Tap to upload your card")}
                  </Text>
                  <Text style={styles.uploadDropzoneHint}>
                    {t(
                      "upload_card_hint",
                      "JPG, PNG or WEBP — up to 10 MB",
                    )}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
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
              templateRef:
                selectedTemplate?.templateRef ||
                selectedTemplate?._id ||
                selectedTemplate?.id,
              data: formValues,
              fieldValues: formValues,
              isCustomUpload: false,
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
        selectedTemplate={parentWatch("selectedTemplate")}
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
const LiveCanvas = ({
  template,
  control,
  hasFields,
  onBackgroundReady,
  onBackgroundError,
}) => {
  const data = useWatch({ control });
  const primaryColor = useWatch({ control, name: "primaryColor" });
  return (
    <TemplatePreviewCanvas
      template={template}
      data={hasFields ? data : template?.data}
      primaryColor={
        hasFields ? primaryColor : template?.data?.primaryColor
      }
      onBackgroundReady={onBackgroundReady}
      onBackgroundError={onBackgroundError}
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
  const fieldDirection = useFieldDirection("localized");
  const canvasRef = useRef(null);
  const [baking, setBaking] = useState(false);
  const [bakeError, setBakeError] = useState(null);
  const [backgroundReady, setBackgroundReady] = useState(false);
  const handleBackgroundReady = useCallback((ready) => {
    setBackgroundReady(ready);
    if (ready) setBakeError(null);
  }, []);
  const handleBackgroundError = useCallback((error) => {
    setBackgroundReady(false);
    setBakeError(error?.message || "TEMPLATE_BACKGROUND_LOAD_FAILED");
  }, []);

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
      setBackgroundReady(false);
    }
    // Re-seed each time the modal opens for a new template; otherwise stale
    // values from a prior template can bleed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, template?._id]);

  const onSubmit = methods.handleSubmit(async (data) => {
    if (!backgroundReady) {
      setBakeError("TEMPLATE_BACKGROUND_NOT_READY");
      return;
    }
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
      <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, fieldDirection.text]}>
            {t("edit_design_template")}
          </Text>
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
                  onBackgroundReady={handleBackgroundReady}
                  onBackgroundError={handleBackgroundError}
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
                    {String(bakeError).startsWith("TEMPLATE_BACKGROUND")
                      ? t("template_background_failed")
                      : t("template_bake_failed")}
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
                  (baking || !backgroundReady) && { opacity: 0.6 },
                ]}
                onPress={onSubmit}
                activeOpacity={0.85}
                disabled={baking || !backgroundReady}
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
  modeToggle: {
    flexDirection: "row",
    alignSelf: "flex-start",
    padding: 4,
    gap: 4,
    backgroundColor: "#F7F3EE",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EAD9C8",
    marginBottom: 12,
  },
  modeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  modeBtnActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  modeBtnText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
  },
  modeBtnTextActive: {
    color: "#2C2C2C",
    fontFamily: "Cairo_700Bold",
  },
  uploadSection: {
    gap: 12,
  },
  uploadDropzone: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#C28E5C",
    backgroundColor: "#FFFAF3",
  },
  uploadDropzoneTitle: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    textAlign: "center",
  },
  uploadDropzoneHint: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    color: "#767676",
    textAlign: "center",
  },
  uploadPreviewWrapper: {
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFFAF3",
    borderWidth: 1,
    borderColor: "#EAD9C8",
  },
  uploadPreviewImg: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 10,
    backgroundColor: "#FFF",
  },
  uploadHintSmall: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    color: "#767676",
    textAlign: "center",
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E5B9B9",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#FFF",
    gap: 6,
  },
  dangerButtonText: {
    color: "#A13D3D",
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
  },
  templateSection: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    marginBottom: 12,
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
  // ── confirmed selection card ──
  confirmedCard: {
    backgroundColor: "#FFFAF3",
    borderWidth: 1,
    borderColor: "#EAD9C8",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    alignItems: "center",
  },
  confirmedCardLabel: {
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    textAlign: "center",
  },
  confirmedCardImageWrapper: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  confirmedCardImg: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 10,
    backgroundColor: "#FFF",
  },
  confirmedCardTemplateName: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
    textAlign: "center",
  },
  confirmedCardActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
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
