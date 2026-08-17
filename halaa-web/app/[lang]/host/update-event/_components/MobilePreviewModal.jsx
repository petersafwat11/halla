"use client";
import React from "react";
import WhatsappPreview from "../../create-event/_components/whatsappPreview/WhatsappPreview";
import styles from "../../create-event/page.module.css";

/**
 * Full-screen modal overlay that renders the WhatsApp preview on mobile.
 * Closes when the backdrop or the × button is clicked.
 */
const MobilePreviewModal = ({ formData, locale, onClose }) => (
  <div className={styles.modal_overlay} onClick={onClose}>
    <div
      className={styles.modal_content}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className={styles.modal_close}
        onClick={onClose}
        type="button"
      >
        ×
      </button>
      <WhatsappPreview
        eventTitle={formData.eventName || ""}
        previewBody={formData.selectedTemplate?.bodyText || ""}
        templateImage={
          formData.templateImage || "/svg/events/invitation.svg"
        }
        templateData={formData.visualTemplate?.data || {}}
        selectedTemplate={formData.selectedTemplate}
        eventDate={formData.eventDate || ""}
        eventTime={formData.eventTime || ""}
        locationAddress={formData.address?.address || ""}
        locale={locale}
        invitationType={formData.invitationType}
        forceShow={true}
      />
    </div>
  </div>
);

export default MobilePreviewModal;
