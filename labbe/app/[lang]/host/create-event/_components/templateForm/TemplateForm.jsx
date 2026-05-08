"use client";
import React, { useRef, useState } from "react";
import CardLayout from "@/ui/commen/card/CardLayout";
import styles from "./templateForm.module.css";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import DatePicker from "@/ui/commen/inputs/datePicker";
import ColorPickerGroup from "@/ui/commen/inputs/inputGroup/ColorPickerGroup";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import TextArea from "@/ui/commen/inputs/inputGroup/TextArea";
import TimePicker from "@/ui/commen/inputs/TimePicker";
import Button from "@/ui/commen/button/Button";
import { useTranslation } from "react-i18next";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  templateFormSchema,
  buildDynamicTemplateSchema,
  buildDefaultValues,
} from "@/utils/schemas/createEventSchema";
import {
  formatDateWithSpans,
  formatTimeWithSpans,
  htmlToImageConvert,
} from "@/utils/index";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useFonts } from "@/hooks/queries/useTemplates";
import TemplatePreviewCanvas from "@/components/shared/TemplatePreviewCanvas";
import { renderField } from "./renderField";

const fontOptions = [
  { value: "inter", label: "Inter" },
  { value: "cairo", label: "Cairo" },
  { value: "lato", label: "Lato" },
];

function TemplateForm({ isOpen, onClose, locale, setEventValues, template }) {
  // When the template carries `fields[]` (a backend-served Template
  // doc), use the dynamic renderField path. Otherwise fall back to the
  // legacy hardcoded form for the SVG demo templates.
  if (template?.fields && template.fields.length > 0) {
    return (
      <DynamicTemplateForm
        isOpen={isOpen}
        onClose={onClose}
        locale={locale}
        setEventValues={setEventValues}
        template={template}
      />
    );
  }
  return (
    <LegacyTemplateForm
      isOpen={isOpen}
      onClose={onClose}
      locale={locale}
      setEventValues={setEventValues}
      template={template}
    />
  );
}

