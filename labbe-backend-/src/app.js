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
const swaggerUi = require("swagger-ui-express");

const config = require("./config");
const swaggerSpec = require("./config/swagger");
const { globalErrorHandler, AppError } = require("./shared/errors");

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

/**
 * Create Express application
 * @returns {express.Application}
 */
const createApp = () => {
  const app = express();

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
  // M-12: this allowlist must stay in sync with the auth cookie's SameSite
  // setting (`auth.controller.js` → `accessCookieOptions`). We use
  // `SameSite=Lax` + `credentials: true`, which means:
  //   - The browser will send the auth cookie on top-level navigations from
  //     any origin (safe for the API because all state-changing routes are
  //     POST/PATCH/DELETE, which Lax does NOT auto-include cross-site).
  //   - The browser will send the auth cookie on XHR/fetch only when the
  //     calling origin is in this allowlist AND the request includes
  //     `credentials: 'include'`.
  // If we ever need a third-party origin to call the API with cookies we
  // must switch to `SameSite=None; Secure` and add a CSRF double-submit
  // token; do NOT bypass that decision by widening this list silently.
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8081',
    'http://10.0.2.2:8081',
    'https://labbe.vercel.app',
    config.frontend.url,
  ].filter(Boolean);

  app.use(
    cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          /\.halaa\.sa$/.test(origin) ||
          /^https:\/\/labbe(-[a-z0-9]+)?\.vercel\.app$/.test(origin)
        ) {
          return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Request-ID"],
    })
  );

  // ============================================
  // BODY PARSING
  // ============================================

  // H-19: WhatsApp webhook signature is computed by Meta over the *raw*
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
  app.use(
    express.json({
      limit: "10kb",
      verify: captureRawForWebhook,
    })
  );
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
      status: "success",
      message: "Server is healthy",
      timestamp: new Date().toISOString(),
      environment: config.env,
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

  // Mount new modular routes under /api/v2 AND /api (for backward compatibility)
  const mountRoutes = (prefix) => {
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
  };

  mountRoutes('/api/v2');
  mountRoutes('/api');
  // Routes are now mounted via mountRoutes helper


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
