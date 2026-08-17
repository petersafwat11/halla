/**
 * Platform-pure vCard (.vcf) parser.
 *
 * Extracts name + phone numbers from a vCard file's text. I/O (file picker /
 * reading the file) stays per-app: web uses FileReader, mobile uses
 * expo-document-picker + expo-file-system. This module only turns text into
 * `[{ name, phones }]`; each app then Saudi-normalizes + dedupes via its own
 * `normalizeSaudiMobile`.
 *
 * Handles: multiple VCARD blocks, FN (preferred) with N fallback, TEL in
 * both plain (`TEL;TYPE=CELL:...`) and vCard-4 URI (`TEL:tel:+966...`) forms,
 * RFC line folding, and best-effort QUOTED-PRINTABLE decoding (old Android
 * 2.1 exports use it for Arabic names).
 */

function decodeQuotedPrintable(str) {
  try {
    const bytes = [];
    for (let i = 0; i < str.length; i += 1) {
      if (str[i] === "=" && i + 2 < str.length) {
        const hex = str.substr(i + 1, 2);
        if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
          bytes.push(parseInt(hex, 16));
          i += 2;
          continue;
        }
      }
      bytes.push(str.charCodeAt(i) & 0xff);
    }
    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
    }
    return String.fromCharCode(...bytes);
  } catch (_) {
    return str;
  }
}

/**
 * @param {string} text - raw .vcf file contents
 * @returns {Array<{ name: string, phones: string[] }>}
 */
export function parseVCards(text) {
  if (!text || typeof text !== "string") return [];

  // Normalize EOLs, then unfold:
  //  - RFC 6350 folding: continuation lines begin with a space/tab.
  //  - QUOTED-PRINTABLE soft breaks: a line ending in "=" continues.
  const unfolded = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, "")
    .replace(/=\n/g, "");

  const lines = unfolded.split("\n");
  const cards = [];
  let cur = null;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line) continue;
    const upper = line.toUpperCase();

    if (upper === "BEGIN:VCARD") {
      cur = { name: "", phones: [] };
      continue;
    }
    if (upper === "END:VCARD") {
      if (cur && (cur.name || cur.phones.length)) cards.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;

    const colon = line.indexOf(":");
    if (colon === -1) continue;

    const rawKey = line.slice(0, colon);
    let value = line.slice(colon + 1);
    const keyName = rawKey.split(";")[0].toUpperCase();
    const keyUpper = rawKey.toUpperCase();

    if (keyUpper.includes("ENCODING=QUOTED-PRINTABLE")) {
      value = decodeQuotedPrintable(value);
    }

    if (keyName === "FN") {
      const v = value.trim();
      if (v) cur.name = v; // FN wins over any N already captured
    } else if (keyName === "N") {
      if (!cur.name) {
        // N is Family;Given;Additional;Prefix;Suffix → "Given Family"
        const parts = value.split(";").map((p) => p.trim());
        const assembled = [parts[1], parts[0]].filter(Boolean).join(" ").trim();
        if (assembled) cur.name = assembled;
      }
    } else if (keyName === "TEL") {
      const cleaned = value.replace(/^tel:/i, "").trim();
      if (cleaned) cur.phones.push(cleaned);
    }
  }

  return cards;
}

export default parseVCards;
