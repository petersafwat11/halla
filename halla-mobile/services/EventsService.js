/**
 * EventsService - Centralized service for event creation and management
 * Handles all business logic, validation, and API calls for events
 */

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates a guest or moderator item. Errors are returned as i18n keys
 * (e.g. `events:validation.guestNameRequired`); the caller translates
 * them via `t(key)`.
 *
 * @param {Object} item - The item to validate
 * @param {string} item.name - Name of the person
 * @param {string} item.phone - Phone number (mobile)
 * @param {string} type - Type of item ('guest' or 'moderator')
 * @param {Array} existingList - List of existing items to check for duplicates
 * @returns {Object} - { isValid: boolean, errors: Object }
 */
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
        existingItem.phone === phone || existingItem.mobile === phone
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

/**
 * Validates a row from CSV import. Errors are returned as i18n keys; the
 * caller translates them via `t(key)`.
 * @param {Object} row - Row data from CSV
 * @param {number} index - Row index
 * @returns {Object} - { valid: boolean, errors: Array<string> }
 */
export const validateCSVRow = (row, index) => {
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

/**
 * Adds a new item to a list (guest or moderator)
 * @param {Object} item - Item to add
 * @param {Array} currentList - Current list
 * @param {string} type - Type of item ('guest' or 'moderator')
 * @returns {Object} - { success: boolean, list: Array, error: string }
 */
export const addListItem = (item, currentList = [], type = "guest") => {
  const validation = validateListItem(item, type, currentList);

  if (!validation.isValid) {
    return {
      success: false,
      list: currentList,
      errors: validation.errors,
    };
  }

  const newItem = {
    id: Date.now(),
    name: item.name.trim(),
    phone: (item.phone || item.mobile || "").trim(),
  };

  return {
    success: true,
    list: [...currentList, newItem],
    errors: null,
  };
};

/**
 * Edits an existing item in a list
 * @param {number} id - ID of item to edit
 * @param {Object} updatedData - Updated data
 * @param {Array} currentList - Current list
 * @param {string} type - Type of item ('guest' or 'moderator')
 * @returns {Object} - { success: boolean, list: Array, error: string }
 */
export const editListItem = (
  id,
  updatedData,
  currentList = [],
  type = "guest"
) => {
  const validation = validateListItem(
    { ...updatedData, id },
    type,
    currentList
  );

  if (!validation.isValid) {
    return {
      success: false,
      list: currentList,
      errors: validation.errors,
    };
  }

  const updatedItem = {
    id,
    name: updatedData.name.trim(),
    phone: (updatedData.phone || updatedData.mobile || "").trim(),
  };

  const updatedList = currentList.map((item) =>
    item.id === id ? updatedItem : item
  );

  return {
    success: true,
    list: updatedList,
    errors: null,
  };
};

/**
 * Removes an item from a list
 * @param {number} id - ID of item to remove
 * @param {Array} currentList - Current list
 * @returns {Array} - Updated list
 */
export const removeListItem = (id, currentList = []) => {
  return currentList.filter((item) => item.id !== id);
};

/**
 * Removes multiple items from a list
 * @param {Array} ids - Array of IDs to remove
 * @param {Array} currentList - Current list
 * @returns {Array} - Updated list
 */
export const bulkRemoveListItems = (ids = [], currentList = []) => {
  return currentList.filter((item) => !ids.includes(item.id));
};

// ============================================================================
// CSV/EXCEL IMPORT/EXPORT HELPERS
// ============================================================================

/**
 * Generates CSV template data for guests or moderators
 * @param {string} type - Type of template ('guest' or 'moderator')
 * @returns {Object} - { headers: Array, sampleData: Array, fileName: string }
 */
export const generateCSVTemplate = (type = "guest") => {
  // Header labels are returned as i18n keys; callers translate via `t(key)`.
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

/**
 * Processes imported CSV data
 * @param {Array} importedData - Data from CSV file
 * @param {Array} currentList - Current list to check for duplicates
 * @param {string} type - Type of data ('guest' or 'moderator')
 * @returns {Object} - { validData: Array, errors: Array, duplicates: Array }
 */
export const processImportedCSV = (
  importedData = [],
  currentList = [],
  type = "guest"
) => {
  const existingPhones = currentList.map((item) => item.phone || item.mobile);
  const duplicates = [];
  const errors = [];
  const validData = [];

  importedData.forEach((item, index) => {
    const phone = (item.mobile || item.phone || "").trim();

    // Check if phone already exists
    if (existingPhones.includes(phone)) {
      duplicates.push({
        row: index + 2, // +2 because of header row and 0-index
        errors: ["events:validation.phoneDuplicate"],
      });
      return;
    }

    // Validate the row
    const validation = validateCSVRow(item, index);
    if (!validation.valid) {
      errors.push({
        row: index + 2,
        errors: validation.errors,
      });
      return;
    }

    // Add to valid data and track phone
    validData.push({
      id: Date.now() + index,
      name: item.name.trim(),
      phone: phone,
    });
    existingPhones.push(phone);
  });

  return {
    validData,
    errors,
    duplicates,
  };
};

// ============================================================================
// STEP VALIDATION
// ============================================================================

/**
 * Validates if a step has all required data
 * @param {number} stepNumber - Step number (1-5)
 * @param {Object} formData - Form data object
 * @returns {boolean} - Whether step is valid
 */
export const validateStepData = (stepNumber, formData) => {
  switch (stepNumber) {
    case 1:
      // Event Details - flat structure
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

    case 2:
      // Guest List (at least one guest required)
      return !!(formData.guestList && formData.guestList.length > 0);

    case 3:
      // Visual invitation card (Step 3 = visualTemplate). Accept
      // either the canonical templateRef or the legacy id.
      return !!(
        formData.visualTemplate?.templateRef ||
        formData.visualTemplate?._id ||
        formData.visualTemplate?.id ||
        formData.templateImage
      );

    case 4:
      // Taqnyat picker. Accept either the legacy
      // `selectedTemplate.name` or the canonical
      // `taqnyatTemplate.templateRef`.
      return !!(
        formData.selectedTemplate?.name ||
        formData.taqnyatTemplate?.templateRef ||
        formData.taqnyatTemplateRef
      );

    case 5:
      // Messaging + replies + note. The defaults are seeded by
      // StepFive on mount, so this is satisfied as soon as the host
      // sees the step.
      return true;

    case 6:
      // Final review step — all data must be valid AND user must
      // confirm they've reviewed.
      return !!(
        formData.eventType &&
        formData.eventName &&
        formData.eventDate &&
        formData.eventTime &&
        formData.address?.address &&
        formData.guestList &&
        formData.guestList.length > 0 &&
        (formData.visualTemplate?.templateRef ||
          formData.visualTemplate?._id ||
          formData.visualTemplate?.id ||
          formData.visualTemplate) &&
        (formData.selectedTemplate?.name ||
          formData.taqnyatTemplate?.templateRef) &&
        formData.confirmReviewed
      );

    default:
      return false;
  }
};

// ============================================================================
// API CALLS
// ============================================================================

/**
 * Transforms form data to API payload format
 * @param {Object} formData - Form data from react-hook-form
 * @returns {Object} - Transformed payload for API
 */
export const transformFormDataToPayload = (formData) => {
  return {
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
    })),
    staffList: (formData.staffList || []).map((moderator) => ({
      name: moderator.name,
      phone: moderator.phone || moderator.mobile,
    })),
    // Canonical top-level keys only.
    visualTemplate: formData.visualTemplate
      ? {
          templateRef:
            formData.visualTemplate.templateRef ||
            formData.visualTemplate._id ||
            formData.visualTemplate.id,
          fieldValues:
            formData.visualTemplate.fieldValues ||
            formData.visualTemplate.data ||
            {},
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
  };
};

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Returns default form values for create event
 * @returns {Object} - Default form values
 */
