/**
 * Idempotency middleware.
 *
 * Reads the `Idempotency-Key` header on POST/PUT/PATCH requests. On the
 * first call we insert a `pending` row keyed on `{ userId, scope, key }`
 * (race-safe via upsert). When the handler resolves with a 2xx we update
 * the row to `completed` and cache `{ status, body }`. If the handler
 * throws or returns non-2xx, we delete the row so the next attempt can
 * retry cleanly.
 *
 * Concurrent duplicates with the same `requestHash` poll the row until it
 * transitions to `completed` (replay) or times out (409 + Retry-After).
 * Mismatched `requestHash` always returns 409.
 *
 * Cache contract: only `{ status, body }` is stored. Replay loses
 * `Set-Cookie` and `Location` headers — accepted per design (M-2).
 *
 * Usage:
 *   router.post(
 *     "/purchase",
 *     protect,
 *     idempotency({ scope: "addons.purchase" }),
 *     addonsController.purchaseAddon
 *   );
 */

const IdempotencyKey = require("../../../models/IdempotencyKeyModel");
const { _sha256 } = require("../utils/idempotency");
const fileUpload = require("../utils/fileUpload");

const HEADER = "idempotency-key";
const POLL_INTERVAL_MS = 200;
const POLL_TIMEOUT_MS = 10_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cleanupUploadedFile = (req) => {
  if (!req?.file) return;
  const cleanup = req.file.key
    ? fileUpload.s3Upload?.deleteFromS3?.(req.file.key)
    : fileUpload.deleteFile?.(req.file.location || req.file.path || req.file.filename);
  Promise.resolve(cleanup).catch(() => {});
};

const idempotency = ({ scope = "", required = false } = {}) => {
  return async function idempotencyMiddleware(req, res, next) {
    if (!["POST", "PUT", "PATCH"].includes(req.method)) {
      return next();
    }

    const key = req.get(HEADER);
    if (!key) {
      if (required) {
        return res.status(400).json({
          status: "error",
          code: "IDEMPOTENCY_KEY_REQUIRED",
          message: "Idempotency-Key header is required",
          requestId: req.requestId || null,
        });
      }
      return next();
    }

    const payloadToHash = req.file
      ? { ...req.body, _fileMeta: { name: req.file.originalname, size: req.file.size } }
      : (req.body || {});
    const requestHash = _sha256(payloadToHash);
    const userId = req.user?._id || null;
    const filter = { userId, scope, key };

    // Race-safe reservation: upsert a pending row. If we lose the race the
    // upsert returns the existing document; if we win, we get null in
    // `value` and `updatedExisting === false`.
    let reservation;
    try {
      reservation = await IdempotencyKey.findOneAndUpdate(
        filter,
        {
          $setOnInsert: {
            userId,
            scope,
            key,
            requestHash,
            status: "pending",
            createdAt: new Date(),
          },
        },
        { upsert: true, new: false, setDefaultsOnInsert: true, includeResultMetadata: true }
      );
    } catch (err) {
      // Duplicate-key races against the unique index can leak through —
      // surface as the same code path as "existing row found".
      if (err.code === 11000) {
        reservation = {
          lastErrorObject: { updatedExisting: true },
          value: await IdempotencyKey.findOne(filter),
        };
      } else {
        return next(err);
      }
    }

    const updatedExisting = reservation?.lastErrorObject?.updatedExisting === true;
    const existing = reservation?.value || null;

    if (updatedExisting && existing) {
      // Mismatched body always 409.
      if (existing.requestHash && existing.requestHash !== requestHash) {
        cleanupUploadedFile(req);
        return res.status(409).json({
          status: "error",
          code: "IDEMPOTENCY_CONFLICT",
          message: "Idempotency-Key reused with a different body",
          requestId: req.requestId || null,
        });
      }

      if (existing.status === "completed" && existing.response) {
        cleanupUploadedFile(req);
        return res.status(existing.response.status).json(existing.response.body);
      }

      if (existing.status === "failed") {
        // Sweep stale failure and retry the request from scratch.
        await IdempotencyKey.deleteOne({ _id: existing._id, status: "failed" }).catch(
          () => {}
        );
        return idempotencyMiddleware(req, res, next);
      }

      // status === 'pending' — poll for completion.
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await sleep(POLL_INTERVAL_MS);
        const refreshed = await IdempotencyKey.findOne(filter);
        if (!refreshed) break; // peer failed and deleted; retry.
        if (refreshed.status === "completed" && refreshed.response) {
          cleanupUploadedFile(req);
          return res.status(refreshed.response.status).json(refreshed.response.body);
        }
        if (refreshed.status === "failed") {
          await IdempotencyKey.deleteOne({ _id: refreshed._id, status: "failed" }).catch(
            () => {}
          );
          return idempotencyMiddleware(req, res, next);
        }
      }
      cleanupUploadedFile(req);
      res.set("Retry-After", "1");
      return res.status(409).json({
        status: "error",
        code: "IDEMPOTENCY_PENDING_TIMEOUT",
        message: "A duplicate request with this Idempotency-Key is still being processed",
        requestId: req.requestId || null,
      });
    }

    // We inserted the pending row; we own this key. Capture the response
    // payload to update the row after the handler resolves.
    const originalJson = res.json.bind(res);
    let responded = false;

    res.json = (body) => {
      responded = true;
      const status = res.statusCode;
      if (status >= 200 && status < 300) {
        let serializedBody = body;
        try {
          serializedBody = JSON.parse(JSON.stringify(body));
        } catch {
          // fallback to body if JSON serialization fails
        }
        IdempotencyKey.updateOne(filter, {
          $set: {
            status: "completed",
            response: { status, body: serializedBody },
            completedAt: new Date(),
          },
        }).catch((err) => {
          // eslint-disable-next-line no-console
          console.error("[idempotency] cache write failed:", err.message);
        });
      } else {
        // Non-2xx → drop the pending row so the next attempt can retry.
        IdempotencyKey.deleteOne(filter).catch(() => {});
      }
      return originalJson(body);
    };

    // Surface handler errors so we can clean up the pending row.
    res.on("close", () => {
      if (!responded) {
        IdempotencyKey.deleteOne(filter).catch(() => {});
      }
    });

    try {
      return next();
    } catch (err) {
      await IdempotencyKey.deleteOne(filter).catch(() => {});
      throw err;
    }
  };
};

module.exports = { idempotency };
