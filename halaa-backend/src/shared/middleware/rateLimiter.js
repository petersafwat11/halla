/**
 * Rate Limiting Middleware
 * Protects against brute force attacks and API abuse
 * Supports Redis store for distributed rate limiting
 */

const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { RATE_LIMIT, ROLES } = require("../constants");
const logger = require("../utils/logger");

/**
 * NAT-safe client key for the global backstop limiter.
 *
 * Saudi mobile traffic is heavily behind carrier-grade NAT, so pooling every
 * device under one IP would throttle real users. We therefore bucket by the
 * caller's bearer/cookie token when present (each device carries a distinct
 * token) and only fall back to IP for genuinely anonymous traffic. The token
 * is hashed and used ONLY as a rate-limit bucket key — it is never trusted for
 * authentication here.
 */
const natSafeClientKey = (req) => {
  if (req.user?._id) return `u:${req.user._id.toString()}`;
  const auth = req.get("authorization");
  const bearer = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const token = bearer || req.cookies?.access_token;
  if (token) {
    return `t:${crypto.createHash("sha1").update(token).digest("hex")}`;
  }
  return `ip:${req.ip}`;
};

// Redis store setup (optional - falls back to memory store)
let RedisStore = null;
let redisClient = null;

/**
 * Initialize Redis store for distributed rate limiting
 * Call this from index.js if you want to use Redis
 * @param {Object} client - Redis client instance
 */
const initRedisStore = async (client) => {
  try {
    const { RedisStore: RateLimitRedisStore } = require("rate-limit-redis");
    RedisStore = RateLimitRedisStore;
    redisClient = client;
    logger.info(
      "[RateLimiter] Redis store initialized for distributed rate limiting"
    );
  } catch (error) {
    logger.warn("[RateLimiter] Redis store not available, using memory store", {
      error: error.message,
    });
  }
};

/**
 * Create a rate limiter with custom options
 * Supports Redis store for distributed environments
 * @param {Object} options - Rate limiter options
 */
const createLimiter = (options) => {
  // Check if rate limiting is globally disabled
  if (process.env.RATE_LIMIT_ENABLED === 'false') {
    return (req, res, next) => next();
  }
  const limiterOptions = {
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    handler: (req, res) => {
      const lang =
        req.language || req.headers["accept-language"]?.split(",")[0] || "en";

      logger.warn("[RateLimiter] Rate limit exceeded", {
        ip: req.ip,
        path: req.path,
        userId: req.user?._id,
      });

      res.status(429).json({
        status: "error",
        message:
          options.message?.[lang] || options.message?.en || "Too many requests",
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
    // Key generator: use user ID for authenticated requests, IP for anonymous
    keyGenerator: (req) => {
      return req.user?._id?.toString() || req.ip;
    },
    // Skip rate limiting for super_admin and admin roles
    skip: (req) => {
      const userRole = req.user?.role;
      if (userRole === ROLES.SUPER_ADMIN || userRole === ROLES.ADMIN) {
        return true;
      }
      // Also skip health checks
      if (req.path.startsWith("/health")) {
        return true;
      }
      return options.skip ? options.skip(req) : false;
    },
    ...options,
  };

  // Use Redis store if available
  if (RedisStore && redisClient) {
    limiterOptions.store = new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix: `rl:${options.prefix || "api"}:`,
    });
  }

  return rateLimit(limiterOptions);
};

/**
 * General API Rate Limiter
 * 100 requests per 15 minutes
 */
const apiLimiter = createLimiter({
  windowMs: RATE_LIMIT.API.WINDOW_MS,
  max: RATE_LIMIT.API.MAX_REQUESTS,
  message: {
    en: "Too many requests, please try again later",
    ar: "طلبات كثيرة جداً، يرجى المحاولة لاحقاً",
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path.startsWith("/health");
  },
});

/**
 * Auth Endpoints Rate Limiter
 * 10 attempts per hour - strict for login/signup
 */
const authLimiter = createLimiter({
  windowMs: RATE_LIMIT.AUTH.WINDOW_MS,
  max: RATE_LIMIT.AUTH.MAX_REQUESTS,
  skipSuccessfulRequests: true, // Only count failed attempts
  message: {
    en: "Too many login attempts. Please try again later",
    ar: "محاولات تسجيل دخول كثيرة جداً. يرجى المحاولة لاحقاً",
  },
  keyGenerator: (req) => {
    // Rate limit by IP + email/phone combination
    const identifier = req.body?.email || req.body?.phoneNumber || "";
    return `${req.ip}-${identifier}`;
  },
});

/**
 * OTP Rate Limiter
 * 1 OTP per minute
 */
const otpLimiter = createLimiter({
  windowMs: RATE_LIMIT.OTP.WINDOW_MS,
  max: RATE_LIMIT.OTP.MAX_REQUESTS,
  message: {
    en: "Please wait before requesting another OTP",
    ar: "يرجى الانتظار قبل طلب رمز تحقق آخر",
  },
  keyGenerator: (req) => {
    // Rate limit by phone number
    return req.body?.phoneNumber || req.ip;
  },
});

/**
 * OTP Hourly Rate Limiter
 * 5 OTPs per hour
 */
const otpHourlyLimiter = createLimiter({
  windowMs: RATE_LIMIT.OTP.HOURLY_WINDOW_MS,
  max: RATE_LIMIT.OTP.HOURLY_MAX,
  message: {
    en: "Maximum OTP requests reached. Please try again in an hour",
    ar: "تم الوصول للحد الأقصى من رموز التحقق. يرجى المحاولة بعد ساعة",
  },
  keyGenerator: (req) => {
    return `hourly-${req.body?.phoneNumber || req.ip}`;
  },
});

/**
 * Password Reset Rate Limiter
 * 3 attempts per hour
 */
const passwordResetLimiter = createLimiter({
  windowMs: RATE_LIMIT.PASSWORD_RESET.WINDOW_MS,
  max: RATE_LIMIT.PASSWORD_RESET.MAX_REQUESTS,
  message: {
    en: "Too many password reset requests. Please try again later",
    ar: "طلبات استعادة كلمة المرور كثيرة جداً. يرجى المحاولة لاحقاً",
  },
  keyGenerator: (req) => {
    return req.body?.email || req.body?.phoneNumber || req.ip;
  },
});

/**
 * Refresh Token Rate Limiter (H-2)
 * 60 requests per minute per IP. /auth/refresh is called by every authenticated
 * tab/device on access-token expiry, so a strict per-user limit would break
 * legitimate concurrent web tabs + mobile. 60/min/IP is generous enough for
 * mobile + ~5 web tabs but cuts off brute-force enumeration of refresh tokens.
 *
 * Note: keyed by IP (not user) because successful refresh requests don't have
 * an authenticated user attached — the refresh token is the credential.
 */
const refreshLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: {
    en: "Too many refresh attempts. Please try again shortly",
    ar: "عدد كبير من محاولات تجديد الجلسة. يرجى المحاولة بعد قليل",
  },
  keyGenerator: (req) => req.ip,
  // Refresh path is never authenticated by `protect` (the access token is
  // typically expired) so we cannot rely on the role-based skip above.
  skip: (req) => req.path.startsWith('/health'),
});

