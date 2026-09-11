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
import { createApiRateLimiter } from './middleware/rateLimits.js';
import { checkReplicaSet } from './db/connection.js';
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
  // F15: allow bounded JSON transport overhead above the 2 MB decoded CSV cap.
  // The service still enforces the 2 MB decoded CSV limit; this only prevents
  // an otherwise-allowed CSV from failing on JSON quoting/escaping overhead.
  app.use(cookieParser());
  const jsonParser = express.json({ limit: '2mb' });
  const importJsonParser = express.json({ limit: '13mb' });
  app.use((req, res, next) => {
    // A 2 MiB decoded CSV can expand sixfold under JSON escaping.
    const parser = /\/imports\/(preview|commit)$/.test(req.path) ? importJsonParser : jsonParser;
    parser(req, res, next);
  });
  app.use(express.urlencoded({ extended: true, limit: '3mb' }));

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
      const hasReplicaSet = await checkReplicaSet();
      if (!hasReplicaSet) {
        return res.status(503).json(
          createErrorEnvelope({
            code: ERROR_CODES.SERVICE_UNAVAILABLE,
            message: 'Database transaction support not ready (replica set required)',
            requestId: req.id || '',
          })
        );
      }
      // PDF worker degradation: export creation depends on a launchable browser.
      // Gate admission does not, but readiness must reflect degraded exports.
      // F23: never expose raw renderer filesystem/exception details publicly.
      if (deps.workerHealth) {
        try {
          const workerOk = await deps.workerHealth();
          if (!workerOk) {
            return res.status(503).json(
              createErrorEnvelope({
                code: ERROR_CODES.SERVICE_UNAVAILABLE,
                message: 'Export renderer unavailable',
                requestId: req.id || '',
              })
            );
          }
        } catch (err) {
          console.error(`[readiness] export renderer check failed: ${err?.message || err}`);
          return res.status(503).json(
            createErrorEnvelope({
              code: ERROR_CODES.SERVICE_UNAVAILABLE,
              message: 'Export renderer unavailable',
              requestId: req.id || '',
            })
          );
        }
      }
      return res.status(200).json({ status: 'ready', service: 'checkin-api' });
    } catch (err) {
      // F23: never expose raw readiness exception messages or renderer paths.
      console.error(`[readiness] check failed: ${err?.message || err}`);
      return res.status(503).json(
        createErrorEnvelope({
          code: ERROR_CODES.SERVICE_UNAVAILABLE,
          message: 'Service temporarily unavailable',
          requestId: req.id || '',
        })
      );
    }
  });

  // General API rate limit (bounded; allows two concurrent receptionists).
  // Health probes above stay unthrottled; test env uses a high ceiling.
  const apiLimiter =
    deps.apiLimiter ||
    (cfg.env === 'test'
      ? createApiRateLimiter({ max: 1000 })
      : createApiRateLimiter());
  apiRouter.use(apiLimiter);

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
