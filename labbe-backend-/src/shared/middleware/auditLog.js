/**
 * Audit log middleware.
 *
 * Phase 1b foundation — wires the existing `AuditLogModel` (which was
 * present but never written to). Wraps a route handler and writes an
 * audit entry **after** the handler successfully responds. We never
 * mutate the response or block on the log write: failures are logged to
 * stderr and dropped.
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

const { logAudit } = require("../utils/auditLog");

/**
 * @param {Object} opts
 * @param {string} opts.action            - dot-notation action key
 * @param {string} [opts.targetType]
 * @param {(req:Object, res:Object) => string} [opts.targetIdFrom]
 * @param {(req:Object, res:Object) => Object} [opts.changesFrom]
 * @param {(req:Object, res:Object) => Object} [opts.metadataFrom]
 */
const auditLog = (opts) => {
  if (!opts || !opts.action) {
    throw new Error("auditLog: `action` is required");
  }

  return function auditLogMiddleware(req, res, next) {
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
        console.error("[auditLog] write failed:", err.message);
      });
    });

    next();
  };
};

module.exports = { auditLog };
