/**
 * Pure step validation logic for event create/update wizards on web.
 * Resolves EVT-07 and EVT-08.
 */

export const validateEventStep = (step, formData) => {
  if (!formData) return false;
  switch (step) {
    case 1: {
      const hasValidEventName =
        formData.eventName &&
        typeof formData.eventName === "string" &&
        formData.eventName.trim() !== "";
      const hasValidEventTime =
        formData.eventTime &&
        typeof formData.eventTime === "string" &&
        formData.eventTime.trim() !== "";
      const hasValidAddress =
        formData.address?.address &&
        typeof formData.address.address === "string" &&
        formData.address.address.trim() !== "";

      return Boolean(
        formData.eventType &&
        hasValidEventName &&
        formData.eventDate &&
        hasValidEventTime &&
        hasValidAddress
      );
    }
    case 2:
      return Boolean(formData.guestList && formData.guestList.length > 0);
    case 3: {
      const hasTemplateMode = Boolean(
        formData.visualTemplate?.isCustomUpload ||
        formData.visualTemplate?.templateRef ||
        formData.visualTemplate?.id ||
        formData.visualTemplate?._id
      );
      return hasTemplateMode && Boolean(formData.templateImage);
    }
    case 4:
      return Boolean(
        formData.selectedTemplate?.name ||
        formData.taqnyatTemplate?.templateRef ||
        formData.taqnyatTemplateRef
      );
    case 5:
      return formData.confirmReviewed === true;
    default:
      return false;
  }
};
