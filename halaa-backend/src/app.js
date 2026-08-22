/**
 * Express Application Setup
 * Clean app configuration using new modular structure
 * @module app
 */

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const compression = require("compression");
const path = require("path");
const crypto = require("crypto");
const swaggerUi = require("swagger-ui-express");

const config = require("./config");
const swaggerSpec = require("./config/swagger");
const { globalErrorHandler, AppError } = require("./shared/errors");
const { globalLimiter } = require("./shared/middleware/rateLimiter");
const { getReadiness } = require("./shared/utils/readiness");

// Module routes
const { authRoutes } = require("./modules/auth");
const { usersRoutes } = require("./modules/users");
const { subscriptionsRoutes } = require("./modules/subscriptions");
const { eventsRoutes } = require("./modules/events");
const { notificationsRoutes } = require("./modules/notifications");
const { ticketsRoutes } = require("./modules/tickets");
const { staffRoutes } = require("./modules/staff");
const { guestsRoutes } = require("./modules/guests");
const { dashboardRoutes } = require("./modules/dashboard");
const { postEventRoutes } = require("./modules/post-event");
const { plansRoutes } = require("./modules/plans");
const { locationsRoutes } = require("./modules/locations");
const { vendorsRoutes } = require("./modules/vendors");
const { servicesRoutes } = require("./modules/services");
const { routes: messagingRoutes } = require("./modules/messaging");
const { routes: adminRoutes } = require("./modules/admin");
const { discountsRoutes } = require("./modules/discounts");
const addonsRoutes = require("./modules/addons/addons.routes");
const { routes: paymentsRoutes } = require("./modules/payments");
const businessRoutes = require("./modules/business/business.routes");
const { routes: moderationRoutes } = require("./modules/moderation");
// Taqnyat-template cache + sync + admin assignment
// (public list + admin sub-router under /admin/taqnyat-templates).
const taqnyatTemplatesModule = require("./modules/taqnyat-templates");
// Visual templates + categories + fonts.
const templatesModule = require("./modules/templates");

/**
 * Create Express application
 * @returns {express.Application}
 */
