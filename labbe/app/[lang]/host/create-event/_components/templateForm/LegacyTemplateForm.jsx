"use client";

import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import CardLayout from "@/ui/commen/card/CardLayout";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import { templateFormSchema } from "@/utils/schemas/createEventSchema";
import { formatDateWithSpans, formatTimeWithSpans } from "@/utils/index";
import { useMediaQuery } from "@/hooks/use-media-query";
import { bakeTemplateImage } from "./useTemplateBake";
import LegacyTemplateFields from "./LegacyTemplateFields";
import styles from "./templateForm.module.css";

const parseDate = (dateValue) => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  const parsed = new Date(dateValue);
  return isNaN(parsed.getTime()) ? null : parsed;
};

function buildDefaults(template, parentEventDate, parentEventTime) {
  return {
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
      template?.data?.primaryColor ||
      template?.colors?.primary ||
      "#5a4a42",
  };
}

function LegacyTemplatePreview({ formData, locale, t }) {
  const stylesMap = {
    color: formData.primaryColor || "#5a4a42",
    fontFamily: formData.fontType || "cairo",
  };
  return (
    <>
      <img
        src="/svg/events/invitation.svg"
        alt="invitation preview"
        className={styles.invitationBackground}
      />
      <div className={styles.templateContent}>
        <div className={styles.messageTemplateText} style={stylesMap}>
          {formData.messageText || t("message_text_placeholder")}
        </div>
        <div className={styles.brideAndGroomName}>
          <p className={styles.brideName} style={stylesMap}>
            {formData.brideName || t("bride_name_placeholder")}
          </p>
          <span className={styles.and}> & </span>
          <p className={styles.groomName} style={stylesMap}>
            {formData.groomName || t("groom_name_placeholder")}
          </p>
        </div>
        <div className={styles.guestMessage} style={stylesMap}>
          {formData.guestMessage || t("guest_message_placeholder")}
        </div>
        <div className={styles.entryDate} style={stylesMap}>
          {formatDateWithSpans(formData.entryDate, t, styles)}
        </div>
        <div className={styles.entryTime} style={stylesMap}>
          {formatTimeWithSpans(formData.entryTime, locale, t)}
        </div>
        <div className={styles.address} style={stylesMap}>
          {formData.address || t("address_placeholder")}
        </div>
        <div className={styles.endMessage} style={stylesMap}>
          {formData.endMessage || t("end_message_placeholder")}
        </div>
      </div>
    </>
  );
}

export default function LegacyTemplateForm({
  isOpen,
  onClose,
  locale,
  setEventValues,
  template,
}) {
  const ImageOfTemplate = useRef(null);
  const { t } = useTranslation("createEvent");
  const isLg = useMediaQuery("(min-width: 1024px)");
  const [showPreviewPopup, setShowPreviewPopup] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const parentFormContext = useFormContext();
  const parentEventDate = parentFormContext?.watch("eventDate");
  const parentEventTime = parentFormContext?.watch("eventTime");

  const methods = useForm({
    resolver: zodResolver(templateFormSchema(t)),
    defaultValues: buildDefaults(template, parentEventDate, parentEventTime),
  });
  const { watch, handleSubmit, getValues, reset } = methods;

  React.useEffect(() => {
    reset(buildDefaults(template, parentEventDate, parentEventTime));
  }, [template, parentEventDate, parentEventTime, reset]);

  const formData = watch();

  const handleImageConvert = async () => {
    setIsGeneratingImage(true);
    try {
      const file = await bakeTemplateImage(ImageOfTemplate);
      setEventValues("templateImage", file);
      setEventValues("invitationSettings.templateImage", file);
      onClose();
    } catch (error) {
      alert(
        error.message ||
          t("template_bake_failed", "Failed to generate template image")
      );
      throw error;
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const onSubmit = async (data) => {
    const dataToSave = data || getValues();
    const updatedTemplate = { ...(template || {}), data: dataToSave };
    setEventValues("selectedTemplate", updatedTemplate);
    setEventValues("invitationSettings.selectedTemplate", updatedTemplate);
    await handleImageConvert();
  };

  const SaveCancelRow = (
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
        title={isGeneratingImage ? t("saving", "جاري الحفظ...") : t("save")}
        onClick={handleSubmit(onSubmit)}
        type="button"
        disabled={isGeneratingImage}
      />
    </div>
  );

  return (
    <div className={styles.wrapper}>
      <PopupLayout isOpen={isOpen} onClose={onClose} size="full">
        <div className={styles.header}>
          <h2>{t("edit_design_template")}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            <img src="/svg/events/close-circle.svg" alt="close" />
          </button>
        </div>
        <CardLayout className={styles.container}>
          <FormProvider {...methods}>
            <form className={styles.rightForm} onSubmit={handleSubmit(onSubmit)}>
              <LegacyTemplateFields t={t} />
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
                  {SaveCancelRow}
                </>
              )}
            </form>
            {isLg && (
              <div className={styles.leftPreview}>
                <div className={styles.templatePreview} ref={ImageOfTemplate}>
                  <LegacyTemplatePreview
                    formData={formData}
                    locale={locale}
                    t={t}
                  />
                </div>
                {SaveCancelRow}
              </div>
            )}
          </FormProvider>
        </CardLayout>

        {!isLg && (
          <div className={styles.hiddenBakeContainer}>
            <div
              className={styles.templatePreview}
              ref={ImageOfTemplate}
              style={{ width: 400, height: 500, position: "relative" }}
            >
              <LegacyTemplatePreview formData={formData} locale={locale} t={t} />
            </div>
          </div>
        )}

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
                <LegacyTemplatePreview formData={formData} locale={locale} t={t} />
              </div>
            </div>
          </div>
        )}
      </PopupLayout>
    </div>
  );
}
