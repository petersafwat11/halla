/**
 * Upload content verification — magic-byte allowlist + quarantine-first scan
 * policy (UGC-04 · REVIEW-FINDINGS P1-05).
 *
 * File-extension / declared-MIME checks alone are not sufficient for arbitrary
 * uploads: a `.jpg` with `Content-Type: image/jpeg` can carry an EXE/PDF/script
 * payload. This module adds:
 *
 *   1. `sniffType(buffer)` — detect the ACTUAL type from the leading bytes
 *      (file signature / "magic bytes").
 *   2. `verifyMagicBytes(buffer, declaredMime)` — assert the real bytes are in
 *      the allowlist AND consistent with the declared MIME family. Returns a
 *      structured verdict; the caller REJECTS on `ok:false`.
 *   3. `scanBuffer(buffer, { declaredMime })` — the quarantine-first pipeline
 *      entry point: magic-byte gate → pluggable malware scanner
 *      (`setScanner`) → FAIL-CLOSED policy (an indeterminate/errored/timed-out
 *      scan REJECTS unless explicitly allowed). Returns `{ clean, reason }`.
 *
 * Boundary: the pluggable scanner INTERFACE + the fail-closed policy live here
 * and are unit-tested (incl. malicious fixtures). Standing up the real scanner
 * (ClamAV / a scanning service) and the physical quarantine S3 bucket is
 * infrastructure (EXTERNAL §6) and is wired via `setScanner` when available; the
 * DEFAULT scanner is fail-closed-aware and treated as "no verdict".
 */

// ── Magic-byte signatures (leading-byte prefixes) ─────────────────────────────
// Each entry: { type, family, bytes:[..], offset?, ext:[..] }. `bytes` is a
// prefix match at `offset` (default 0). WEBP/RIFF and MP4/ftyp need an offset
// check for their inner tag.
const SIGNATURES = [
  { type: "jpeg", family: "image", bytes: [0xff, 0xd8, 0xff], ext: [".jpg", ".jpeg"] },
  { type: "png", family: "image", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], ext: [".png"] },
  { type: "gif", family: "image", bytes: [0x47, 0x49, 0x46, 0x38], ext: [".gif"] },
  { type: "pdf", family: "document", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d], ext: [".pdf"] }, // %PDF-
];

const startsWith = (buf, bytes, offset = 0) => {
  if (!buf || buf.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i += 1) {
    if (buf[offset + i] !== bytes[i]) return false;
  }
  return true;
};

// WEBP = "RIFF"...."WEBP"; detected structurally (RIFF container + WEBP fourcc).
const isWebp = (buf) =>
  startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && // RIFF
  buf.length >= 12 &&
  startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8); // WEBP at offset 8

// MP4/MOV/M4V = ....'ftyp' at offset 4 (ISO base media file format).
const isMp4 = (buf) => buf && buf.length >= 12 && startsWith(buf, [0x66, 0x74, 0x79, 0x70], 4);

// Executable / archive magic we ALWAYS reject even if the extension looks fine.
const DANGEROUS = [
  { type: "elf", bytes: [0x7f, 0x45, 0x4c, 0x46] }, // ELF
  { type: "pe", bytes: [0x4d, 0x5a] }, // MZ (Windows PE/EXE/DLL)
  { type: "shebang", bytes: [0x23, 0x21] }, // #! script
  { type: "zip", bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK.. (zip/jar/docx container — see note)
];

/**
 * Detect the actual content type from the leading bytes. Returns
 * `{ type, family }` or `{ type: "unknown", family: "unknown" }`.
 * @param {Buffer} buffer
 */
function sniffType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { type: "empty", family: "unknown" };
  }
  for (const sig of SIGNATURES) {
    if (startsWith(buffer, sig.bytes, sig.offset || 0)) {
      return { type: sig.type, family: sig.family };
    }
  }
  if (isWebp(buffer)) return { type: "webp", family: "image" };
  if (isMp4(buffer)) return { type: "mp4", family: "video" };
  for (const d of DANGEROUS) {
    if (startsWith(buffer, d.bytes)) return { type: d.type, family: "dangerous" };
  }
  return { type: "unknown", family: "unknown" };
}

const MIME_FAMILY = (mime = "") => {
  const m = String(mime).toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m === "application/pdf") return "document";
  return "other";
};