export const getDefaultFormValues = () => ({
  // Step 1 - Event Details
  eventType: "",
  eventName: "",
  eventDate: null,
  eventTime: "",
  address: {
    address: "",
    latitude: 24.7136,
    longitude: 46.6753,
    city: "",
    country: "",
  },
  description: "",

  // Step 2 - Guests and Staff
  guestList: [],
  staffList: [],

  // Step 3 - Visual Invitation Card (same as web's visualTemplate)
  visualTemplate: null,     // { _id, name, fields, data: {...} }
  templateImage: null,

  // Step 4 - Taqnyat WhatsApp Template + auto-replies
  selectedTemplate: null,
  taqnyatTemplate: null,
  guestReplies: { onAttend: "", onAbsent: "", onExpected: "" },

  // Launch Settings
  sendSchedule: "now",
  scheduleDate: null,
  scheduleTime: "",

  // Step 5 - Review & Confirm (create only)
  confirmReviewed: false,
});

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Validation
  validateListItem,
  validateCSVRow,
  validateStepData,

  // List Management
  addListItem,
  editListItem,
  removeListItem,
  bulkRemoveListItems,

  // CSV Operations
  generateCSVTemplate,
  processImportedCSV,

  // API Operations
  transformFormDataToPayload,

  // Defaults
  getDefaultFormValues,
};
