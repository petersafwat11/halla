/**
 * Non-hook event-form helpers extracted from the prior `services/EventsService.js`.
 *
 * Mobile-only by design: error and CSV-header strings are returned as i18n
 * keys (e.g. `events:validation.phoneRequired`) and the consuming components
 * resolve them via `t(key)`. Web does not need these helpers — its wizard
 * pipes through react-hook-form + zod on every step (see
 * `labbe/hooks/events/useEventForm.js`).
 *
 * File name kept as `useEventForm.js` for parity with web; the contents are
 * pure functions, not React hooks, so callers can `import` them anywhere.
 */

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
  ];

  const sampleData = [
    { name: "أحمد محمد", mobile: "512345678" },
    { name: "فاطمة علي", mobile: "598765432" },
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
    case 3:
      return !!(
        formData.visualTemplate?.templateRef ||
        formData.visualTemplate?._id ||
        formData.visualTemplate?.id ||
        formData.templateImage
      );
    case 4:
      return !!(
        formData.selectedTemplate?.name ||
        formData.taqnyatTemplate?.templateRef ||
        formData.taqnyatTemplateRef
      );
    case 5:
      return true;
    case 6:
      return !!(
        formData.eventType &&
        formData.eventName &&
        formData.eventDate &&
        formData.eventTime &&
        formData.address?.address &&
        formData.guestList &&
        formData.guestList.length > 0 &&
        // Step-3 satisfied: either a predefined template ref, a custom
        // upload (templateImage), or both. visualTemplate truthy alone
        // is no longer enough — an empty {isCustomUpload:true} with no
        // image must NOT pass.
        (formData.visualTemplate?.templateRef ||
          formData.visualTemplate?._id ||
          formData.visualTemplate?.id ||
          formData.templateImage) &&
        (formData.selectedTemplate?.name ||
          formData.taqnyatTemplate?.templateRef) &&
        formData.confirmReviewed
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
    email: guest.email || "",
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
    onExpected: formData.guestReplies?.onExpected || "",
  },
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
  },
  description: "",

  // Step 2 — Guests + Staff
  guestList: [],
  staffList: [],

  // Step 3 — Visual invitation card
  visualTemplate: null,
  templateImage: null,

  // Step 4 — Taqnyat template + auto-replies
  selectedTemplate: null,
  taqnyatTemplate: null,
  guestReplies: { onAttend: "", onAbsent: "", onExpected: "" },

  // Launch settings
  sendSchedule: "now",
  scheduleDate: "",
  scheduleTime: "",

  // Step 5 — Review (create only)
  confirmReviewed: false,
});

// ============================================================================
// Aggregated default export — matches the prior `EventsService` shape so the
// `EventsService.validateStepData(...)` style of call site keeps working.
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
