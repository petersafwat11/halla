/**
 * Batched parallel runner with concurrency + per-second rate cap (Phase 3b.1).
 *
 * The naive `for guest of guests { await taqnyat.send(); await sleep(100); }`
 * loop blocks event-loop progress for ~100 seconds per 1000 guests, which
 * exceeds the cron tick window for large events. We replace it with a
 * bounded concurrent fan-out that respects Taqnyat's per-second rate
 * cap.
 *
 * Defaults (PHASE_3abc_PLAN.md, decision D3):
 *   concurrency = 5
 *   ratePerSecond = 10
 *
 * Failures are captured per-item; partial success is the normal outcome.
 * The caller decides what to do with `results.failed`.
 *
 * @template T, R
 * @param {T[]} items
 * @param {(item: T, index: number) => Promise<R>} worker
 * @param {Object} [opts]
 * @param {number} [opts.concurrency=5]
 * @param {number} [opts.ratePerSecond=10]  - hard cap on starts per
 *                                            sliding 1-second window.
 * @returns {Promise<{ total: number, successful: number, failed: number,
 *                     results: Array<{ index: number, item: T, ok: true,
 *                                      value: R } | { index: number,
 *                                      item: T, ok: false,
 *                                      error: string }> }>}
 */
async function runBatched(items, worker, opts = {}) {
  const concurrency = Math.max(1, opts.concurrency || 5);
  const ratePerSecond = Math.max(1, opts.ratePerSecond || 10);

  const results = new Array(items.length);
  let cursor = 0;
  let successful = 0;
  let failed = 0;
  const startTimes = []; // sliding window of recent start timestamps (ms)

  async function awaitRateSlot() {
    while (true) {
      const now = Date.now();
      // Drop entries older than 1s.
      while (startTimes.length && now - startTimes[0] >= 1000) startTimes.shift();
      if (startTimes.length < ratePerSecond) {
        startTimes.push(now);
        return;
      }
      // Wait until the oldest slot ages out.
      const wait = 1000 - (now - startTimes[0]);
      await new Promise((r) => setTimeout(r, Math.max(5, wait)));
    }
  }

  async function workerLoop() {
    while (true) {
      const myIndex = cursor++;
      if (myIndex >= items.length) return;
      const item = items[myIndex];
      await awaitRateSlot();
      try {
        const value = await worker(item, myIndex);
        results[myIndex] = { index: myIndex, item, ok: true, value };
        successful++;
      } catch (err) {
        results[myIndex] = {
          index: myIndex,
          item,
          ok: false,
          error: err && err.message ? err.message : String(err),
        };
        failed++;
      }
    }
  }

  const lanes = [];
  for (let i = 0; i < concurrency; i++) lanes.push(workerLoop());
  await Promise.all(lanes);

  return {
    total: items.length,
    successful,
    failed,
    results,
  };
}

module.exports = { runBatched };
