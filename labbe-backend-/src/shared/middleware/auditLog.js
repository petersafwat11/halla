/**
 * Audit log middleware.
 *
 * Phase 1b foundation — wires the existing `AuditLogModel` (which was
 * present but never written to). Wraps a route handler and writes an
 * audit entry **after** the handler successfully responds. We never
 * mutate the response or block on the log write: failures are logged to
 * stderr and dropped.
 *
 * Phase 1b production-readiness fixes:
 *   - H-9: support a `captureBefore` async hook that runs PRE-handler so
 *     the audit row can record the prior state of the resource. The
 *     before-state is stashed on `res.locals.auditBefore` and merged into
 *     the `changes` object alongside whatever `changesFrom` returns.
 *   - M-8: walk every `changes`/`metadata` payload through a sensitive-
 *     field redactor before writing the audit row. Today the middleware
 *     fails open (warn-only) on log-write errors; that's intentional but
 *     TODO Phase 5 — flip to fail-closed for compliance once ops have a
 *     bypass path.
 *
 * Usage:
 *
 *     router.patch(
 *       "/admin/vendors/:id/status",
 *       requirePageAccess(...),
 *       auditLog({
 *         action: "vendor.status_change",
 *         targetType: "user",
 *         targetIdFrom: (req) => req.params.id,
 *         captureBefore: async (req) =>
 *           User.findById(req.params.id).select("status").lean()
 *             .then((u) => u?.status),
 *         changesFrom: (req, res) => ({
 *           after: { status: req.body.status },
 *         }),
 *       }),
 *       adminController.updateVendorStatus
 *     );
 *
 * The `*From` callbacks let the caller derive log fields from the request
 * or response object. They are run inside a try/catch.
 */

const { logAudit, redactSensitive } = require("../utils/auditLog");

/**
 * @param {Object} opts
 * @param {string} opts.action            - dot-notation action key
 * @param {string} [opts.targetType]
 * @param {(req:Object, res:Object) => string} [opts.targetIdFrom]
 * @param {(req:Object) => Promise<*>} [opts.captureBefore] - pre-handler hook
 * @param {(req:Object, res:Object) => Object} [opts.changesFrom]
 * @param {(req:Object, res:Object) => Object} [opts.metadataFrom]
 */
const auditLog = (opts) => {
  if (!opts || !opts.action) {
    throw new Error("auditLog: `action` is required");
  }

  return async function auditLogMiddleware(req, res, next) {
    // H-9: snapshot the resource BEFORE the handler runs so we have a
    // before-image to pair with the after-image. Failures here must not
    // block the request — fall through with `auditBefore` undefined.
    if (typeof opts.captureBefore === "function") {
      try {
        const before = await opts.captureBefore(req);
        res.locals = res.locals || {};
        res.locals.auditBefore = before;
      } catch (e) {
        console.error("[auditLog] captureBefore failed:", e.message);
      }
    }

    res.on("finish", () => {
      // Skip audit on non-success responses.
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      let targetId;
      let changes;
      let metadata;
      try {
        targetId = opts.targetIdFrom ? opts.targetIdFrom(req, res) : undefined;
        changes = opts.changesFrom ? opts.changesFrom(req, res) : undefined;
        metadata = opts.metadataFrom ? opts.metadataFrom(req, res) : undefined;
      } catch (e) {
        // Caller-supplied derivation threw — log a degraded entry.
        console.error("[auditLog] derivation error:", e.message);
      }

      // H-9: merge captured before-state into the changes payload. If the
      // caller already set `changes.before`, prefer their value.
      if (res.locals && res.locals.auditBefore !== undefined) {
        changes = changes || {};
        if (changes.before === undefined) {
          changes.before = res.locals.auditBefore;
        }
      }

      // M-8: redact any sensitive fields (passwords, tokens, etc.) before
      // the row hits Mongo. Fail-open is preserved on the underlying
      // logAudit call.
      changes = redactSensitive(changes);
      metadata = redactSensitive(metadata);

      logAudit({
        action: opts.action,
        actor: req.user,
        targetType: opts.targetType,
        targetId,
        whitelabelId: req.whitelabelId || req.user?.whitelabelId || null,
        changes,
        metadata,
        request: {
          method: req.method,
          path: req.originalUrl || req.url,
          requestId: req.get("x-request-id") || undefined,
        },
        ip: req.ip,
        userAgent: req.get("user-agent") || "",
      }).catch((err) => {
        // M-8 (fail-open, by design): audit logging must never break the
        // primary action. TODO Phase 5: switch to fail-closed for
        // compliance once we have a documented break-glass path.
        console.error("[auditLog] write failed:", err.message);
      });
    });

    next();
  };
};

module.exports = { auditLog };
