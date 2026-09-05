/**
 * Canonical filter normalizer for admin list routes and query keys.
 *
 * Guarantees that:
 * 1. Server SSR prefetch and browser React components generate byte-identical query keys.
 * 2. Table and Statistics subcomponents share the exact same normalized filters and query cache.
 * 3. Empty/default/undefined/null optional fields are stripped so they do not pollute keys or endpoints.
 * 4. Page and Limit are normalized to positive integers.
 */

function getParam(input, key) {
  if (!input) return undefined;
  if (typeof input.get === "function") {
    const val = input.get(key);
    return val === null ? undefined : val;
  }
  return input[key];
}

function cleanString(val) {
  if (val === undefined || val === null) return undefined;
  const str = String(val).trim();
  return str.length > 0 ? str : undefined;
}

function cleanInt(val, defaultVal, minVal = 1) {
  if (val === undefined || val === null || val === "") return defaultVal;
  const parsed = parseInt(val, 10);
  if (Number.isNaN(parsed) || parsed < minVal) return defaultVal;
  return parsed;
}

function cleanDate(val) {
  const str = cleanString(val);
  if (!str) return undefined;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return undefined;
  return str;
}

function cleanBoolean(val) {
  if (val === true || val === "true" || val === 1 || val === "1") return true;
  if (val === false || val === "false" || val === 0 || val === "0") return false;
  return undefined;
}

/**
 * Normalizes general admin list filters (hosts, businesses, vendors, moderators, events).
 */
export function normalizeAdminFilters(input, defaults = {}) {
  const defaultPage = defaults.page ?? 1;
  const defaultLimit = defaults.limit ?? 10;

  const page = cleanInt(getParam(input, "page"), defaultPage, 1);
  const limit = cleanInt(getParam(input, "limit"), defaultLimit, 1);
  const search = cleanString(getParam(input, "search"));
  const status = cleanString(getParam(input, "status"));
  const from = cleanDate(getParam(input, "from"));
  const to = cleanDate(getParam(input, "to"));

  const normalized = { page, limit };
  if (search !== undefined) normalized.search = search;
  if (status !== undefined) normalized.status = status;
  if (from !== undefined) normalized.from = from;
  if (to !== undefined) normalized.to = to;

  return normalized;
}

/**
 * Normalizes admin dashboard filters (period, from, to).
 */
export function normalizeDashboardFilters(input, defaults = {}) {
  const defaultPeriod = defaults.period ?? "month";
  const period = cleanString(getParam(input, "period")) || defaultPeriod;
  const from = cleanDate(getParam(input, "from"));
  const to = cleanDate(getParam(input, "to"));

  const normalized = { period };
  if (from !== undefined) normalized.from = from;
  if (to !== undefined) normalized.to = to;

  return normalized;
}

/**
 * Normalizes discounts list filters (page, limit, search, status, isActive).
 */
export function normalizeDiscountsFilters(input, defaults = {}) {
  const defaultPage = defaults.page ?? 1;
  const defaultLimit = defaults.limit ?? 20;

  const page = cleanInt(getParam(input, "page"), defaultPage, 1);
  const limit = cleanInt(getParam(input, "limit"), defaultLimit, 1);
  const search = cleanString(getParam(input, "search"));
  const status = cleanString(getParam(input, "status"));

  let isActive = cleanBoolean(getParam(input, "isActive"));
  if (isActive === undefined && status) {
    if (status === "active") isActive = true;
    else if (status === "inactive") isActive = false;
  }

  const normalized = { page, limit };
  if (search !== undefined) normalized.search = search;
  if (status !== undefined) normalized.status = status;
  if (isActive !== undefined) normalized.isActive = isActive;

  return normalized;
}

/**
 * Normalizes tickets list filters (page, limit, search, status, priority, category, from, to).
 */
export function normalizeTicketsFilters(input, defaults = {}) {
  const defaultPage = defaults.page ?? 1;
  const defaultLimit = defaults.limit ?? 10;

  const page = cleanInt(getParam(input, "page"), defaultPage, 1);
  const limit = cleanInt(getParam(input, "limit"), defaultLimit, 1);
  const search = cleanString(getParam(input, "search"));
  const status = cleanString(getParam(input, "status"));
  const priority = cleanString(getParam(input, "priority"));
  const category = cleanString(getParam(input, "category"));
  const from = cleanDate(getParam(input, "from"));
  const to = cleanDate(getParam(input, "to"));

  const normalized = { page, limit };
  if (search !== undefined) normalized.search = search;
  if (status !== undefined) normalized.status = status;
  if (priority !== undefined) normalized.priority = priority;
  if (category !== undefined) normalized.category = category;
  if (from !== undefined) normalized.from = from;
  if (to !== undefined) normalized.to = to;

  return normalized;
}

/**
 * Normalizes payments list filters (page, limit, search, status, from, to).
 */
export function normalizePaymentsFilters(input, defaults = {}) {
  const defaultPage = defaults.page ?? 1;
  const defaultLimit = defaults.limit ?? 20;

  const page = cleanInt(getParam(input, "page"), defaultPage, 1);
  const limit = cleanInt(getParam(input, "limit"), defaultLimit, 1);
  const search = cleanString(getParam(input, "search"));
  const status = cleanString(getParam(input, "status"));
  const from = cleanDate(getParam(input, "from"));
  const to = cleanDate(getParam(input, "to"));

  const normalized = { page, limit };
  if (search !== undefined) normalized.search = search;
  if (status !== undefined) normalized.status = status;
  if (from !== undefined) normalized.from = from;
  if (to !== undefined) normalized.to = to;

  return normalized;
}

/**
 * Normalizes custom design fulfillment list filters.
 */
export function normalizeFulfillmentFilters(input, defaults = {}) {
  const defaultPage = defaults.page ?? 1;
  const defaultLimit = defaults.limit ?? 20;

  const page = cleanInt(getParam(input, "page"), defaultPage, 1);
  const limit = cleanInt(getParam(input, "limit"), defaultLimit, 1);
  const search = cleanString(getParam(input, "search"));
  const status = cleanString(getParam(input, "status"));
  const templateType = cleanString(getParam(input, "templateType"));

  const normalized = { page, limit };
  if (status !== undefined) normalized.status = status;
  if (search !== undefined) normalized.search = search;
  if (templateType !== undefined) normalized.templateType = templateType;

  return normalized;
}
