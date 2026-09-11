/**
 * @halaa-checkin/api
 * PDF Export Worker.
 * Single rendering slot with atomic lease acquisition, 90-second deadline,
 * crash recovery, retry cap (2 attempts), atomic file publishing, and cleanup.
 * Adheres to Technical Contract Section 7.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ERROR_CODES } from '@halaa-checkin/contracts';
import { ExportJob } from './exportJob.model.js';
import { renderHtmlToPdf, closeBrowser, getBrowser } from './pdfRenderer.js';
import { generateQrDataUrl } from './qrGenerator.js';
import { generateSinglePassHtml } from './templates/singlePass.js';
import { generateBulkPassesHtml } from './templates/bulkPasses.js';
import { generateReportHtml } from './templates/report.js';
import { config } from '../../config.js';

export const LEASE_DURATION_MS = 150 * 1000; // 150s lease, safely longer than render deadline
export const RENDER_DEADLINE_MS = 90 * 1000; // 90s total bound including QR generation
export const MAX_ATTEMPTS = 2; // Cap at 2 attempts

/**
 * Sanitize a string for safe use in Content-Disposition download filenames.
 *
 * @param {string} name
 * @param {string} [fallback='export']
 * @returns {string} Safe filename ending with .pdf
 */
export function sanitizeDownloadFilename(name, fallback = 'export') {
  if (!name || typeof name !== 'string') return `${fallback}.pdf`;
  const cleaned = name
    .split('')
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code >= 32 && !'<>/\\|?*"'.includes(c) && c !== ':';
    })
    .join('')
    .trim()
    .slice(0, 80);
  return `${cleaned || fallback}.pdf`;
}

export class ExportWorker {
  constructor({
    workerId = `worker-${process.pid}-${crypto.randomUUID().slice(0, 8)}`,
    exportDir = config.export.dir,
    pollIntervalMs = 2000,
  } = {}) {
    this.workerId = workerId;
    this.exportDir = exportDir;
    this.pollIntervalMs = pollIntervalMs;
    this.timer = null;
    this.isProcessing = false;
    this.isStopped = true;
    this.activeJobPromise = null;
  }

  /**
   * Start the background polling loop.
   */
  start() {
    if (this.timer) return;
    this.isStopped = false;
    this.timer = setInterval(() => {
      this.processNextJob().catch((err) => {
        console.error(`[ExportWorker ${this.workerId}] Polling error:`, err);
      });
    }, this.pollIntervalMs);
    this.timer.unref();

    // Trigger an immediate check on startup
    setImmediate(() => {
      this.processNextJob().catch(() => {});
    });
  }

  /**
   * Gracefully stop the worker, wait for active rendering job to finish,
   * and release browser resources.
   *
   * @returns {Promise<void>}
   */
  async stop() {
    this.isStopped = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.activeJobPromise) {
      try {
        await this.activeJobPromise;
      } catch {
        // Ignore job error during graceful shutdown
      }
    }

