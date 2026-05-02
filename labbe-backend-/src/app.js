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

  app.use(express.json({ limit: "10kb" }));
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