// ── Dynamic field path ────────────────────────────────────────────────────
function DynamicTemplateForm({ isOpen, onClose, locale, setEventValues, template }) {
  const { t } = useTranslation("createEvent");
  const isLg = useMediaQuery("(min-width: 1024px)");
  const previewRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const parentFormContext = useFormContext();
  const parentEventDate = parentFormContext?.watch("eventDate");
  const parentEventTime = parentFormContext?.watch("eventTime");

  const { data: fontsData } = useFonts();
  const fonts = fontsData?.data?.fonts || fontsData?.fonts || [];
  const dynamicFontOptions = fonts.length
    ? fonts.map((f) => ({ value: f.id, label: f.id }))
    : fontOptions;

  const methods = useForm({
    resolver: zodResolver(buildDynamicTemplateSchema(template.fields, t)),
    defaultValues: buildDefaultValues(template, parentEventDate, parentEventTime),
  });

  const { handleSubmit, watch } = methods;
  const formData = watch();

  // Find a primary color value if the template has a color-typed field
  const primaryColorField = template.fields.find((f) => f.type === "color");
  const fontField = template.fields.find((f) => f.type === "font");
  const primaryColor = primaryColorField ? formData[primaryColorField.key] : "#5a4a42";
  const fontFamilyId = fontField ? formData[fontField.key] : null;
  const fontFamilyOverride =
    fonts.find((f) => f.id === fontFamilyId)?.webFamily || fontFamilyId;

  const onSubmit = async (data) => {
    // Save field values into the parent form first
    setEventValues("selectedTemplate", {
      ...template,
      fieldValues: data,
      data, // legacy mirror
    });

    // Bake the canvas into a PNG file
    setIsGenerating(true);
    try {
      if (!previewRef.current) throw new Error("Preview ref not ready");

      // Pre-flight: confirm the template background image loads under
      // CORS. If the S3 bucket lacks an Access-Control-Allow-Origin
      // header, the browser blocks the cross-origin fetch and
      // html2canvas would silently produce a bake without the
      // background. Surfacing this here avoids shipping a broken
      // (text-only-on-white) image to the backend.
      if (template?.imageUrl) {
        await new Promise((resolve, reject) => {
          const probe = new Image();
          probe.crossOrigin = "anonymous";
          probe.onload = () => resolve();
          probe.onerror = () =>
            reject(
              new Error(
                "Template background image could not be loaded under CORS. " +
                  "The S3 bucket must allow GET requests from this origin (Access-Control-Allow-Origin)."
              )
            );
          probe.src = template.imageUrl;
        });
      }

      const baked = await htmlToImageConvert(previewRef, "template-image", {
        autoDownload: false,
        returnBlob: true,
      });
      if (!baked?.file) throw new Error("Failed to bake template image");
      setEventValues("templateImage", baked.file);
      setEventValues("invitationSettings.templateImage", baked.file);
      onClose();
    } catch (err) {
      console.error("Image bake failed:", err);
      alert(err.message || "Failed to generate template image");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <PopupLayout isOpen={isOpen} onClose={onClose} size="full">
        <div className={styles.header}>
          <h2>{t("edit_design_template")}</h2>
          <button style={{ cursor: "pointer" }} onClick={onClose}>
            <img src="/svg/events/close-circle.svg" alt="close" />
          </button>
        </div>
        <CardLayout className={styles.container}>
          <FormProvider {...methods}>
            <form className={styles.rightForm} onSubmit={handleSubmit(onSubmit)}>
              <div className={styles.formGrid}>
                {template.fields.map((f) => (
                  <div key={f.key} className={f.type === "textarea" ? styles.fullWidth : ""}>
                    {renderField(f, locale, dynamicFontOptions)}
                  </div>
                ))}
              </div>
              <div className={styles.buttonContainer}>
                <Button
                  variant="secondary"
                  onClick={onClose}
                  title={t("cancel")}
                  type="button"
                  disabled={isGenerating}
                />
                <Button
                  variant="primary"
                  title={isGenerating ? t("saving", "جاري الحفظ...") : t("save")}
                  type="submit"
                  disabled={isGenerating}
                />
              </div>
            </form>
            <div className={styles.leftPreview}>
              <TemplatePreviewCanvas
                ref={previewRef}
                template={template}
                data={formData}
                primaryColor={primaryColor}
                fontFamilyOverride={fontFamilyOverride}
              />
            </div>
          </FormProvider>
        </CardLayout>
      </PopupLayout>
    </div>
  );
}

// ── Legacy hardcoded form (kept for old SVG demo templates) ───────────────
function LegacyTemplateForm({ isOpen, onClose, locale, setEventValues, template }) {
  const ImageOfTemplate = useRef(null);
  const { t } = useTranslation("createEvent");
  const isLg = useMediaQuery("(min-width: 1024px)");
  const [showPreviewPopup, setShowPreviewPopup] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Get parent form context to access eventDate and eventTime from StepOne
  const parentFormContext = useFormContext();
  const parentEventDate = parentFormContext?.watch("eventDate");
  const parentEventTime = parentFormContext?.watch("eventTime");

  // Helper to convert string date from DB to Date object
  const parseDate = (dateValue) => {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Initialize React Hook Form with template data if available
  const methods = useForm({
    resolver: zodResolver(templateFormSchema(t)),
    defaultValues: {
      messageText: template?.data?.messageText || "",
      brideName: template?.data?.brideName || "",
      groomName: template?.data?.groomName || "",
      guestMessage: template?.data?.guestMessage || "",
      entryDate:
        parseDate(template?.data?.entryDate) ||
        parseDate(parentEventDate) ||
        null,
      entryTime: template?.data?.entryTime || parentEventTime || "12:00:AM",
      address: template?.data?.address || "",
      endMessage: template?.data?.endMessage || "",
      fontType: template?.data?.fontType || "cairo",
      primaryColor: template?.data?.primaryColor || "#5a4a42",
    },
  });
  const {
    watch,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = methods;

  // Reset form with template data when template changes, or use parent form values
  React.useEffect(() => {
    const formValues = {
      messageText: template?.data?.messageText || "",
      brideName: template?.data?.brideName || "",
      groomName: template?.data?.groomName || "",
      guestMessage: template?.data?.guestMessage || "",
      entryDate:
        parseDate(template?.data?.entryDate) ||
        parseDate(parentEventDate) ||
        null,
      entryTime: template?.data?.entryTime || parentEventTime || "12:00:AM",
      address: template?.data?.address || "",
      endMessage: template?.data?.endMessage || "",
      fontType: template?.data?.fontType || "cairo",
      primaryColor:
        template?.data?.primaryColor || template?.colors?.primary || "#5a4a42",
    };
    reset(formValues);
  }, [template, parentEventDate, parentEventTime, reset]);

  const formData = watch();

  // Handle image conversion
  const handleImageConvert = async () => {
    setIsGeneratingImage(true);
    try {
      // Check if ref is available
      if (!ImageOfTemplate || !ImageOfTemplate.current) {
        console.error("Template ref is not available");
        throw new Error("Template element not found. Please try again.");
      }

      // Convert HTML to image and get blob
      const imageData = await htmlToImageConvert(
        ImageOfTemplate,
        "template-image",
        {
          autoDownload: false,
          returnBlob: true,
        }
      );

      // Validate that we got the image data
      if (!imageData || !imageData.file) {
        throw new Error("Failed to generate image file");
      }

      // Try both paths - update-event uses 'templateImage', create-event uses 'invitationSettings.templateImage'
      setEventValues("templateImage", imageData.file);
      setEventValues("invitationSettings.templateImage", imageData.file);

      onClose();
    } catch (error) {
      console.error("Error converting template to image:", error);
      // Show user-friendly error message with more details
      const errorMessage =
        error.message || "Failed to generate template image. Please try again.";
      alert(errorMessage);
      throw error; // Re-throw so onSubmit can handle it
    } finally {
      setIsGeneratingImage(false);
    }
  };
  // Handle form submission
  const onSubmit = async (data) => {
    // Get the latest form values to ensure we have all the data
    const currentFormData = getValues();

    // Use the data parameter from handleSubmit as it's validated
    const dataToSave = data || currentFormData;

    // Update the selectedTemplate with new data
    // Get current template to preserve id, name, image
    const currentTemplate = template || {};
    const updatedTemplate = {
      ...currentTemplate,
      data: dataToSave,
    };

    // Save template data to the event values - this updates the parent form
    // Try both paths for compatibility with create-event and update-event
    setEventValues("selectedTemplate", updatedTemplate);
    setEventValues("invitationSettings.selectedTemplate", updatedTemplate);

    // Generate and save the image - AWAIT this to catch errors
    try {
      await handleImageConvert();
    } catch (error) {
      console.error("Image conversion failed:", error);
      throw error; // Re-throw to show error to user
    }
  };

  return (
    <div className={styles.wrapper}>
      <PopupLayout isOpen={isOpen} onClose={onClose} size="full">
        <div className={styles.header}>
          <h2>{t("edit_design_template")}</h2>
          <button style={{ cursor: "pointer" }} onClick={onClose}>
            <img src="/svg/events/close-circle.svg" alt="close" />
          </button>
        </div>
        <CardLayout className={styles.container}>
          <FormProvider {...methods}>
            <form
              className={styles.rightForm}
              onSubmit={handleSubmit(onSubmit)}
            >
              <div className={styles.formGrid}>
                <div className={styles.fullWidth}>
                  <TextArea
                    label={t("message_text")}
                    placeholder={t("message_text_placeholder")}
                    name="messageText"
                    maxLength={150}
                    rows={3}
                  />
                </div>
                <InputGroup
                  label={t("bride_name")}
                  placeholder={t("bride_name_placeholder")}
                  name="brideName"
                  maxLength={14}
                />
                <InputGroup
                  label={t("groom_name")}
                  placeholder={t("groom_name_placeholder")}
                  name="groomName"
                  maxLength={14}
                />
                <div className={styles.fullWidth}>
                  <InputGroup
                    name="guestMessage"
                    label={t("guest_message")}
                    placeholder={t("guest_message_placeholder")}
                    maxLength={100}
                  />
                </div>

                <DatePicker
                  label={t("event_date")}
                  placeholder={t("event_date_placeholder")}
                  name="entryDate"
                />
                <TimePicker label={t("event_time")} name="entryTime" />

                <InputGroup
                  label={t("address")}
                  placeholder={t("address_placeholder")}
                  name="address"
                  maxLength={65}
                />
                <InputGroup
                  label={t("end_message")}
                  placeholder={t("end_message_placeholder")}
                  name="endMessage"
                  maxLength={100}
                />
                <InputSelect
                  label={t("font_type")}
                  placeholder={t("font_type_placeholder")}
                  name="fontType"
                  options={fontOptions}
                />
                <ColorPickerGroup
                  label={t("primary_color")}
                  name="primaryColor"
                />
              </div>
              {!isLg && (
                <>
                  <button
                    type="button"
                    className={styles.previewButton}
                    onClick={() => setShowPreviewPopup(true)}
                  >
                    <img src="/svg/events/eye.svg" alt="preview" />
                    {t("preview_template")}
                  </button>
                  <div className={styles.buttonContainer}>
                    <Button
                      variant="secondary"
                      onClick={onClose}
                      title={t("cancel")}
                      type="button"
                      disabled={isGeneratingImage}
                    />
                    <Button
                      variant="primary"
                      title={isGeneratingImage ? "جاري الحفظ..." : t("save")}
                      type="button"
                      onClick={handleSubmit(onSubmit)}
                      disabled={isGeneratingImage}
                    />
                  </div>
                </>
              )}
            </form>
            {isLg && (
              <div className={styles.leftPreview}>
                <div className={styles.templatePreview} ref={ImageOfTemplate}>
                  <img
                    src="/svg/events/invitation.svg"
                    alt="invitation preview"
                    className={styles.invitationBackground}
                  />
                  <div className={styles.templateContent}>
                    <div
                      className={styles.messageTemplateText}
                      style={{
                        color: formData.primaryColor || "#5a4a42",
                        fontFamily: formData.fontType || "cairo",
                      }}
                    >
                      {formData.messageText || t("message_text_placeholder")}
                    </div>

                    <div className={styles.brideAndGroomName}>
                      <p
                        className={styles.brideName}
                        style={{
                          color: formData.primaryColor || "#5a4a42",
                          fontFamily: formData.fontType || "cairo",
                        }}
                      >
                        {formData.brideName || t("bride_name_placeholder")}
                      </p>
                      <span className={styles.and}> & </span>
                      <p
                        className={styles.groomName}
                        style={{
                          color: formData.primaryColor || "#5a4a42",
                          fontFamily: formData.fontType || "cairo",
                        }}
                      >
                        {formData.groomName || t("groom_name_placeholder")}
                      </p>
                    </div>
                    <div
                      className={styles.guestMessage}
                      style={{
                        color: formData.primaryColor || "#5a4a42",
                        fontFamily: formData.fontType || "cairo",
                      }}
                    >
                      {formData.guestMessage || t("guest_message_placeholder")}
                    </div>
                    <div
                      className={styles.entryDate}
                      style={{
                        color: formData.primaryColor || "#5a4a42",
                        fontFamily: formData.fontType || "cairo",
                      }}
                    >
                      {formatDateWithSpans(formData.entryDate, t, styles)}
                    </div>
                    <div
                      className={styles.entryTime}
                      style={{
                        color: formData.primaryColor || "#5a4a42",
                        fontFamily: formData.fontType || "cairo",
                      }}
                    >
                      {formatTimeWithSpans(formData.entryTime, locale, t)}
                    </div>
                    <div
                      className={styles.address}
                      style={{
                        color: formData.primaryColor || "#5a4a42",
                        fontFamily: formData.fontType || "cairo",
                      }}
                    >
                      {formData.address || t("address_placeholder")}
                    </div>
                    <div
                      className={styles.endMessage}
                      style={{
                        color: formData.primaryColor || "#5a4a42",
                        fontFamily: formData.fontType || "cairo",
                      }}
                    >
                      {formData.endMessage || t("end_message_placeholder")}
                    </div>
                  </div>
                </div>
                <div className={styles.buttonContainer}>
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    title={t("cancel")}
                    type="button"
                    disabled={isGeneratingImage}
                  />
                  <Button
                    variant="primary"
                    title={isGeneratingImage ? "جاري الحفظ..." : t("save")}
                    onClick={handleSubmit(onSubmit)}
                    type="button"
                    disabled={isGeneratingImage}
                  />
                </div>
              </div>
            )}
          </FormProvider>
        </CardLayout>

        {/* Hidden template for mobile image generation */}
        {!isLg && (
          <div
            style={{
              position: "fixed",
              left: "0",
              top: "0",
              width: "400px",
              height: "500px",
              opacity: "0",
              pointerEvents: "none",
              zIndex: "-1",
              overflow: "hidden",
            }}
          >
            <div
              className={styles.templatePreview}
              ref={ImageOfTemplate}
              style={{
                width: "400px",
                height: "500px",
                position: "relative",
              }}
            >
              <img
                src="/svg/events/invitation.svg"
                alt="invitation preview"
                className={styles.invitationBackground}
              />
              <div className={styles.templateContent}>
                <div
                  className={styles.messageTemplateText}
                  style={{
                    color: formData.primaryColor || "#5a4a42",
                    fontFamily: formData.fontType || "cairo",
                  }}
                >
                  {formData.messageText || t("message_text_placeholder")}
                </div>

                <div className={styles.brideAndGroomName}>
                  <p
                    className={styles.brideName}
                    style={{
                      color: formData.primaryColor || "#5a4a42",
                      fontFamily: formData.fontType || "cairo",
                    }}
                  >
                    {formData.brideName || t("bride_name_placeholder")}
                  </p>
                  <span className={styles.and}> & </span>
                  <p
                    className={styles.groomName}
                    style={{
                      color: formData.primaryColor || "#5a4a42",
                      fontFamily: formData.fontType || "cairo",
                    }}
                  >
                    {formData.groomName || t("groom_name_placeholder")}
                  </p>
                </div>
                <div
                  className={styles.guestMessage}
                  style={{
                    color: formData.primaryColor || "#5a4a42",
                    fontFamily: formData.fontType || "cairo",
                  }}
                >
                  {formData.guestMessage || t("guest_message_placeholder")}
                </div>
                <div
                  className={styles.entryDate}
                  style={{
                    color: formData.primaryColor || "#5a4a42",
                    fontFamily: formData.fontType || "cairo",
                  }}
                >
                  {formatDateWithSpans(formData.entryDate, t, styles)}
                </div>
                <div
                  className={styles.entryTime}
                  style={{
                    color: formData.primaryColor || "#5a4a42",
                    fontFamily: formData.fontType || "cairo",
                  }}
                >
                  {formatTimeWithSpans(formData.entryTime, locale, t)}
                </div>
                <div
                  className={styles.address}
                  style={{
                    color: formData.primaryColor || "#5a4a42",
                    fontFamily: formData.fontType || "cairo",
                  }}
                >
                  {formData.address || t("address_placeholder")}
                </div>
                <div
                  className={styles.endMessage}
                  style={{
                    color: formData.primaryColor || "#5a4a42",
                    fontFamily: formData.fontType || "cairo",
                  }}
                >
                  {formData.endMessage || t("end_message_placeholder")}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Preview Popup */}
        {!isLg && showPreviewPopup && (
          <div
            className={styles.previewPopupOverlay}
            onClick={() => setShowPreviewPopup(false)}
          >
            <div
              className={styles.previewPopupContent}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.previewPopupClose}
                onClick={() => setShowPreviewPopup(false)}
              >
                <img src="/svg/events/close-circle.svg" alt="close" />
              </button>
              <div className={styles.templatePreview}>
                <img
                  src="/svg/events/invitation.svg"
                  alt="invitation preview"
                  className={styles.invitationBackground}
                />
                <div className={styles.templateContent}>
                  <div
                    className={styles.messageTemplateText}
                    style={{
                      color: formData.primaryColor || "#5a4a42",
                      fontFamily: formData.fontType || "cairo",
                    }}
                  >
                    {formData.messageText || t("message_text_placeholder")}
                  </div>

                  <div className={styles.brideAndGroomName}>
                    <p
                      className={styles.brideName}
                      style={{
                        color: formData.primaryColor || "#5a4a42",
                        fontFamily: formData.fontType || "cairo",
                      }}
                    >
                      {formData.brideName || t("bride_name_placeholder")}
                    </p>
                    <span className={styles.and}> & </span>
                    <p
                      className={styles.groomName}
                      style={{
                        color: formData.primaryColor || "#5a4a42",
                        fontFamily: formData.fontType || "cairo",
                      }}
                    >
                      {formData.groomName || t("groom_name_placeholder")}
                    </p>
                  </div>
                  <div
                    className={styles.guestMessage}
                    style={{
                      color: formData.primaryColor || "#5a4a42",
                      fontFamily: formData.fontType || "cairo",
                    }}
                  >
                    {formData.guestMessage || t("guest_message_placeholder")}
                  </div>
                  <div
                    className={styles.entryDate}
                    style={{
                      color: formData.primaryColor || "#5a4a42",
                      fontFamily: formData.fontType || "cairo",
                    }}
                  >
                    {formatDateWithSpans(formData.entryDate, t, styles)}
                  </div>
                  <div
                    className={styles.entryTime}
                    style={{
                      color: formData.primaryColor || "#5a4a42",
                      fontFamily: formData.fontType || "cairo",
                    }}
                  >
                    {formatTimeWithSpans(formData.entryTime, locale, t)}
                  </div>
                  <div
                    className={styles.address}
                    style={{
                      color: formData.primaryColor || "#5a4a42",
                      fontFamily: formData.fontType || "cairo",
                    }}
                  >
                    {formData.address || t("address_placeholder")}
                  </div>
                  <div
                    className={styles.endMessage}
                    style={{
                      color: formData.primaryColor || "#5a4a42",
                      fontFamily: formData.fontType || "cairo",
                    }}
                  >
                    {formData.endMessage || t("end_message_placeholder")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </PopupLayout>
    </div>
  );
}

export default TemplateForm;
