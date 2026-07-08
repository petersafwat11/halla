/**
 * Response Helper
 * Standardized API response formatting
 * @module shared/utils/responseHelper
 */

/**
 * HTTP Status Codes
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  LOCKED: 423,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
};

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} [message] - Optional success message
 * @param {number} [statusCode=200] - HTTP status code
 */
const sendSuccess = (res, data, message = null, statusCode = HTTP_STATUS.OK) => {
  const response = {
    success: true,
    status: 'success',
  };

  if (message) response.message = message;
  if (data !== undefined) response.data = data;

  res.status(statusCode).json(response);
};

/**
 * Send created response (201)
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} [message='Created successfully'] - Success message
 */
const sendCreated = (res, data, message = 'Created successfully') => {
  sendSuccess(res, data, message, HTTP_STATUS.CREATED);
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination info
 * @param {number} pagination.page - Current page
 * @param {number} pagination.limit - Items per page
 * @param {number} pagination.total - Total items
 * @param {number} pagination.pages - Total pages
 * @param {string} [message] - Optional message
 */
const sendPaginated = (res, data, pagination, message = null) => {
  const response = {
    success: true,
    status: 'success',
    data,
    pagination,
  };

  if (message) response.message = message;

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Send no content response (204)
 * @param {Object} res - Express response object
 */
const sendNoContent = (res) => {
  res.status(HTTP_STATUS.NO_CONTENT).send();
};

/**
 * Send deleted response
 * @param {Object} res - Express response object
 * @param {string} [message='Deleted successfully'] - Success message
 */
const sendDeleted = (res, message = 'Deleted successfully') => {
  sendSuccess(res, null, message, HTTP_STATUS.OK);
};

/**
 * Build pagination object from query params
 * @param {Object} query - Express query object
 * @param {number} [defaultLimit=10] - Default items per page
 * @returns {Object} Pagination options
 */
const getPaginationFromQuery = (query, defaultLimit = 10) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build pagination response object
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {Object} Pagination response object
 */
const buildPaginationResponse = (page, limit, total) => {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  };
};

module.exports = {
  HTTP_STATUS,
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNoContent,
  sendDeleted,
  getPaginationFromQuery,
  buildPaginationResponse,
};
