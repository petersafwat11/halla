/**
 * Batched parallel runner with concurrency + per-second rate cap.
 *
 * The naive `for guest of guests { await taqnyat.send(); await sleep(100); }`
 * loop blocks event-loop progress for ~100 seconds per 1000 guests, which
 * exceeds the cron tick window for large events. We replace it with a
 * bounded concurrent fan-out that respects Taqnyat's per-second rate
 * cap.
 *
 * Defaults:
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
  const initialRate = Math.max(1, opts.ratePerSecond || 10);

  const results = new Array(items.length);
  let cursor = 0;
  let successful = 0;
  let failed = 0;
  const startTimes = []; // sliding window of recent start timestamps (ms)

  // 429 backoff. The fixed prefix throttle does NOT decay when the
  // upstream (Taqnyat) signals it's overloaded — once we start hitting
  // 429s, the failures cascade because we keep firing at the static cap.
  // We adapt the rate downward when 429s appear and recover after a
  // successful streak.
  let currentRate = initialRate;
  let cooldownUntil = 0; // ms epoch — pause new starts until this time
  const RATE_FLOOR = 2;
  const RATE_RECOVER_AFTER = 50; // successful sends with no 429 → ramp up
  let successStreak = 0;

  function recordRateLimitHit(retryAfterSeconds) {
    // Halve the rate (floor 2 / sec) and impose a cooldown.
    currentRate = Math.max(RATE_FLOOR, Math.floor(currentRate / 2));
    const cool = (retryAfterSeconds && retryAfterSeconds > 0
      ? retryAfterSeconds
      : 5) * 1000;
    cooldownUntil = Date.now() + cool;
    successStreak = 0;
  }

  function recordSuccess() {
    successStreak += 1;
    if (successStreak >= RATE_RECOVER_AFTER && currentRate < initialRate) {
      currentRate = Math.min(initialRate, currentRate + 1);
      successStreak = 0;
    }
  }

  function isRateLimitError(err) {
    if (!err) return { yes: false };
    const status = err.status || err.statusCode || err.response?.status;
    if (status === 429) {
      const ra =
        err.response?.headers?.["retry-after"] ||
        err.response?.headers?.get?.("retry-after");
      const retryAfter = ra ? parseInt(String(ra), 10) : null;
      return { yes: true, retryAfter: Number.isFinite(retryAfter) ? retryAfter : null };
    }
    const msg = (err.message || "").toLowerCase();
    if (msg.includes("rate limit") || msg.includes("too many requests")) {
      return { yes: true, retryAfter: null };
    }
    return { yes: false };
  }

  async function awaitRateSlot() {
    while (true) {
      const now = Date.now();
      if (cooldownUntil && now < cooldownUntil) {
        await new Promise((r) => setTimeout(r, cooldownUntil - now));
        continue;
      }
      // Drop entries older than 1s.
      while (startTimes.length && now - startTimes[0] >= 1000) startTimes.shift();
      if (startTimes.length < currentRate) {
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
        recordSuccess();
      } catch (err) {
        const rl = isRateLimitError(err);
        if (rl.yes) {
          recordRateLimitHit(rl.retryAfter);
          // Re-enqueue this item: drop it back into the pool by lowering
          // cursor below myIndex isn't safe with concurrent lanes, so we
          // retry inline with the new (lower) rate. Single retry to bound
          // total work. Subsequent 429 → record as failure.
          try {
            await awaitRateSlot();
            const retryValue = await worker(item, myIndex);
            results[myIndex] = { index: myIndex, item, ok: true, value: retryValue };
            successful++;
            recordSuccess();
            continue;
          } catch (retryErr) {
            results[myIndex] = {
              index: myIndex,
              item,
              ok: false,
              error: retryErr && retryErr.message ? retryErr.message : String(retryErr),
            };
            failed++;
            continue;
          }
        }
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
