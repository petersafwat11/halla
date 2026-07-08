/**
 * Upload magic-byte + malware-scan policy tests (UGC-04 · P1-05).
 * Pure unit tests — no DB, no S3. Includes malicious fixtures (spoofed
 * Content-Type, executable/script/zip payloads, family mismatch, EICAR-style
 * scanner verdict) and the fail-closed behavior.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  sniffType,
  verifyMagicBytes,
  scanBuffer,
  setScanner,
} = require("../src/shared/utils/uploadScan");

// ── fixtures ──────────────────────────────────────────────────────────────────
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const pdf = Buffer.from("%PDF-1.7\n%âãÏÓ", "binary");
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBP"), Buffer.from("VP8 ")]);
const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftyp"), Buffer.from("isom")]);
const elf = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]); // ELF exe
const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ / Windows PE
const script = Buffer.from("#!/bin/sh\nrm -rf /\n", "utf8");
const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
const empty = Buffer.alloc(0);

test.afterEach(() => setScanner(null));

test("sniffType detects real image/video/document types", () => {
  assert.equal(sniffType(jpeg).type, "jpeg");
  assert.equal(sniffType(png).type, "png");
  assert.equal(sniffType(pdf).type, "pdf");
  assert.equal(sniffType(webp).type, "webp");
  assert.equal(sniffType(mp4).type, "mp4");
});

test("verifyMagicBytes accepts a real JPEG declared as image/jpeg", () => {
  const v = verifyMagicBytes(jpeg, "image/jpeg");
  assert.equal(v.ok, true);
  assert.equal(v.family, "image");
});

test("REJECT: spoofed Content-Type — PDF bytes declared as image/jpeg", () => {
  const v = verifyMagicBytes(pdf, "image/jpeg");
  assert.equal(v.ok, false);
  assert.match(v.reason, /family_mismatch/);
});

test("REJECT: executable payloads regardless of extension/MIME", () => {
  for (const [name, buf] of [["elf", elf], ["pe", exe], ["script", script], ["zip", zip]]) {
    const v = verifyMagicBytes(buf, "image/jpeg");
    assert.equal(v.ok, false, `${name} must be rejected`);
  }
  assert.match(verifyMagicBytes(elf, "image/jpeg").reason, /dangerous_signature/);
});

test("REJECT: empty file and unrecognized signature (fail closed)", () => {
  assert.equal(verifyMagicBytes(empty, "image/jpeg").ok, false);
  const junk = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
  const v = verifyMagicBytes(junk, "image/png");
  assert.equal(v.ok, false);
  assert.equal(v.reason, "unrecognized_signature");
});

test("scanBuffer: clean image passes when no scanner required", async () => {
  process.env.UPLOAD_SCAN_REQUIRED = "false";
  const r = await scanBuffer(jpeg, { declaredMime: "image/jpeg" });
  assert.equal(r.clean, true);
  delete process.env.UPLOAD_SCAN_REQUIRED;
});

test("scanBuffer: FAIL-CLOSED when scanner required but none wired", async () => {
  process.env.UPLOAD_SCAN_REQUIRED = "true";
  const r = await scanBuffer(jpeg, { declaredMime: "image/jpeg" });
  assert.equal(r.clean, false);
  assert.equal(r.reason, "scanner_unavailable");
  delete process.env.UPLOAD_SCAN_REQUIRED;
});

test("scanBuffer: infected verdict rejects (malware fixture)", async () => {
  setScanner(async () => ({ verdict: "infected", signature: "EICAR-Test" }));
  const r = await scanBuffer(jpeg, { declaredMime: "image/jpeg" });
  assert.equal(r.clean, false);
  assert.match(r.reason, /malware_EICAR-Test/);
});

test("scanBuffer: clean verdict accepts", async () => {
  setScanner(async () => ({ verdict: "clean" }));
  const r = await scanBuffer(png, { declaredMime: "image/png" });
  assert.equal(r.clean, true);
});

test("scanBuffer: scanner timeout fails closed when required", async () => {
  process.env.UPLOAD_SCAN_REQUIRED = "true";
  setScanner(() => new Promise((resolve) => setTimeout(() => resolve({ verdict: "clean" }), 50)));
  const r = await scanBuffer(jpeg, { declaredMime: "image/jpeg", timeoutMs: 5 });
  assert.equal(r.clean, false);
  assert.equal(r.reason, "scan_timeout");
  delete process.env.UPLOAD_SCAN_REQUIRED;
});

test("scanBuffer: magic-byte gate runs BEFORE the scanner (dangerous payload never scanned)", async () => {
  let scanned = false;
  setScanner(async () => { scanned = true; return { verdict: "clean" }; });
  const r = await scanBuffer(exe, { declaredMime: "image/jpeg" });
  assert.equal(r.clean, false);
  assert.equal(scanned, false, "scanner must not be reached for a rejected magic-byte gate");
});
