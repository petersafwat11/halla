/**
 * Non-hook event-form helpers.
 *
 * Mobile-only by design: error and CSV-header strings are returned as i18n
 * keys (e.g. `events:validation.phoneRequired`) and the consuming components
 * resolve them via `t(key)`. Web does not need these helpers — its wizard
 * pipes through react-hook-form + zod on every step (see
 * `halaa-web/hooks/events/useEventForm.js`).
 *
 * File name kept as `useEventForm.js` for parity with web; the contents are
 * pure functions, not React hooks, so callers can `import` them anywhere.
 */

import { DEFAULT_INVITATION_TYPE } from "../../utils/invitationTypes.js";

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export const validateListItem = (item, type = "guest", existingList = []) => {
  const errors = {};
  const name = (item.name || "").trim();
  const phone = (item.phone || item.mobile || "").trim();

  if (!name) {
    errors.name =
      type === "guest"
        ? "events:validation.guestNameRequired"
        : "events:validation.staffNameRequired";
  }

  if (!phone) {
    errors.phone = "events:validation.phoneRequired";
  } else if (!/^5[0-9]{8}$/.test(phone)) {
    errors.phone = "events:validation.phoneInvalid";
  }

  if (phone && !item.id) {
    const phoneExists = existingList.some(
      (existingItem) =>
        existingItem.phone === phone || existingItem.mobile === phone,
    );
    if (phoneExists) {
      errors.phone = "events:validation.phoneDuplicate";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateCSVRow = (row) => {
  const errors = [];

  if (!row.name || !row.name.trim()) {
    errors.push("events:validation.nameRequired");
  }

  if (!row.mobile || !row.mobile.trim()) {
    errors.push("events:validation.phoneRequired");
  } else if (!/^5[0-9]{8}$/.test(row.mobile)) {
    errors.push("events:validation.phoneInvalid");
  }

  return { valid: errors.length === 0, errors };
};

// ============================================================================
// LIST MANAGEMENT HELPERS
// ============================================================================

export const addListItem = (item, currentList = [], type = "guest") => {
  const validation = validateListItem(item, type, currentList);
  if (!validation.isValid) {
    return { success: false, list: currentList, errors: validation.errors };
  }
  const newItem = {
    id: Date.now(),
    name: item.name.trim(),
    phone: (item.phone || item.mobile || "").trim(),
    category: (item.category || "").trim(),
  };
  return { success: true, list: [...currentList, newItem], errors: null };
};

export const editListItem = (id, updatedData, currentList = [], type = "guest") => {
  const validation = validateListItem(
    { ...updatedData, id },
    type,
    currentList,
  );
  if (!validation.isValid) {
    return { success: false, list: currentList, errors: validation.errors };
  }
  const updatedItem = {
    id,
    name: updatedData.name.trim(),
    phone: (updatedData.phone || updatedData.mobile || "").trim(),
    category: (updatedData.category || "").trim(),
  };
  return {
    success: true,
    list: currentList.map((item) => (item.id === id ? updatedItem : item)),
    errors: null,
  };
};

export const removeListItem = (id, currentList = []) =>
  currentList.filter((item) => item.id !== id);

export const bulkRemoveListItems = (ids = [], currentList = []) =>
  currentList.filter((item) => !ids.includes(item.id));

// ============================================================================
// CSV / EXCEL IMPORT / EXPORT HELPERS
// ============================================================================

export const generateCSVTemplate = (type = "guest") => {
  const headers = [
    {
      key: "name",
      label:
        type === "guest"
          ? "events:csv.headers.guestName"
          : "events:csv.headers.staffName",
    },
    { key: "mobile", label: "events:csv.headers.phone" },
    // Guests only — optional free-text grouping label.
    ...(type === "guest"
      ? [{ key: "category", label: "events:csv.headers.category" }]
      : []),
  ];

  const sampleData = [
    { name: "أحمد محمد", mobile: "512345678", category: "العائلة" },
    { name: "فاطمة علي", mobile: "598765432", category: "العمل" },
  ];

  const fileName = type === "guest" ? "guests-template" : "moderators-template";
  return { headers, sampleData, fileName };
};

export const processImportedCSV = (importedData = [], currentList = []) => {
  const existingPhones = currentList.map((item) => item.phone || item.mobile);
  const duplicates = [];
  const errors = [];
  const validData = [];

  importedData.forEach((item, index) => {
    const phone = (item.mobile || item.phone || "").trim();

    if (existingPhones.includes(phone)) {
      duplicates.push({
        row: index + 2,
        errors: ["events:validation.phoneDuplicate"],
      });
      return;
    }

    const validation = validateCSVRow(item);
    if (!validation.valid) {
      errors.push({ row: index + 2, errors: validation.errors });
      return;
    }

    validData.push({
      id: Date.now() + index,
      name: item.name.trim(),
      phone,
      category: (item.category || "").trim(),
    });
    existingPhones.push(phone);
  });

  return { validData, errors, duplicates };
};

// ============================================================================
// STEP VALIDATION
// ============================================================================

export const validateStepData = (stepNumber, formData) => {
  switch (stepNumber) {
    case 1: {
      const hasValidEventTime =
        formData.eventTime &&
        typeof formData.eventTime === "string" &&
        formData.eventTime.trim() !== "";

      const hasValidEventName =
        formData.eventName &&
        typeof formData.eventName === "string" &&
        formData.eventName.trim() !== "";

      const hasValidAddress =
        formData.address?.address &&
        typeof formData.address.address === "string" &&
        formData.address.address.trim() !== "";

      return !!(
        formData.eventType &&
        hasValidEventName &&
        formData.eventDate &&
        hasValidEventTime &&
        hasValidAddress
      );
    }
    case 2:
      return !!(formData.guestList && formData.guestList.length > 0);
    case 3: {
      const visualTemplate = formData.visualTemplate;
      const hasBakedOrUploadedImage = !!formData.templateImage;
      const isCustomUpload = visualTemplate?.isCustomUpload === true;
      const hasTemplateRef = !!(
        visualTemplate?.templateRef ||
        visualTemplate?._id ||
        visualTemplate?.id
      );

      // A predefined template is not complete until its protected
      // background loaded and the customised canvas was baked. Template
      // metadata alone previously allowed the wizard to continue with a
      // null image, producing an invalid final request. Custom uploads also
      // require the picked image rather than the mode flag by itself.
      return (
        hasBakedOrUploadedImage && (isCustomUpload || hasTemplateRef)
      );
    }
    case 4:
      return !!(
        formData.selectedTemplate?.name ||
        formData.taqnyatTemplate?.templateRef ||
        formData.taqnyatTemplateRef
      );
    case 5:
      // Resolves EVT-07: Mandatory review confirmation
      return formData.confirmReviewed === true;
    case 6:
      // Full wizard validation across all steps
      return !!(
        validateStepData(1, formData) &&
        validateStepData(2, formData) &&
        validateStepData(3, formData) &&
        validateStepData(4, formData) &&
        formData.confirmReviewed === true
      );
    default:
      return false;
  }
};

// ============================================================================
// API PAYLOAD TRANSFORM
// ============================================================================

export const transformFormDataToPayload = (formData) => ({
  eventDetails: {
    title: formData.eventName,
    type: formData.eventType,
    date: formData.eventDate,
    time: formData.eventTime,
    location: formData.address,
    description: formData.description || "",
  },
  guestList: (formData.guestList || []).map((guest) => ({
    name: guest.name,
    phone: guest.phone || guest.mobile,
    ...(guest.category ? { category: guest.category } : {}),
  })),
  staffList: (formData.staffList || []).map((moderator) => ({
    name: moderator.name,
    phone: moderator.phone || moderator.mobile,
  })),
  visualTemplate: formData.visualTemplate
    ? formData.visualTemplate.isCustomUpload
      ? {
          isCustomUpload: true,
          fieldValues: {},
        }
      : {
          templateRef:
            formData.visualTemplate.templateRef ||
            formData.visualTemplate._id ||
            formData.visualTemplate.id,
          fieldValues:
            formData.visualTemplate.fieldValues ||
            formData.visualTemplate.data ||
            {},
          isCustomUpload: false,
        }
    : undefined,
  taqnyatTemplate: formData.selectedTemplate
    ? {
        templateRef:
          formData.taqnyatTemplate?.templateRef ||
          formData.selectedTemplate._id ||
          formData.selectedTemplate.id,
      }
    : undefined,
  guestReplies: {
    onAttend: formData.guestReplies?.onAttend || "",
    onAbsent: formData.guestReplies?.onAbsent || "",
  },
  invitationType: formData.invitationType || DEFAULT_INVITATION_TYPE,
  templateImage: formData.templateImage,
  launchSettings: {
    sendSchedule: formData.sendSchedule || "now",
    scheduledDate: formData.scheduleDate,
    scheduledTime: formData.scheduleTime,
  },
});

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const getDefaultFormValues = () => ({
  // Step 1 — Event Details
  eventType: "",
  eventName: "",
  eventDate: "",
  eventTime: "",
  address: {
    address: "",
    latitude: 24.7136,
    longitude: 46.6753,
    city: "",
    country: "",
    placeId: null,
    provider: "google",
  },
  description: "",

  // Step 2 — Guests + Staff
  guestList: [],
  staffList: [],

  // Step 3 — Visual invitation card
  visualTemplate: { isCustomUpload: true, fieldValues: {} },
  templateImage: null,

  // Step 4 — Taqnyat template + auto-replies
  selectedTemplate: null,
  taqnyatTemplate: null,
  invitationType: DEFAULT_INVITATION_TYPE,
  guestReplies: { onAttend: "", onAbsent: "" },

  // Launch settings
  sendSchedule: "now",
  scheduleDate: "",
  scheduleTime: "",

  // Step 5 — Review (create only)
  confirmReviewed: false,
});

// ============================================================================
// Aggregated default export so the `EventsService.validateStepData(...)`
// style of call site keeps working.
// ============================================================================

const eventForm = {
  validateListItem,
  validateCSVRow,
  validateStepData,
  addListItem,
  editListItem,
  removeListItem,
  bulkRemoveListItems,
  generateCSVTemplate,
  processImportedCSV,
  transformFormDataToPayload,
  getDefaultFormValues,
};

export default eventForm;
