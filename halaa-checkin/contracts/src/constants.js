/**
 * @halaa-checkin/contracts
 * Shared constants, enums, limits, and system constraints.
 */

export const APP_METADATA = Object.freeze({
  name: 'Halaa Guest Check-in',
  nameAr: 'هلا لإدارة دخول الضيوف',
  version: '0.1.0',
});

export const PORTS = Object.freeze({
  API: 8100,
  WEB: 3100,
});

export const API_PREFIX = '/api/checkin/v1';

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  RECEPTION: 'reception',
});

export const ROLE_VALUES = Object.freeze([ROLES.ADMIN, ROLES.RECEPTION]);

export const EVENT_STATUSES = Object.freeze({
  DRAFT: 'draft',
  LIVE: 'live',
  CLOSED: 'closed',
});

export const EVENT_STATUS_VALUES = Object.freeze([
  EVENT_STATUSES.DRAFT,
  EVENT_STATUSES.LIVE,
  EVENT_STATUSES.CLOSED,
]);

export const EVENT_TIMEZONE = 'Asia/Riyadh';

export const ADMISSION_METHODS = Object.freeze({
  CAMERA: 'camera',
  SCANNER: 'scanner',
  MANUAL: 'manual',
});

export const ADMISSION_METHOD_VALUES = Object.freeze([
  ADMISSION_METHODS.CAMERA,
  ADMISSION_METHODS.SCANNER,
  ADMISSION_METHODS.MANUAL,
]);

export const EXPORT_KINDS = Object.freeze({
  QR: 'qr',
  REPORT: 'report',
});

export const EXPORT_KIND_VALUES = Object.freeze([
  EXPORT_KINDS.QR,
  EXPORT_KINDS.REPORT,
]);

export const EXPORT_SCOPES = Object.freeze({
  ALL: 'all',
  SELECTED: 'selected',
});

export const EXPORT_SCOPE_VALUES = Object.freeze([
  EXPORT_SCOPES.ALL,
  EXPORT_SCOPES.SELECTED,
]);

export const EXPORT_STATES = Object.freeze({
  QUEUED: 'queued',
  RUNNING: 'running',
  READY: 'ready',
  FAILED: 'failed',
  EXPIRED: 'expired',
});

export const EXPORT_STATE_VALUES = Object.freeze([
  EXPORT_STATES.QUEUED,
  EXPORT_STATES.RUNNING,
  EXPORT_STATES.READY,
  EXPORT_STATES.FAILED,
  EXPORT_STATES.EXPIRED,
]);

export const LOCALES = Object.freeze({
  AR: 'ar',
  EN: 'en',
});

export const LOCALE_VALUES = Object.freeze([LOCALES.AR, LOCALES.EN]);

export const DEFAULT_LOCALE = LOCALES.AR;

export const GUEST_ATTENDANCE_FILTERS = Object.freeze({
  ALL: 'all',
  ADMITTED: 'admitted',
  PENDING: 'pending',
});

export const GUEST_ATTENDANCE_FILTER_VALUES = Object.freeze([
  GUEST_ATTENDANCE_FILTERS.ALL,
  GUEST_ATTENDANCE_FILTERS.ADMITTED,
  GUEST_ATTENDANCE_FILTERS.PENDING,
]);

export const LIMITS = Object.freeze({
  MAX_EVENT_NAME_LENGTH: 120,
  MAX_EVENT_VENUE_LENGTH: 160,
  MAX_EVENT_INVITATIONS: 1000,
  MIN_COMPANIONS_PER_GUEST: 0,
  MAX_COMPANIONS_PER_GUEST: 20,
  MIN_GUEST_NAME_LENGTH: 1,
  MAX_GUEST_NAME_LENGTH: 120,
  MIN_COMPANION_NAME_LENGTH: 1,
  MAX_COMPANION_NAME_LENGTH: 120,
  MIN_REFERENCE_LENGTH: 1,
  MAX_REFERENCE_LENGTH: 60,
  SHORT_CODE_LENGTH: 10,
  MIN_SEARCH_QUERY_LENGTH: 2,
  MAX_SEARCH_QUERY_LENGTH: 120,
  GATE_SEARCH_MAX_LIMIT: 20,
  MIN_REASON_LENGTH: 5,
  MAX_REASON_LENGTH: 500,
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
  MAX_CSV_BYTES: 2 * 1024 * 1024, // 2 MB
  MAX_CSV_ROWS: 1000,
  MAX_EXPORT_QUEUE_TOTAL: 10,
  MAX_EXPORT_QUEUE_PER_ADMIN: 3,
  SESSION_EXPIRY_MS: 12 * 60 * 60 * 1000, // 12 hours
  EXPORT_EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours
});

export const CSV_REQUIRED_HEADERS = Object.freeze([
  'name',
  'allowedCompanions',
  'companionNames',
  'reference',
]);

export const QR_TOKEN_PREFIX = 'HGC1.';

export const REGEXES = Object.freeze({
  OBJECT_ID: /^[0-9a-fA-F]{24}$/,
  CROCKFORD_BASE32_SHORT_CODE: /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{10}$/,
  QR_TOKEN: /^HGC1\.[A-Za-z0-9_-]{40,}$/,
  ISO_8601_WITH_OFFSET: /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
});

export const DESIGN_TOKENS = Object.freeze({
  colors: {
    artboard: '#f9f4ef',
    surface: '#ffffff',
    primary: '#c28e5c',
    primaryHover: '#b18154',
    primaryPressed: '#6b4e33',
    primarySoft: '#f5ece4',
    secondary: '#524438',
    textBody: '#2c2c2c',
    textDescription: '#656565',
    formBorder: '#dfdfdf',
    success: '#2a8c5b',
    warning: '#d38200',
    error: '#c0392b',
  },
  typography: {
    fontFamilyAr: 'Cairo, sans-serif',
    fontFamilyEn: 'Cairo, sans-serif',
  },
  radii: {
    default: '12px',
  },
});