const createApp = () => {
  const app = express();

  // Correlate every client-visible failure with one backend log entry. Accept
  // a well-formed upstream id (nginx/load balancer) or mint a fresh UUID.
  app.use((req, res, next) => {
    const incoming = req.get('x-request-id');
    req.requestId =
      incoming && /^[A-Za-z0-9._:-]{8,128}$/.test(incoming)
        ? incoming
        : crypto.randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    next();
  });

  // Trust the reverse proxy (nginx) in front of the app so `req.ip` is the
  // real client IP from X-Forwarded-For rather than the proxy's address.
  // Without this, every IP-keyed rate limiter and login-lockout buckets all
  // traffic under the single proxy IP. `1` = trust exactly one proxy hop.
  app.set("trust proxy", 1);

  // ============================================
  // SECURITY MIDDLEWARE
  // ============================================

  // Set security HTTP headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  // CORS configuration
  //
  // PRODUCTION: web frontend (Next.js) and backend (Express) are deployed
  // to the SAME VPS — typically behind a single nginx reverse proxy on
  // the same hostname (e.g. nginx routes `/` to Next.js and `/api` to
  // Express). Same-origin → cookies travel automatically; CORS is
  // technically not needed for the production app at all.
  //
  // We still keep CORS configured because:
  //   - the React Native app calls the API from a different origin
  //     (literally no origin header in many cases)
  //   - dev workflows run web on :3000 and API on :3001
  //   - admin tools / staging previews may legitimately need it
  //
  // Cookie attributes (set in auth.controller.js):
  //   `SameSite=Lax`  — allows top-level GETs to carry the cookie (so
  //                     Next.js SSR can read it on initial page load) but
  //                     blocks cross-site form POSTs. CSRF risk is
  //                     therefore limited to top-level GETs, none of
  //                     which mutate state in this API.
  //   `Secure: true`  — only set in production (over HTTPS).
  //   `HttpOnly: true`— JS cannot read the access/refresh tokens.
  //
  // We do NOT use SameSite=Strict because the dev mobile workflow
  // (`exp://10.0.2.2:8081`) hits the API directly with credentials and
  // Strict would drop the cookie on every request from those origins.
  // Lax + this allowlist is the right compromise.
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8081',   // Expo metro / dev web
    'http://localhost:19006',  // Expo web (legacy webpack)
    'http://localhost:19000',  // Expo dev tools (legacy)
    'http://10.0.2.2:8081',    // Android emulator → host loopback
    config.frontend.url,       // production web origin (https://halaa.com.sa)
  ].filter(Boolean);

  // LAN-IP origin for Expo dev when running the app on a physical device
  // (Metro serves at http://<host-lan-ip>:8081). The RN runtime usually
  // omits the Origin header on `fetch`, but Expo web preview running in a
  // browser on the same LAN sends it, so we whitelist private ranges.
  const lanExpoOrigin = /^http:\/\/(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)\d+\.\d+:(?:8081|19006)$/;

  app.use(
    cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (native mobile apps, curl, Postman, etc.)
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          /\.halaa\.(?:com\.)?sa$/.test(origin) ||
          lanExpoOrigin.test(origin)
        ) {
          return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Request-ID"],
      exposedHeaders: ["X-Request-ID"],
    })
  );

  // ============================================
  // BODY PARSING
  // ============================================

  // WhatsApp webhook signature is computed by Meta over the *raw*
  // request bytes. Once `express.json()` re-serialises the parsed body,
  // key ordering and whitespace diverge from what Meta signed and HMAC
  // verification false-negatives on legit traffic. We capture the raw
  // payload into `req.rawBody` for the webhook route only — `verify` runs
  // before JSON parsing finishes, so the buffer is the actual on-the-wire
  // bytes.
  const captureRawForWebhook = (req, _res, buf) => {
    if (req.originalUrl && req.originalUrl.includes("/messaging/webhook")) {
      req.rawBody = buf;
    }
  };
  // The API stays tightly capped at 10kb, but store webhooks (RevenueCat) can
  // carry larger payloads (subscriber attributes, aliases, offering metadata),
  // so the RC webhook route gets a higher limit to avoid 413 → infinite retries.
  const standardJson = express.json({ limit: "10kb", verify: captureRawForWebhook });
  const webhookJson = express.json({ limit: "1mb", verify: captureRawForWebhook });
  app.use((req, res, next) => {
    if (
      req.originalUrl &&
      req.originalUrl.includes("/payments/revenuecat/webhook")
    ) {
      return webhookJson(req, res, next);
    }
    return standardJson(req, res, next);
  });
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));
  app.use(cookieParser());

  // Data sanitization against NoSQL query injection
  app.use(mongoSanitize());

  // Compression
  app.use(compression());

  // ============================================
  // STATIC FILES
  // ============================================

  app.use(
    "/uploads",
    express.static(path.join(__dirname, "../public/uploads"))
  );

  // ============================================
  // DEVELOPMENT LOGGING
  // ============================================

  if (config.isDev) {
    const morgan = require("morgan");
    app.use(morgan("dev"));
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  app.get("/health", (req, res) => {
    res.status(200).json({
      success: true,
      status: "success",
      message: "Server is healthy",
      timestamp: new Date().toISOString(),
      environment: config.env,
    });
  });

  // Readiness probe (§3.2): reports DB connectivity, required-secret presence,
  // and allowed-origin config. Returns 503 when not ready so an orchestrator /
  // load balancer can keep an incompletely-configured instance out of
  // rotation. Never leaks secret values — only which keys are missing.
  app.get("/health/ready", (req, res) => {
    const result = getReadiness();
    res.status(result.ready ? 200 : 503).json({
      status: result.ready ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      environment: config.env,
      checks: result.checks,
    });
  });

  // ============================================
  // API DOCUMENTATION (Swagger)
  // ============================================

  // Swagger UI setup - only in development
  if (config.isDev) {
    const swaggerOptions = {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Halaa API Documentation',
    };

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

    app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
  }

  // ============================================
  // API ROUTES (New Modular Structure)
  // ============================================

  // Mount routes under /api/v2 only.
  const mountRoutes = (prefix) => {
    // Global abuse backstop on every API route (§3.2). Generous, NAT-safe
    // keying (by token/user, falling back to IP) and skips health + webhooks.
    // Tight, security-sensitive limits live on the specific routes themselves.
    app.use(prefix, globalLimiter);
    app.use(`${prefix}/auth`, authRoutes);
    app.use(`${prefix}/users`, usersRoutes);
    app.use(`${prefix}/subscriptions`, subscriptionsRoutes);
    app.use(`${prefix}/events`, eventsRoutes);
    app.use(`${prefix}/notifications`, notificationsRoutes);
    app.use(`${prefix}/tickets`, ticketsRoutes);
    app.use(`${prefix}/staff`, staffRoutes);
    app.use(`${prefix}/guests`, guestsRoutes);
    app.use(`${prefix}/dashboard`, dashboardRoutes);
    app.use(`${prefix}/post-event`, postEventRoutes);
    app.use(`${prefix}/plans`, plansRoutes);
    app.use(`${prefix}/locations`, locationsRoutes);
    app.use(`${prefix}/vendors`, vendorsRoutes);
    app.use(`${prefix}/services`, servicesRoutes);
    app.use(`${prefix}/messaging`, messagingRoutes);
    app.use(`${prefix}/admin`, adminRoutes);
    app.use(`${prefix}/discounts`, discountsRoutes);
    app.use(`${prefix}/addons`, addonsRoutes);
    app.use(`${prefix}/payments`, paymentsRoutes);
    app.use(`${prefix}/business`, businessRoutes);
    app.use(`${prefix}/moderation`, moderationRoutes);
    // Visual templates + categories + Taqnyat templates.
    // Admin sub-routers are mounted under /admin/<resource> alongside
    // the public host-facing routers under /<resource>.
    app.use(`${prefix}/templates`, templatesModule.routes);
    app.use(`${prefix}/admin/templates`, templatesModule.adminRoutes);
    app.use(`${prefix}/template-categories`, templatesModule.categoriesRoutes);
    app.use(`${prefix}/admin/template-categories`, templatesModule.adminCategoriesRoutes);
    app.use(`${prefix}/taqnyat-templates`, taqnyatTemplatesModule.routes);
    app.use(`${prefix}/admin/taqnyat-templates`, taqnyatTemplatesModule.adminRoutes);
    app.use(`${prefix}/fonts`, templatesModule.fontsRoutes);
  };

  mountRoutes('/api/v2');


  // ============================================
  // 404 HANDLER
  // ============================================

  app.all("*", (req, res, next) => {
    const sanitizedUrl = req.originalUrl.replace(/[<>"'&]/g, '');
    next(new AppError(`Cannot find ${sanitizedUrl} on this server`, 404));
  });

  // ============================================
  // GLOBAL ERROR HANDLER
  // ============================================

  app.use(globalErrorHandler);

  return app;
};

module.exports = createApp;
