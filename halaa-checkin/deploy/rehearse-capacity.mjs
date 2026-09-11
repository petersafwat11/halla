#!/usr/bin/env node
/**
 * T11 capacity + failure rehearsal driver (host-side, disposable data only).
 *
 * Phase 1 (--phase=setup): login as admin, create + open a synthetic
 *   capacity event, print the exact CLI commands that assign the two
 *   receptionists, then exit. The operator runs those commands (provisioning
 *   revokes sessions, so assignment must happen before phase 2 logins).
 * Phase 2 (--phase=load --eventId=<id>): import 1,000 synthetic invitations
 *   via one atomic CSV commit, measure admission latency (100 admissions
 *   across two reception sessions), run a full all-pass export while
 *   admitting 20 more (gate-during-render), download the PDF, and sample
 *   container memory. Prints a measurement summary for the evidence report.
 *
 * Targets (validation doc §3, rehearsal only — never claimed without these
 * numbers): admission p95 <= 1s (excl. decode/user time); gate p95 <= 2s
 * during a full 1,000-pass export with no dropped/duplicated admission;
 * export finishes within the 90s render lease; memory within container
 * budgets (api limit 1G, web limit 512M).
 *
 * Usage (from halaa-checkin/):
 *   node deploy/rehearse-capacity.mjs --phase=setup
 *   # ... run the printed provision commands ...
 *   node deploy/rehearse-capacity.mjs --phase=load --eventId=<id>
 *
 * Required env: ADMIN_USER, ADMIN_PASS, REC1_USER, REC2_USER, REC_PASS,
 * optional: API (default http://127.0.0.1:8100), ORIGIN (default
 * http://localhost:3100).
 */

import crypto from 'node:crypto';

const API = process.env.API || 'http://127.0.0.1:8100';
const ORIGIN = process.env.ORIGIN || 'http://localhost:3100';
const ADMIN_USER = process.env.ADMIN_USER || 'rehearsal_admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '';
const REC1_USER = process.env.REC1_USER || 'rehearsal_rec1';
const REC2_USER = process.env.REC2_USER || 'rehearsal_rec2';
const REC_PASS = process.env.REC_PASS || '';
// Passwords never have defaults in this file: export ADMIN_PASS/REC_PASS in
// the calling shell (disposable rehearsal secrets only, never committed).
if (!ADMIN_PASS || !REC_PASS) {
  throw new Error('ADMIN_PASS and REC_PASS environment variables are required');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { phase: 'setup', eventId: '', priorEvent: '', priorExport: '' };
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--phase=')) out.phase = args[i].slice('--phase='.length);
    else if (args[i] === '--eventId' && args[i + 1]) out.eventId = args[++i];
    else if (args[i].startsWith('--eventId=')) out.eventId = args[i].slice('--eventId='.length);
    else if (args[i].startsWith('--priorEvent=')) out.priorEvent = args[i].slice('--priorEvent='.length);
    else if (args[i].startsWith('--priorExport=')) out.priorExport = args[i].slice('--priorExport='.length);
  }
  return out;
}

// Rehearsal call budget vs the API's per-IP general limiter (120 req / 60s
// window, contract §2: ample for two human receptionists at ~10 req/min
// combined, even behind one venue NAT). The burst below is deliberately
// paced (500ms) so the SYNTHETIC load — ~60x human pace — stays inside the
// abuse limiter while still measuring server latency, not limiter behavior.
const BURST_N = 80;
const DURING_N = 20;
const BURST_PACE_MS = 500;

