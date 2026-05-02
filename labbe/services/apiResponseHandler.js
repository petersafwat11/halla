/**
 * API Response Handler Utility
 * Handles standardized API responses from the backend
 * Supports new response formats with requestId, pagination, and validation errors
 */

/**
 * Standard API response structure from backend:
 *
 * Success Response:
 * {
 *   status: "success",
 *   data: {...} | [...],
 *   results?: number,        // For arrays
 *   total?: number,          // For paginated responses
 *   pagination?: {
 *     page: number,
 *     limit: number,
 *     totalPages: number,
 *     hasNextPage: boolean,
 *     hasPrevPage: boolean,
 *     nextPage: number | null,
 *     prevPage: number | null,
 *   }
 * }
 *
 * Error Response:
 * {
 *   status: "fail" | "error",
 *   message: string,
 *   requestId?: string,      // For debugging
 *   errors?: [               // For validation errors
 *     { field: string, message: string, value?: any }
 *   ]
 * }
 */

/**
 * Check if response is successful
 * @param {Object} response - API response
 * @returns {boolean}
 */
export const isSuccess = (response) => {
  return response?.status === "success";
};

/**
 * Check if response is an error
 * @param {Object} response - API response
 * @returns {boolean}
 */
export const isError = (response) => {
  return response?.status === "fail" || response?.status === "error";
};

/**
 * Extract data from successful response
 * @param {Object} response - API response
 * @param {string} key - Optional key to extract specific data
 * @returns {*} Data from response
 */
export const extractData = (response, key = null) => {
  if (!isSuccess(response)) return null;

  if (key && response?.data?.[key]) {
    return response.data[key];
  }

  return response?.data;
};

/**
 * Extract array data from response
 * Handles both direct arrays and nested data structures
 * @param {Object} response - API response
 * @param {string} key - Key for nested data (e.g., 'hosts', 'vendors')
 * @returns {Array}
 */
export const extractArray = (response, key = null) => {
  if (!response) return [];

  // Direct array response
  if (Array.isArray(response)) return response;

  // Check data property
  const data = response?.data;

  // If data is array, return it
  if (Array.isArray(data)) return data;

  // If key specified, try to extract from data or response
  if (key) {
    if (data?.[key] && Array.isArray(data[key])) return data[key];
    if (response?.[key] && Array.isArray(response[key])) return response[key];
  }

  return [];
};

/**
 * Extract pagination info from response
 * Handles multiple response structures:
 * - { pagination: {...}, total: n }
 * - { data: { pagination: {...} }, results: n }
 * - { pagination: { total: n, pages: n } }
 * @param {Object} response - API response
 * @returns {Object|null} Pagination info
 */
export const extractPagination = (response) => {
  // Check for pagination at root level or nested in data
  const pagination = response?.pagination || response?.data?.pagination;
  if (!pagination) return null;

  // Total can be in multiple places
  const total = response.total || response.results || pagination.total || 0;
  const totalPages =
    pagination.totalPages ||
    pagination.pages ||
    Math.ceil(total / (pagination.limit || 20)) ||
    1;

  return {
    page: pagination.page || 1,
    limit: pagination.limit || 20,
    total,
    totalPages,
    hasNextPage: pagination.hasNextPage || pagination.page < totalPages,
    hasPrevPage: pagination.hasPrevPage || pagination.page > 1,
    nextPage: pagination.nextPage,
    prevPage: pagination.prevPage,
  };
};

/**
 * Extract error message from response
 * @param {Object} response - API response or error
 * @param {string} lang - Language code ('en' or 'ar')
 * @returns {string} Error message
 */
export const extractErrorMessage = (response, lang = "ar") => {
  // Handle axios error structure
  if (response?.response?.data?.message) {
    return response.response.data.message;
  }

  // Handle direct error response
  if (response?.message) {
    return response.message;
  }

  // Default error message
  return lang === "ar"
    ? "حدث خطأ ما. يرجى المحاولة مرة أخرى."
    : "Something went wrong. Please try again.";
};

