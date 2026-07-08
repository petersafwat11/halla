/**
 * Async Error Wrapper
 * Wraps async controller functions to catch errors
 * @module shared/utils/catchAsync
 */

/**
 * Wrap async function to catch errors and pass to next()
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;
