/**
 * Pure step validation logic for event create/update wizards on web.
 * Resolves EVT-07 and EVT-08.
 */

import {
  isValidEventPerson,
  resolveTaqnyatTemplateRef,
  resolveVisualTemplateRef,
} from "@halaa/shared/utils/eventWizard";
import { isObjectIdString } from "@halaa/shared/utils/referenceId";

export {
  eventStepForServerField,
  eventStepForServerCode,
  findEventStepForServerError,
  findInvalidEventPeople,
  resolveTaqnyatTemplateRef,
  resolveVisualTemplateRef,
} from "@halaa/shared/utils/eventWizard";

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
        (!formData.isBusinessEvent || formData.isExistingEvent || !formData.businessLogoMissing) &&
        formData.eventType &&
        hasValidEventName &&
        formData.eventDate &&
        hasValidEventTime &&
        hasValidAddress
      );
    }
    case 2:
      return Boolean(
        formData.guestList?.length > 0 &&
        formData.guestList.every(isValidEventPerson) &&
        (formData.staffList || []).every(isValidEventPerson)
      );
    case 3: {
      const hasTemplateMode = Boolean(
        formData.visualTemplate?.isCustomUpload ||
        resolveVisualTemplateRef(formData.visualTemplate)
      );
      return hasTemplateMode && Boolean(formData.templateImage);
    }
    case 4:
      return isObjectIdString(resolveTaqnyatTemplateRef(formData));
    case 5:
      return formData.confirmReviewed === true;
    default:
      return false;
  }
};

export const findFirstInvalidEventStep = (formData, totalSteps = 5) => {
  for (let step = 1; step <= totalSteps; step += 1) {
    if (!validateEventStep(step, formData)) return step;
  }
  return null;
};