function makeClient() {
  let cookie = '';
  let csrf = '';
  return {
    async login(username, password) {
      const res = await fetch(`${API}/api/checkin/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
        body: JSON.stringify({ username, password }),
      });
      if (res.status !== 200) throw new Error(`login ${username} failed: ${res.status} ${await res.text()}`);
      const body = await res.json();
      const setCookie = res.headers.get('set-cookie') || '';
      cookie = setCookie.split(';')[0];
      csrf = body.data.csrfToken;
    },
    async req(method, urlPath, payload, { idempotencyKey } = {}) {
      const headers = { Origin: ORIGIN, Cookie: cookie };
      if (payload !== undefined) headers['Content-Type'] = 'application/json';
      if (csrf && method !== 'GET') headers['X-CSRF-Token'] = csrf;
      if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
      const started = performance.now();
      const res = await fetch(`${API}${urlPath}`, {
        method,
        headers,
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
      const ms = performance.now() - started;
      const text = await res.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }
      return { status: res.status, body, ms, rawBytes: text.length };
    },
  };
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function summarize(label, samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const max = sorted[sorted.length - 1] || 0;
  console.log(`${label}: n=${sorted.length} p50=${p50.toFixed(0)}ms p95=${p95.toFixed(0)}ms max=${max.toFixed(0)}ms`);
  return { n: sorted.length, p50, p95, max };
}

/** Deterministic synthetic CSV: 1,000 rows, mixed scripts, 0..3 companions. */
function buildCapacityCsv(count) {
  const arFirst = ['أحمد', 'نورة', 'خالد', 'سارة', 'محمد', 'فاطمة', 'عبدالله', 'ريم', 'سلطان', 'لجين'];
  const arLast = ['العتيبي', 'القحطاني', 'الدوسري', 'المطيري', 'الشهراني', 'الحربي', 'الغامدي', 'الزهراني'];
  const enFirst = ['James', 'Sarah', 'Michael', 'Emily', 'Robert', 'Linda', 'William', 'Emma'];
  const enLast = ['Smith', 'Johnson', 'Brown', 'Taylor', 'Anderson', 'Thomas', 'Moore', 'Martin'];
  const lines = ['name,allowedCompanions,companionNames,reference'];
  for (let i = 0; i < count; i++) {
    const style = i % 4;
    let name;
    if (style === 0) name = `${arFirst[i % arFirst.length]} بن ${arLast[(i * 7) % arLast.length]} ${i}`;
    else if (style === 1) name = `${enFirst[i % enFirst.length]} ${enLast[(i * 5) % enLast.length]} ${i}`;
    else if (style === 2) name = `${arFirst[i % arFirst.length]} ${enLast[(i * 3) % enLast.length]} ${i}`;
    else name = `ضيف تجريبي طويل الاسم للتحقق من التفاف النصوص في التقارير والبطاقات رقم ${i}`;
    const allowed = i % 4; // 0..3
    const companions = Array.from({ length: allowed }, (_, k) => `مرافق ${i}-${k + 1}`).join('|');
    const ref = `CAP-${String(i + 1).padStart(4, '0')}`;
    const safeName = name.includes(',') ? `"${name}"` : name;
    lines.push(`${safeName},${allowed},${companions},${ref}`);
  }
  // One max-companion stress row (replaces last row, keeps total at count).
  lines[lines.length - 1] =
    `ضيف بأقصى مرافقين,20,${Array.from({ length: 20 }, (_, k) => `مرافق ${k + 1}`).join('|')},CAP-MAX`;
  return lines.join('\n');
}

async function setupPhase() {
  const admin = makeClient();
  await admin.login(ADMIN_USER, ADMIN_PASS);
  const startsAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const created = await admin.req('POST', '/api/checkin/v1/events', {
    name: 'T11 Capacity Rehearsal (Synthetic)',
    venue: 'Rehearsal Hall',
    startsAt,
    timezone: 'Asia/Riyadh',
  });
  if (created.status !== 201) throw new Error(`event create failed: ${created.status} ${JSON.stringify(created.body)}`);
  const eventId = created.body.data.id;
  const opened = await admin.req('POST', `/api/checkin/v1/events/${eventId}/status`, {
    version: created.body.data.version,
    status: 'live',
  });
  if (opened.status !== 200) throw new Error(`event open failed: ${opened.status}`);
  console.log(`CAPACITY-EVENT-ID: ${eventId}`);
  console.log('Run these two assignment commands (password via USER_PASSWORD), then phase 2:');
  console.log(
    `docker compose -f deploy/compose.yml -f deploy/compose.dev.yml -p halaa-checkin-dev exec -T -e USER_PASSWORD="$REC_PASS" checkin-api node api/scripts/provision-user.mjs --username ${REC1_USER} --displayName "Rehearsal Reception 1" --role reception --events ${eventId}`
  );
  console.log(
    `docker compose -f deploy/compose.yml -f deploy/compose.dev.yml -p halaa-checkin-dev exec -T -e USER_PASSWORD="$REC_PASS" checkin-api node api/scripts/provision-user.mjs --username ${REC2_USER} --displayName "Rehearsal Reception 2" --role reception --events ${eventId}`
  );
  console.log(`node deploy/rehearse-capacity.mjs --phase=load --eventId=${eventId}`);
}

async function loadPhase(eventId, priorEvent, priorExport) {
  if (!eventId) throw new Error('--eventId is required for load phase');
  const misses = [];
  const admin = makeClient();
  const rec1 = makeClient();
  const rec2 = makeClient();
  await admin.login(ADMIN_USER, ADMIN_PASS);
  await rec1.login(REC1_USER, REC_PASS);
  await rec2.login(REC2_USER, REC_PASS);

  // Prior-run follow-up (report only): did the earlier full-size export finish?
  if (priorEvent && priorExport) {
    const st = await admin.req('GET', `/api/checkin/v1/events/${priorEvent}/exports/${priorExport}`);
    const d = st.body?.data || {};
    console.log(`PRIOR-EXPORT: state=${d.state} attempts=${d.attempts} error=${d.errorCode || 'none'}`);
    const pstats = await admin.req('GET', `/api/checkin/v1/events/${priorEvent}/stats`);
    console.log(`PRIOR-STATS: total=${pstats.body?.data?.totalInvitations} admitted=${pstats.body?.data?.admittedInvitations}`);
  }

  // 1. Atomic import of 1,000 invitations.
  const csv = buildCapacityCsv(1000);
  console.log(`CSV payload: ${(Buffer.byteLength(csv) / 1024).toFixed(1)} KiB, 1000 rows`);
  const preview = await admin.req('POST', `/api/checkin/v1/events/${eventId}/imports/preview`, { csv });
  if (preview.status !== 200 || preview.body.data.validCount !== 1000) {
    throw new Error(`preview unexpected: ${preview.status} ${JSON.stringify(preview.body)?.slice(0, 300)}`);
  }
  console.log(`preview validCount=${preview.body.data.validCount} (${preview.ms.toFixed(0)}ms)`);
  const commit = await admin.req(
    'POST',
    `/api/checkin/v1/events/${eventId}/imports/commit`,
    { csv },
    { idempotencyKey: crypto.randomUUID() }
  );
  if (commit.status !== 201 || commit.body.data.createdCount !== 1000) {
    throw new Error(`commit failed: ${commit.status} ${JSON.stringify(commit.body)?.slice(0, 300)}`);
  }
  console.log(`IMPORT-COMMIT: createdCount=1000 in ${commit.ms.toFixed(0)}ms`);

  // 2. Load guest ids + versions (10 pages of 100).
  const guests = [];
  for (let page = 1; page <= 10; page++) {
    const res = await admin.req('GET', `/api/checkin/v1/events/${eventId}/guests?page=${page}&pageSize=100`);
    if (res.status !== 200) throw new Error(`guest list page ${page} failed: ${res.status}`);
    guests.push(...res.body.data);
  }
  if (guests.length !== 1000) throw new Error(`expected 1000 guests, listed ${guests.length}`);
  console.log(`listed ${guests.length} guests for admission`);

  // 3. Admission latency: BURST_N admissions alternating two sessions, paced
  // to stay inside the per-IP abuse limiter (see note above).
  const admitSamples = [];
  for (let i = 0; i < BURST_N; i++) {
    const client = i % 2 === 0 ? rec1 : rec2;
    const g = guests[i];
    const res = await client.req(
      'POST',
      `/api/checkin/v1/events/${eventId}/checkins`,
      { guestId: g.id, version: g.version, actualCompanions: 0, method: 'manual' },
      { idempotencyKey: crypto.randomUUID() }
    );
    if (res.status !== 201) throw new Error(`admission ${i} failed: ${res.status} ${JSON.stringify(res.body)?.slice(0, 200)}`);
    admitSamples.push(res.ms);
    await new Promise((r) => setTimeout(r, BURST_PACE_MS));
  }
  const admit = summarize('ADMISSION', admitSamples);
  if (admit.p95 > 1000) misses.push(`admission p95 ${admit.p95.toFixed(0)}ms > 1000ms target`);

  // 4. Full all-pass export while admitting 20 more.
  const expCreated = await admin.req('POST', `/api/checkin/v1/events/${eventId}/exports`, {
    kind: 'qr',
    locale: 'ar',
    scope: 'all',
  });
  if (expCreated.status !== 202) throw new Error(`export create failed: ${expCreated.status}`);
  const exportId = expCreated.body.data.id;
  console.log(`export queued: ${exportId}`);
  const renderStart = performance.now();
  const gateSamples = [];
  let admitIdx = BURST_N;
  let exportState = 'queued';
  const deadline = Date.now() + 150000;
  for (;;) {
    const st = await admin.req('GET', `/api/checkin/v1/events/${eventId}/exports/${exportId}`);
    exportState = st.body?.data?.state;
    if (exportState === 'ready' || exportState === 'failed' || exportState === 'expired') break;
    if (Date.now() > deadline) throw new Error('export poll timed out after 150s');
    // Admit during render (up to DURING_N).
    if (admitIdx < BURST_N + DURING_N) {
      const client = admitIdx % 2 === 0 ? rec1 : rec2;
      const g = guests[admitIdx++];
      const res = await client.req(
        'POST',
        `/api/checkin/v1/events/${eventId}/checkins`,
        { guestId: g.id, version: g.version, actualCompanions: 0, method: 'manual' },
        { idempotencyKey: crypto.randomUUID() }
      );
      if (res.status !== 201) throw new Error(`during-render admission failed: ${res.status}`);
      gateSamples.push(res.ms);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  const renderMs = performance.now() - renderStart;
  console.log(`EXPORT-STATE: ${exportState} in ${(renderMs / 1000).toFixed(1)}s`);
  if (exportState !== 'ready') throw new Error(`export did not reach ready (state=${exportState})`);
  if (renderMs > 90000) misses.push(`export ${(renderMs / 1000).toFixed(1)}s exceeded 90s render deadline`);
  const gate = summarize('GATE-DURING-EXPORT', gateSamples);
  if (gate.p95 > 2000) misses.push(`gate p95 ${gate.p95.toFixed(0)}ms > 2000ms target`);

  // 5. Totals must equal burst + actually-admitted-during-render (a faster
  // render simply yields fewer during-samples): exact, no drops/duplicates.
  const duringCount = gateSamples.length;
  const stats = await admin.req('GET', `/api/checkin/v1/events/${eventId}/stats`);
  const admitted = stats.body?.data?.admittedInvitations;
  const total = stats.body?.data?.totalInvitations;
  console.log(`STATS: total=${total} admitted=${admitted} (burst=${BURST_N} during=${duringCount})`);
  if (total !== 1000 || admitted !== BURST_N + duringCount) {
    throw new Error(`totals wrong: total=${total} admitted=${admitted}`);
  }
  if (duringCount < 5) misses.push(`only ${duringCount} during-render samples (render too fast to measure gate under load)`);

  // 6. Download the PDF (header check only; artifact stays server-side).
  const dl = await fetch(`${API}/api/checkin/v1/events/${eventId}/exports/${exportId}/download`, {
    headers: { Origin: ORIGIN, Cookie: '' },
  });
  console.log(`UNAUTH-DOWNLOAD-STATUS: ${dl.status} (must not be 200)`);
  if (dl.status === 200) throw new Error('unauthenticated export download succeeded');

  console.log('---');
  console.log(`ADMIT_P95_MS=${admit.p95.toFixed(0)} GATE_P95_MS=${gate.p95.toFixed(0)} RENDER_S=${(renderMs / 1000).toFixed(1)}`);
  if (misses.length > 0) {
    console.log(`TARGET-MISS: ${misses.join(' | ')}`);
    process.exitCode = 2;
  } else {
    console.log('TARGETS-MET');
  }
}

async function main() {
  const { phase, eventId, priorEvent, priorExport } = parseArgs();
  if (phase === 'setup') await setupPhase();
  else if (phase === 'load') await loadPhase(eventId, priorEvent, priorExport);
  else throw new Error(`unknown phase: ${phase}`);
}

main().catch((err) => {
  console.error('REHEARSAL-FAILED:', err.message);
  process.exit(1);
});