/**
 * Extract validation errors from response
 * @param {Object} response - API response or error
 * @returns {Array} Array of validation errors
 */
export const extractValidationErrors = (response) => {
  // Handle axios error structure
  const errors = response?.response?.data?.errors || response?.errors;

  if (!errors) return [];

  // Normalize error format
  if (Array.isArray(errors)) {
    return errors.map((err) => ({
      field: err.field || err.path || "unknown",
      message: err.message || err.msg || "Invalid value",
      value: err.value,
    }));
  }

  // Handle object format { field: message }
  if (typeof errors === "object") {
    return Object.entries(errors).map(([field, message]) => ({
      field,
      message:
        typeof message === "string"
          ? message
          : message?.message || "Invalid value",
    }));
  }

  return [];
};

/**
 * Extract request ID from error response (for debugging)
 * @param {Object} response - API response or error
 * @returns {string|null} Request ID
 */
export const extractRequestId = (response) => {
  return response?.response?.data?.requestId || response?.requestId || null;
};

/**
 * Format validation errors for display
 * @param {Array} errors - Validation errors array
 * @returns {string} Formatted error message
 */
export const formatValidationErrors = (errors) => {
  if (!errors || !errors.length) return "";

  return errors.map((err) => `${err.field}: ${err.message}`).join("\n");
};

/**
 * Create error handler with toast notifications
 * @param {Function} toast - Toast notification function
 * @param {string} lang - Language code
 * @returns {Function} Error handler function
 */
export const createErrorHandler = (toast, lang = "ar") => {
  return (error, customMessage = null) => {
    const message = customMessage || extractErrorMessage(error, lang);
    const validationErrors = extractValidationErrors(error);
    const requestId = extractRequestId(error);

    // Log for debugging
    if (requestId) {
      console.error(`API Error [${requestId}]:`, message, validationErrors);
    }

    // Show toast with validation errors if present
    if (validationErrors.length > 0) {
      const firstError = validationErrors[0];
      toast.error(
        `${firstError.message}${
          validationErrors.length > 1
            ? ` (+${validationErrors.length - 1} more)`
            : ""
        }`
      );
    } else {
      toast.error(message);
    }

    return { message, validationErrors, requestId };
  };
};

/**
 * Pagination helper - calculate offset from page and limit
 * @param {number} page - Current page (1-indexed)
 * @param {number} limit - Items per page
 * @returns {number} Offset for database query
 */
export const calculateOffset = (page, limit) => {
  return (Math.max(1, page) - 1) * limit;
};

/**
 * Build query string for paginated requests
 * @param {Object} params - Query parameters
 * @returns {string} Query string
 */
export const buildPaginationQuery = (params) => {
  const { page = 1, limit = 20, sort, search, filters = {} } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", page.toString());
  queryParams.set("limit", limit.toString());

  if (sort) queryParams.set("sort", sort);
  if (search) queryParams.set("search", search);

  // Add filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.set(key, value.toString());
    }
  });

  return `?${queryParams.toString()}`;
};

/**
 * Response wrapper for consistent handling
 * @param {Promise} apiCall - API call promise
 * @returns {Promise<{success: boolean, data: any, error: any, pagination: any}>}
 */
export const handleApiCall = async (apiCall) => {
  try {
    const response = await apiCall;

    return {
      success: isSuccess(response),
      data: extractData(response),
      pagination: extractPagination(response),
      error: null,
      requestId: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      pagination: null,
      error: {
        message: extractErrorMessage(error),
        validationErrors: extractValidationErrors(error),
        requestId: extractRequestId(error),
      },
    };
  }
};

const apiResponseHandler = {
  isSuccess,
  isError,
  extractData,
  extractArray,
  extractPagination,
  extractErrorMessage,
  extractValidationErrors,
  extractRequestId,
  formatValidationErrors,
  createErrorHandler,
  calculateOffset,
  buildPaginationQuery,
  handleApiCall,
};

export default apiResponseHandler;