/**
 * Verify a buffer's real (magic-byte) type is allowed AND consistent with the
 * declared MIME family. REJECTS: empty, dangerous (ELF/PE/script/zip), unknown,
 * and family mismatch (e.g. declared image, real PDF).
 * @param {Buffer} buffer
 * @param {string} declaredMime
 * @returns {{ ok: boolean, detected: string, family: string, reason?: string }}
 */
function verifyMagicBytes(buffer, declaredMime) {
  const { type, family } = sniffType(buffer);
  if (type === "empty") return { ok: false, detected: type, family, reason: "empty_file" };
  if (family === "dangerous") {
    return { ok: false, detected: type, family, reason: `dangerous_signature_${type}` };
  }
  if (family === "unknown") {
    // Fail closed: an unrecognized signature is not provably safe.
    return { ok: false, detected: type, family, reason: "unrecognized_signature" };
  }
  const declaredFamily = MIME_FAMILY(declaredMime);
  if (declaredFamily !== "other" && declaredFamily !== family) {
    return {
      ok: false,
      detected: type,
      family,
      reason: `family_mismatch_declared_${declaredFamily}_actual_${family}`,
    };
  }
  return { ok: true, detected: type, family };
}

// ── Pluggable malware scanner ─────────────────────────────────────────────────
// A scanner is `async (buffer, ctx) => { verdict: "clean"|"infected"|"error", signature? }`.
// Default: returns "error" (no scanner wired) — combined with fail-closed policy
// below, an upload is only allowed through when the magic-byte gate passes AND
// (a scanner reports clean OR scanning is explicitly not required).
let _scanner = null;

/** Wire a real scanner (ClamAV / scanning service). */
function setScanner(fn) {
  _scanner = typeof fn === "function" ? fn : null;
}

/**
 * Quarantine-first scan of an in-memory buffer.
 *
 * Policy (fail-closed):
 *   - magic-byte gate fails            → reject (reason from the gate)
 *   - scanner reports "infected"       → reject (malware)
 *   - scanner reports "clean"          → accept
 *   - scanner "error"/timeout/missing  → REJECT, UNLESS
 *       process.env.UPLOAD_SCAN_REQUIRED === "false" (dev/rollout opt-out), in
 *       which case the magic-byte gate result alone decides. This keeps prod
 *       fail-closed while letting a scanner-less dev box still function.
 *
 * @param {Buffer} buffer
 * @param {object} [opts]
 * @param {string} [opts.declaredMime]
 * @param {number} [opts.timeoutMs=15000]
 * @returns {Promise<{ clean: boolean, reason?: string, detected?: string }>}
 */
async function scanBuffer(buffer, { declaredMime, timeoutMs = 15000 } = {}) {
  const gate = verifyMagicBytes(buffer, declaredMime);
  if (!gate.ok) return { clean: false, reason: gate.reason, detected: gate.detected };

  const scanRequired = process.env.UPLOAD_SCAN_REQUIRED !== "false";

  if (!_scanner) {
    // No scanner wired. Fail closed only when scanning is required.
    return scanRequired
      ? { clean: false, reason: "scanner_unavailable", detected: gate.detected }
      : { clean: true, detected: gate.detected };
  }

  let verdict;
  try {
    verdict = await Promise.race([
      _scanner(buffer, { declaredMime, detected: gate.detected }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("scan_timeout")), timeoutMs)
      ),
    ]);
  } catch (err) {
    return scanRequired
      ? { clean: false, reason: err.message === "scan_timeout" ? "scan_timeout" : "scan_error", detected: gate.detected }
      : { clean: true, detected: gate.detected };
  }

  if (verdict?.verdict === "infected") {
    return { clean: false, reason: `malware_${verdict.signature || "detected"}`, detected: gate.detected };
  }
  if (verdict?.verdict === "clean") {
    return { clean: true, detected: gate.detected };
  }
  // Indeterminate verdict → fail closed (unless not required).
  return scanRequired
    ? { clean: false, reason: "scan_indeterminate", detected: gate.detected }
    : { clean: true, detected: gate.detected };
}

module.exports = {
  sniffType,
  verifyMagicBytes,
  scanBuffer,
  setScanner,
  SIGNATURES,
};