    await closeBrowser();
  }

  /**
   * Signal the worker that a new job was enqueued.
   */
  notifyNewJob() {
    if (this.isStopped || this.isProcessing) return;
    setImmediate(() => {
      this.processNextJob().catch(() => {});
    });
  }

  /**
   * Atomically claim the next queued or expired-lease job.
   *
   * @returns {Promise<import('./exportJob.model.js').ExportJob | null>}
   */
  async claimNextJob() {
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + LEASE_DURATION_MS);

    // 1. Mark dead jobs (attempts >= MAX_ATTEMPTS and lease expired) as permanently failed.
    // F22: never claim or revive expired jobs.
    await ExportJob.updateMany(
      {
        state: 'running',
        leaseUntil: { $lt: now },
        attempts: { $gte: MAX_ATTEMPTS },
        expiresAt: { $gt: now },
      },
      {
        $set: {
          state: 'failed',
          errorCode: ERROR_CODES.EXPORT_FAILED,
          errorMessage: 'Export job lease expired and reached maximum attempt cap',
          leaseOwner: null,
          leaseUntil: null,
        },
      }
    );

    // 2. Atomically claim next job (F22: exclude expired jobs; require unexpired).
    return ExportJob.findOneAndUpdate(
      {
        $or: [
          { state: 'queued', attempts: { $lt: MAX_ATTEMPTS }, expiresAt: { $gt: now } },
          {
            state: 'running',
            leaseUntil: { $lt: now },
            attempts: { $lt: MAX_ATTEMPTS },
            expiresAt: { $gt: now },
          },
        ],
      },
      {
        $set: {
          state: 'running',
          leaseOwner: this.workerId,
          leaseUntil,
        },
        $inc: { attempts: 1 },
      },
      {
        sort: { createdAt: 1 },
        new: true,
        select: '+snapshot',
      }
    );
  }

  /**
   * Execute one job lifecycle.
   *
   * @param {import('./exportJob.model.js').ExportJob} job
   * @returns {Promise<import('./exportJob.model.js').ExportJob | null>}
   */
  async processJob(job) {
    const resolvedExportDir = path.resolve(this.exportDir);

    // F22: prohibit rendering expired jobs.
    if (job.expiresAt && new Date(job.expiresAt) <= new Date()) {
      await ExportJob.findOneAndUpdate(
        { _id: job._id, state: 'running', leaseOwner: this.workerId },
        { $set: { state: 'expired', leaseOwner: null, leaseUntil: null } },
      );
      return null;
    }

    const fileUuid = crypto.randomUUID();
    const artifactBasename = `${fileUuid}.pdf`;
    const tmpPath = path.join(resolvedExportDir, `${artifactBasename}.tmp`);
    const finalPath = path.join(resolvedExportDir, artifactBasename);
    const startedAt = Date.now();
    let renderTimer = null;

    try {
      await fs.promises.mkdir(resolvedExportDir, { recursive: true });
      const snapshot = job.snapshot;
      if (!snapshot || !snapshot.event) {
        throw new Error('Export snapshot is corrupted or missing event data');
      }

      let htmlContent = '';
      let pdfOptions = { format: 'A4' };
      let downloadFilename = 'export.pdf';

      if (job.kind === 'qr') {
        // F22: total bound includes QR generation; abort if deadline exceeded.
        const snapshotGuests = snapshot.guests || [];
        const guestsWithQr = [];
        for (let i = 0; i < snapshotGuests.length; i++) {
          if (Date.now() - startedAt > RENDER_DEADLINE_MS) {
            throw new Error('Export timed out during QR preparation');
          }
          const qrDataUrl = await generateQrDataUrl(snapshotGuests[i].qrToken);
          guestsWithQr.push({ ...snapshotGuests[i], qrDataUrl });
          if (i % 10 === 9) {
            await new Promise((resolve) => setImmediate(resolve));
          }
        }

        if (job.scope === 'selected' && guestsWithQr.length === 1) {
          // Single pass A6 (full-bleed, snapshot time printed)
          const guest = guestsWithQr[0];
          htmlContent = generateSinglePassHtml({
            event: snapshot.event,
            guest,
            locale: job.locale,
            snapshotAt: job.snapshotAt,
          });
          pdfOptions = { format: 'A6' };
          downloadFilename = sanitizeDownloadFilename(`pass-${guest.shortCode}`);
        } else {
          // Bulk passes A4 (4-up, template @page margins preserved)
          htmlContent = generateBulkPassesHtml({
            event: snapshot.event,
            guests: guestsWithQr,
            locale: job.locale,
            snapshotAt: job.snapshotAt,
          });
          pdfOptions = { format: 'A4' };
          downloadFilename = sanitizeDownloadFilename(`passes-${snapshot.event.name}`);
        }
      } else if (job.kind === 'report') {
        // Attendance report A4 with printed page numbers
        htmlContent = generateReportHtml({
          event: snapshot.event,
          guests: snapshot.guests || [],
          snapshotAt: job.snapshotAt,
          locale: job.locale,
        });
        pdfOptions = { format: 'A4', displayHeaderFooter: true };
        downloadFilename = sanitizeDownloadFilename(`report-${snapshot.event.name}`);
      } else {
        throw new Error(`Unsupported export kind: ${job.kind}`);
      }

      // Render HTML to PDF Buffer via Playwright/Chromium with total deadline.
      // F22: Promise.race alone cannot cancel Chromium — on timeout we actively
      // close the render context via closeBrowser-adjacent cleanup and await
      // disposal before freeing the slot; timers are always cleared.
      const remainingMs = RENDER_DEADLINE_MS - (Date.now() - startedAt);
      if (remainingMs <= 0) throw new Error('Export preparation exceeded render deadline');
      const renderPromise = renderHtmlToPdf(htmlContent, pdfOptions);
      const pdfBuffer = await new Promise((resolve, reject) => {
        renderTimer = setTimeout(() => {
          reject(new Error('PDF render timed out'));
        }, remainingMs);
        renderPromise.then(
          (buf) => { clearTimeout(renderTimer); renderTimer = null; resolve(buf); },
          (err) => { clearTimeout(renderTimer); renderTimer = null; reject(err); },
        );
      }).catch(async (err) => {
        // Actively dispose of the timed-out render before freeing the slot.
        try { await closeBrowser(); } catch { /* ignore */ }
        throw err;
      });
      if (renderTimer) { clearTimeout(renderTimer); renderTimer = null; }

      // Write to temporary file first
      await fs.promises.writeFile(tmpPath, pdfBuffer);

      // Atomic rename to final path
      await fs.promises.rename(tmpPath, finalPath);

      const stat = await fs.promises.stat(finalPath);
      const artifactSize = stat.size;

      // Verify lease is still owned before publishing (F22: running + unexpired predicates).
      const now = new Date();
      const publishedJob = await ExportJob.findOneAndUpdate(
        {
          _id: job._id,
          state: 'running',
          leaseOwner: this.workerId,
          attempts: job.attempts,
          leaseUntil: { $gt: now },
          expiresAt: { $gt: now },
        },
        {
          $set: {
            state: 'ready',
            artifactBasename,
            artifactSize,
            downloadFilename,
            leaseOwner: null,
            leaseUntil: null,
          },
        },
        { new: true }
      );

      if (!publishedJob) {
        // Lease was lost before publishing! Discard artifact.
        try {
          await fs.promises.unlink(finalPath);
        } catch {
          // Ignore unlink error
        }
        console.warn(`[ExportWorker ${this.workerId}] Job ${job._id} lost lease before publish; artifact discarded.`);
        return null;
      }

      return publishedJob;
    } catch (err) {
      if (renderTimer) { try { clearTimeout(renderTimer); } catch { /* ignore */ } renderTimer = null; }
      // Clean up temporary/orphan files
      try {
        if (fs.existsSync(tmpPath)) await fs.promises.unlink(tmpPath);
      } catch {
        // Ignore unlink error on cleanup
      }
      try {
        if (fs.existsSync(finalPath)) await fs.promises.unlink(finalPath);
      } catch {
        // Ignore unlink error on cleanup
      }

      // F22: failure updates use lease-owner/state predicates; never overwrite
      // a reclaimed job. Stale owners cannot fail a job they no longer own.
      const now = new Date();
      const owned = await ExportJob.findOne({ _id: job._id, attempts: job.attempts, leaseOwner: this.workerId });
      if (owned) {
        if (owned.attempts >= MAX_ATTEMPTS) {
          await ExportJob.findOneAndUpdate(
            { _id: job._id, attempts: job.attempts, leaseOwner: this.workerId, state: 'running' },
            {
              $set: {
                state: 'failed',
                errorCode: ERROR_CODES.EXPORT_FAILED,
                errorMessage: err.message || 'Export rendering failed',
                leaseOwner: null,
                leaseUntil: null,
              },
            },
          );
        } else {
          // Return to queued for retry (only if still owned + unexpired).
          await ExportJob.findOneAndUpdate(
            { _id: job._id, attempts: job.attempts, leaseOwner: this.workerId, state: 'running', expiresAt: { $gt: now } },
            { $set: { state: 'queued', leaseOwner: null, leaseUntil: null } },
          );
        }
      }
      throw err;
    }
  }

  /**
   * Process the next queued job if the single rendering slot is available.
   *
   * @returns {Promise<boolean>} True if a job was processed
   */
  async processNextJob() {
    if (this.isProcessing || this.isStopped) return false;
    this.isProcessing = true;

    try {
      const job = await this.claimNextJob();
      if (!job) {
        return false;
      }

      this.activeJobPromise = this.processJob(job);
      await this.activeJobPromise;

      // Check for further work immediately
      if (!this.isStopped) {
        setImmediate(() => {
          this.processNextJob().catch(() => {});
        });
      }
      return true;
    } finally {
      this.activeJobPromise = null;
      this.isProcessing = false;
    }
  }

  /**
   * Synchronously or explicitly process a specific job by ID (useful for tests).
   *
   * @param {string} jobId
   * @returns {Promise<import('./exportJob.model.js').ExportJob>}
   */
  async processJobImmediately(jobId) {
    const job = await ExportJob.findById(jobId).select('+snapshot');
    if (!job) {
      throw new Error(`Export job ${jobId} not found`);
    }

    if (job.state === 'ready') return job;
    // Respect the production attempt cap even in tests/manual triggers
    if (job.attempts >= MAX_ATTEMPTS && job.state === 'failed') {
      throw new Error(`Export job ${jobId} already reached maximum attempts (${MAX_ATTEMPTS})`);
    }

    // Force lease to this worker
    job.state = 'running';
    job.leaseOwner = this.workerId;
    job.leaseUntil = new Date(Date.now() + LEASE_DURATION_MS);
    job.attempts += 1;
    await job.save();

    return this.processJob(job);
  }
}

export const exportWorker = new ExportWorker();

/**
 * Production worker health check (F23): verifies browser readiness and private
 * storage safely without repeatedly launching expensive work. Returns true when
 * exports can run; false when export creation should return 503 while gate
 * endpoints stay available.
 */
export async function checkWorkerHealth({ exportDir = config.export.dir, requireRunning = config.isProd } = {}) {
  if (requireRunning && exportWorker.isStopped) return false;
  const probe = path.join(path.resolve(exportDir), `.health-${crypto.randomUUID()}.tmp`);
  try {
    await fs.promises.mkdir(path.dirname(probe), { recursive: true });
    await fs.promises.writeFile(probe, 'ok', { flag: 'wx', mode: 0o600 });
    await fs.promises.unlink(probe);
    const browser = await getBrowser();
    return browser.isConnected();
  } catch {
    await fs.promises.unlink(probe).catch(() => {});
    return false;
  }
}
