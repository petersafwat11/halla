/**
 * @halaa-checkin/api
 * Exports Service.
 * Manages PDF export job creation, immutable snapshot capture, queue rate limiting,
 * artifact download authorization, QR preview generation, and artifact lifecycle cleanup.
 * Adheres to Technical Contract Sections 3 & 7 and Product Section 7.
 */

import path from 'node:path';
import fs from 'node:fs';
import {
  ERROR_CODES,
  DomainError,
  LIMITS,
  REGEXES,
  EXPORT_KINDS,
  EXPORT_SCOPES,
  exportCreateSchema,
} from '@halaa-checkin/contracts';
import { ExportJob } from './exportJob.model.js';
import { Event } from '../events/event.model.js';
import { Guest } from '../guests/guest.model.js';
import { withTransaction } from '../../db/transaction.js';
import { AuditService } from '../audit/audit.service.js';
import { generateQrDataUrl } from './qrGenerator.js';
import { config } from '../../config.js';
import { ensureExportQueueFence, lockExportQueue } from './exportQuota.js';
import { exportWorker, checkWorkerHealth } from './exports.worker.js';

export const ExportsService = {
  /**
   * Create an asynchronous PDF export job.
   * Enforces global (10) and per-admin (3) queue bounds, creates an immutable
   * snapshot of event and guest records within a replica-set transaction, and
   * enqueues the job for the PDF rendering worker.
   *
   * @param {string} eventId - Event ObjectId
   * @param {object} payload - Validated by exportCreateSchema
   * @param {object} user - Authenticated user
   * @param {object} [context]
   * @param {string} [context.requestId]
   * @returns {Promise<{ id: string, state: string, snapshotAt: string }>}
   */
  async createExportJob(eventId, payload, user, { requestId } = {}) {
    if (!REGEXES.OBJECT_ID.test(eventId)) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Event not found',
        status: 404,
      });
    }

    // Parse and validate payload with contracts schema (outside transaction is fine).
    const parsed = exportCreateSchema.parse(payload);

    // F23: verify worker/renderer availability before accepting jobs; gate
    // admission never runs inside this queue. Returns bounded 503 when exports
    // cannot run.
    try {
      if (checkWorkerHealth) {
        const healthy = await checkWorkerHealth({ exportDir: config.export.dir });
        if (!healthy) {
          throw new DomainError({
            code: ERROR_CODES.SERVICE_UNAVAILABLE,
            message: 'Export service temporarily unavailable. Please try again shortly.',
            status: 503,
          });
        }
      }
    } catch (err) {
      if (err instanceof DomainError && err.status === 503) throw err;
      // Health check itself failed → degrade safely, keep gate available.
      throw new DomainError({
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
        message: 'Export service temporarily unavailable. Please try again shortly.',
        status: 503,
      });
    }

    await ensureExportQueueFence();
    const result = await withTransaction(async (session) => {
        await lockExportQueue(session);
        const totalActiveJobs = await ExportJob.countDocuments({
          state: { $in: ['queued', 'running'] },
          expiresAt: { $gt: new Date() },
        }).session(session);
        if (totalActiveJobs >= LIMITS.MAX_EXPORT_QUEUE_TOTAL) {
          throw new DomainError({
            code: ERROR_CODES.RATE_LIMITED,
            message: 'Global export queue limit reached. Please try again shortly.',
            status: 429,
          });
        }

        const adminActiveJobs = await ExportJob.countDocuments({
          createdBy: user._id || user.id,
          state: { $in: ['queued', 'running'] },
          expiresAt: { $gt: new Date() },
        }).session(session);
        if (adminActiveJobs >= LIMITS.MAX_EXPORT_QUEUE_PER_ADMIN) {
          throw new DomainError({
            code: ERROR_CODES.RATE_LIMITED,
            message: 'You have reached the limit of concurrent export jobs. Please wait for existing exports to complete.',
            status: 429,
          });
        }

        // F20: event read inside the transaction snapshot.
        const event = await Event.findById(eventId).session(session);
        if (!event || event.purgingAt) {
          throw new DomainError({
            code: ERROR_CODES.NOT_FOUND,
            message: 'Event not found',
            status: 404,
          });
        }
        // Serialize snapshot creation against purge as well as event edits.
        const fenced = await Event.updateOne({ _id: eventId, purgingAt: null }, { $inc: { activitySeq: 1 } }, { session });
        if (fenced.matchedCount !== 1) throw new DomainError({ code: ERROR_CODES.NOT_FOUND, status: 404, message: 'Event not found' });
        const snapshotAt = new Date();

      let guests = [];
      const isReport = parsed.kind === EXPORT_KINDS.REPORT;

      if (parsed.kind === EXPORT_KINDS.QR) {
        if (parsed.scope === EXPORT_SCOPES.SELECTED) {
          const foundGuests = await Guest.find({
            _id: { $in: parsed.guestIds },
            eventId: event._id,
            deletedAt: null,
          })
            .select('+qrToken')
            .session(session);

          if (foundGuests.length !== parsed.guestIds.length) {
            throw new DomainError({
              code: ERROR_CODES.VALIDATION_FAILED,
              status: 422,
              message: 'One or more selected guests do not exist, belong to another event, or have been deleted',
            });
          }

          // Maintain caller's requested order of guest IDs
          const guestMap = new Map(foundGuests.map((g) => [g._id.toString(), g]));
          guests = parsed.guestIds.map((id) => guestMap.get(id.toString()));
        } else if (parsed.scope === EXPORT_SCOPES.ALL) {
          guests = await Guest.find({
            eventId: event._id,
            deletedAt: null,
          })
            .select('+qrToken')
            .sort({ createdAt: 1, _id: 1 })
            .session(session);

          if (guests.length === 0) {
            throw new DomainError({
              code: ERROR_CODES.VALIDATION_FAILED,
              status: 422,
              message: 'Event has no active guests to export passes for',
            });
          }
        }
      } else if (isReport) {
        // F20: reports do not need QR bearer tokens in the snapshot.
        guests = await Guest.find({
          eventId: event._id,
          deletedAt: null,
        })
          .sort({ createdAt: 1, _id: 1 })
          .session(session);
      }

      // Build private snapshot (F20: coherent event + guest snapshot; immutable).
      const snapshot = {
        event: {
          id: event._id.toString(),
          name: event.name,
          venue: event.venue,
          startsAt: event.startsAt,
          status: event.status,
        },
        guests: guests.map((g) => {
          const base = {
            id: g._id.toString(),
            name: g.name,
            shortCode: g.shortCode,
            allowedCompanions: g.allowedCompanions,
            companionNames: g.companionNames || [],
            reference: g.reference || null,
            checkIn: g.checkIn
              ? {
                actualCompanions: g.checkIn.actualCompanions,
                actualPartySize: 1 + g.checkIn.actualCompanions,
                checkedInAt: g.checkIn.checkedInAt,
                operatorName: g.checkIn.operatorName,
                method: g.checkIn.method,
              }
              : null,
          };
          // QR tokens only for pass exports; never for report snapshots (F20).
          if (!isReport) base.qrToken = g.qrToken;
          return base;
        }),
      };

      const expiresAt = new Date(snapshotAt.getTime() + LIMITS.EXPORT_EXPIRY_MS);
      // Retention deletion (F21): keep 410 behavior until deleteAt, then TTL removes.
      const deleteAt = new Date(expiresAt.getTime() + 7 * 24 * 3600 * 1000);

      const job = new ExportJob({
        eventId: event._id,
        createdBy: user._id || user.id,
        kind: parsed.kind,
        locale: parsed.locale,
        scope: parsed.scope || null,
        guestIds: parsed.guestIds || undefined,
        state: 'queued',
        snapshotAt,
        snapshot,
        expiresAt,
        deleteAt,
      });

      await job.save({ session });

      await AuditService.record({
        eventId: event._id,
        actorId: user._id || user.id,
        actorName: user.displayName || user.username,
        action: 'EXPORT_REQUESTED',
        changes: {
          exportId: job._id.toString(),
          kind: job.kind,
          scope: job.scope,
          locale: job.locale,
          guestCount: guests.length,
        },
        requestId,
        session,
      });

      return {
        id: job._id.toString(),
        state: job.state,
        snapshotAt: job.snapshotAt.toISOString(),
      };
    });

    // Notify background worker of new work
    if (exportWorker && typeof exportWorker.notifyNewJob === 'function') {
      exportWorker.notifyNewJob();
    }

    return result;

  },

  /**
   * Retrieve safe export job status DTO.
   *
   * @param {string} eventId
   * @param {string} exportId
   * @param {object} _user
   * @returns {Promise<object>} Safe export job DTO
   */
  async getExportJob(eventId, exportId, _user) {
    if (!REGEXES.OBJECT_ID.test(eventId) || !REGEXES.OBJECT_ID.test(exportId)) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Export job not found',
        status: 404,
      });
    }

    const job = await ExportJob.findById(exportId);
    if (!job || job.eventId.toString() !== eventId) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Export job not found',
        status: 404,
      });
    }

    // Check expiry
    const now = new Date();
    if (job.state !== 'expired' && job.expiresAt <= now) {
      job.state = 'expired';
      await job.save();
    }

    return job.toSafeDto();
  },

  /**
   * Validate and resolve the artifact file path for an export download.
   *
   * @param {string} eventId
   * @param {string} exportId
   * @param {object} _user
   * @returns {Promise<{ filePath: string, filename: string, size: number }>}
   */
  async getDownloadStream(eventId, exportId, _user) {
    if (!REGEXES.OBJECT_ID.test(eventId) || !REGEXES.OBJECT_ID.test(exportId)) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Export job not found',
        status: 404,
      });
    }

    const job = await ExportJob.findById(exportId);
    if (!job || job.eventId.toString() !== eventId) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Export job not found',
        status: 404,
      });
    }

    // Check expiry
    const now = new Date();
    if (job.state === 'expired' || job.expiresAt <= now) {
      if (job.state !== 'expired') {
        job.state = 'expired';
        await job.save();
      }
      throw new DomainError({
        code: ERROR_CODES.EXPORT_EXPIRED,
        message: 'Export has expired',
      });
    }

    // Check readiness states
    if (job.state === 'queued' || job.state === 'running') {
      throw new DomainError({
        code: ERROR_CODES.EXPORT_NOT_READY,
        message: 'Export is not ready yet',
      });
    }

    if (job.state === 'failed') {
      throw new DomainError({
        code: ERROR_CODES.EXPORT_FAILED,
        message: 'Export generation failed. Please request a new export.',
      });
    }

    if (job.state !== 'ready' || !job.artifactBasename) {
      throw new DomainError({
        code: ERROR_CODES.EXPORT_FAILED,
        message: 'Export artifact is not ready or missing',
      });
    }

    const exportDir = path.resolve(config.export.dir);
    const filePath = path.join(exportDir, job.artifactBasename);

    // Path traversal verification
    if (!/^[A-Za-z0-9_-]+\.pdf$/.test(job.artifactBasename) || path.dirname(path.resolve(filePath)) !== exportDir) {
      throw new DomainError({
        code: ERROR_CODES.FORBIDDEN,
        message: 'Invalid artifact path',
        status: 403,
      });
    }

    if (!fs.existsSync(filePath)) {
      throw new DomainError({
        code: ERROR_CODES.EXPORT_FAILED,
        message: 'Export artifact file is missing from storage',
      });
    }

    return {
      filePath,
      filename: job.downloadFilename || 'export.pdf',
      size: job.artifactSize,
    };
  },

  /**
   * Generate an internal QR data URL for an active guest.
   * Never leaks raw qrToken.
   *
   * @param {string} eventId
   * @param {string} guestId
   * @param {object} _user
   * @returns {Promise<{ imageDataUrl: string, shortCode: string }>}
   */
  async getGuestQr(eventId, guestId, _user) {
    if (!REGEXES.OBJECT_ID.test(eventId) || !REGEXES.OBJECT_ID.test(guestId)) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Guest not found',
        status: 404,
      });
    }

    const guest = await Guest.findOne({
      _id: guestId,
      eventId,
      deletedAt: null,
    }).select('+qrToken');

    if (!guest) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Guest not found',
        status: 404,
      });
    }

    const imageDataUrl = await generateQrDataUrl(guest.qrToken);

    return {
      imageDataUrl,
      shortCode: guest.shortCode,
    };
  },

  /**
   * Sweep expired artifacts from disk and update job states.
   * Also cleans orphaned .tmp files older than 10 minutes and old orphaned PDFs.
   *
   * @param {string} [exportDir]
   * @returns {Promise<{ removedFiles: number, expiredJobs: number }>}
   */
  async cleanupExpiredArtifacts(exportDir = config.export.dir) {
    const resolvedDir = path.resolve(exportDir);
    const now = new Date();
    let removedFiles = 0;
    let expiredJobs = 0;
    const failures = [];
    // F21: validated basename + parent check (allows UUID production artifacts
    // and safe test/legacy names, but never traversal or non-PDF).
    const isValidBasename = (name) =>
      typeof name === 'string' &&
      name.length >= 5 && name.length <= 128 &&
      name.endsWith('.pdf') &&
      !name.includes('/') && !name.includes('\\') && !name.includes('..') &&
      /^[A-Za-z0-9._-]+\.pdf$/.test(name);

    // F21: DB expiry must run even when the export directory is absent.
    // Explicitly unset the whole private snapshot (tokens + guest data) on
    // expiry; remove artifacts; retention deletion is via deleteAt TTL.
    const expiredJobList = await ExportJob.find({
      $or: [{ state: 'expired' }, { expiresAt: { $lte: now } }],
    }).select('+snapshot');


    for (const job of expiredJobList) {
      const wasExpired = job.state === 'expired';
      try {
        if (!wasExpired) {
          job.state = 'expired';
          expiredJobs++;
        }
        // Remove the entire private snapshot (F21: not just tokens).
        if (job.snapshot !== undefined) {
          job.snapshot = undefined;
          job.markModified('snapshot');
        }
        // Ensure retention deletion is scheduled.
        if (!job.deleteAt) {
          job.deleteAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
        }
        await job.save();

      } catch (err) {
        failures.push(`job ${job._id}: ${err.message}`);
        continue;
      }

      if (job.artifactBasename) {
        // F21: constrain by validated basename + parent, not string prefix.
        if (!isValidBasename(job.artifactBasename)) {
          failures.push(`job ${job._id}: invalid artifact basename`);
          continue;
        }
        const artifactPath = path.join(resolvedDir, path.basename(job.artifactBasename));
        if (path.dirname(path.resolve(artifactPath)) !== resolvedDir) {
          failures.push(`job ${job._id}: artifact escapes export dir`);
          continue;
        }
        if (fs.existsSync(artifactPath)) {
          try {
            await fs.promises.unlink(artifactPath);
            removedFiles++;
          } catch (err) {
            // F21: retry/record instead of silently claiming success.
            failures.push(`unlink ${job.artifactBasename}: ${err.message}`);
          }
        }
      }
    }

    // 2. Scan directory for abandoned .tmp files / orphans (best-effort).
    try {
      if (fs.existsSync(resolvedDir)) {
        const files = await fs.promises.readdir(resolvedDir);
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        const twentyFourHoursAgo = Date.now() - LIMITS.EXPORT_EXPIRY_MS;

        for (const file of files) {
          const filePath = path.join(resolvedDir, path.basename(file));
          if (path.dirname(path.resolve(filePath)) !== resolvedDir) continue;
          let stat = null;
          try {
            stat = await fs.promises.stat(filePath);
          } catch {
            continue;
          }
          if (!stat.isFile()) continue;

          if (file.endsWith('.tmp') && stat.mtimeMs < tenMinutesAgo) {
            try {
              await fs.promises.unlink(filePath);
              removedFiles++;
            } catch (err) {
              failures.push(`unlink tmp ${file}: ${err.message}`);
            }
          }

          if (file.endsWith('.pdf') && stat.mtimeMs < twentyFourHoursAgo) {
            if (!isValidBasename(file)) continue;
            const job = await ExportJob.findOne({ artifactBasename: file });
            if (!job || job.state === 'expired') {
              try {
                await fs.promises.unlink(filePath);
                removedFiles++;
              } catch (err) {
                failures.push(`unlink orphan ${file}: ${err.message}`);
              }
            }
          }
        }
      }
    } catch (err) {
      failures.push(`readdir: ${err.message}`);
    }

    if (failures.length > 0) {
      console.error(`[ExportsService] cleanup failures (${failures.length}):`, failures.slice(0, 5).join('; '));
    }

    return { removedFiles, expiredJobs, failures: failures.length };
  },
};