/**
 * Webhook Rate Limiter
 * 30 requests per minute
 */
const webhookLimiter = createLimiter({
  windowMs: RATE_LIMIT.WEBHOOK.WINDOW_MS,
  max: RATE_LIMIT.WEBHOOK.MAX_REQUESTS,
  message: {
    en: "Webhook rate limit exceeded",
    ar: "تم تجاوز حد طلبات Webhook",
  },
});

/**
 * File Upload Rate Limiter
 * 20 uploads per 10 minutes
 */
const uploadLimiter = createLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  message: {
    en: "Too many file uploads. Please try again later",
    ar: "عمليات رفع كثيرة جداً. يرجى المحاولة لاحقاً",
  },
});

/**
 * Create Event Rate Limiter
 * 10 events per hour
 */
const createEventLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    en: "Too many events created. Please try again later",
    ar: "تم إنشاء مناسبات كثيرة جداً. يرجى المحاولة لاحقاً",
  },
  keyGenerator: (req) => {
    return req.user?._id?.toString() || req.ip;
  },
});

/**
 * Bulk Operation Rate Limiter
 * 5 bulk operations per hour
 */
const bulkOperationLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    en: "Too many bulk operations. Please try again later",
    ar: "عمليات جماعية كثيرة جداً. يرجى المحاولة لاحقاً",
  },
  keyGenerator: (req) => {
    return req.user?._id?.toString() || req.ip;
  },
});

/**
 * Global API Backstop Limiter (§3.2)
 * Generous ceiling mounted on every /api/v2 route as a blanket abuse backstop.
 * Deliberately high (1000 / 15 min) so it never throttles a normal interactive
 * session: authenticated traffic is keyed by user id, and unauthenticated
 * guest reads are keyed by IP where carrier-grade NAT can pool many real users
 * behind one address. Webhooks (Meta/RevenueCat/Moyasar) carry their own
 * limiter and are hit from provider IPs at higher volume, so they are skipped
 * here. Tight, security-sensitive limits live on the specific routes below.
 */
const globalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    en: "Too many requests, please slow down and try again shortly",
    ar: "طلبات كثيرة جداً، يرجى التمهل والمحاولة بعد قليل",
  },
  keyGenerator: natSafeClientKey,
  skip: (req) =>
    req.path.startsWith("/health") || req.path.includes("/webhook"),
});

/**
 * Account Deletion Rate Limiter (§3.2 / §4)
 * 5 attempts per hour. Deletion is reauthenticated and irreversible, so it is
 * keyed by the authenticated user id (NAT-safe).
 */
const deletionLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    en: "Too many account-deletion attempts. Please try again later",
    ar: "محاولات حذف حساب كثيرة جداً. يرجى المحاولة لاحقاً",
  },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
});

/**
 * Purchase / Payment Rate Limiter (§3.2)
 * 15 attempts per 10 minutes for paid actions (addon purchase, checkout,
 * subscription reconcile). Authenticated → keyed by user id.
 */
const purchaseLimiter = createLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15,
  message: {
    en: "Too many payment attempts. Please try again shortly",
    ar: "محاولات دفع كثيرة جداً. يرجى المحاولة بعد قليل",
  },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
});

/**
 * UGC Report Rate Limiter (§6)
 * 20 reports per hour. Prevents report-spam/brigading of a moderation queue.
 * Keyed by authenticated user id, falling back to IP for guest reporters.
 */
const reportLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    en: "Too many reports submitted. Please try again later",
    ar: "تم إرسال عدد كبير من البلاغات. يرجى المحاولة لاحقاً",
  },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
});

module.exports = {
  apiLimiter,
  authLimiter,
  refreshLimiter,
  otpLimiter,
  otpHourlyLimiter,
  passwordResetLimiter,
  webhookLimiter,
  uploadLimiter,
  createEventLimiter,
  bulkOperationLimiter,
  globalLimiter,
  deletionLimiter,
  purchaseLimiter,
  reportLimiter,
  // Utility functions
  createLimiter,
  initRedisStore,
};
