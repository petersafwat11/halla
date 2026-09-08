/**
 * @halaa-checkin/api
 * Express application factory.
 * Pure factory with no listen or background worker side effects.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { ERROR_CODES, createErrorEnvelope } from '@halaa-checkin/contracts';
import { config as defaultConfig } from './config.js';
import { requestIdMiddleware, errorHandler } from './middleware/errors.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { createCsrfMiddleware } from './middleware/csrf.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createEventsRouter } from './modules/events/events.routes.js';
import { verifyIndexes } from './db/indexes.js';

/**
 * Express application factory for Halaa Guest Check-in API.
 *
 * @param {object} [deps={}] - Dependency overrides for testing
 * @param {object} [deps.config] - Optional configuration overrides
 * @returns {express.Application}
 */
export function createApp(deps = {}) {
  const app = express();
  const cfg = { ...defaultConfig, ...deps.config };

  // 1. Proxy trust
  if (cfg.trustProxyHops > 0) {
    app.set('trust proxy', cfg.trustProxyHops);
  }

  // 2. Request ID and security headers
  app.use(requestIdMiddleware);
  app.use(
    helmet({
      contentSecurityPolicy: false, // Managed by reverse proxy
      crossOriginResourcePolicy: { policy: 'same-site' },
    })
  );

  // 3. CORS
  app.use(
    cors({
      origin: cfg.appOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Requested-With', 'Idempotency-Key'],
    })
  );

  // 4. Cookie parser and JSON body parser
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // 5. Root health probe (simple orchestrator liveness)
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'checkin-api' });
  });

  // 6. Session resolution
  app.use(createAuthMiddleware(cfg));

  // 7. CSRF and Origin protection on mutation routes
  app.use(createCsrfMiddleware(cfg));

  // 8. API router under /api/checkin/v1
  const apiRouter = express.Router();

  // Health and liveness/readiness
  apiRouter.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'checkin-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  apiRouter.get('/health/live', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'checkin-api' });
  });

  apiRouter.get('/health/ready', async (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    if (!isDbConnected) {
      return res.status(503).json(
        createErrorEnvelope({
          code: ERROR_CODES.SERVICE_UNAVAILABLE,
          message: 'Database connection not ready',
          requestId: req.id || '',
        })
      );
    }

    try {
      await verifyIndexes();
      return res.status(200).json({ status: 'ready', service: 'checkin-api' });
    } catch (err) {
      return res.status(503).json(
        createErrorEnvelope({
          code: ERROR_CODES.SERVICE_UNAVAILABLE,
          message: `Database readiness check failed: ${err.message}`,
          requestId: req.id || '',
        })
      );
    }
  });

  // Mount Auth routes
  apiRouter.use('/auth', createAuthRouter({ config: cfg, loginLimiter: deps.loginLimiter }));

  // Mount Events routes (including nested guests router)
  apiRouter.use('/events', createEventsRouter());

  // Allow custom/test route registration
  if (typeof deps.registerRoutes === 'function') {
    deps.registerRoutes({ app, apiRouter });
  }

  // Mount API router
  app.use(cfg.apiPrefix, apiRouter);

  // 9. 404 Handler
  app.use((req, res) => {
    res.status(404).json(
      createErrorEnvelope({
        code: ERROR_CODES.NOT_FOUND,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        requestId: req.id || '',
      })
    );
  });

  // 10. Centralized Error Handler
  app.use(errorHandler);

  return app;
}
