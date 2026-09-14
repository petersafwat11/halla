/** Remove unreferenced template files from persistent VPS storage. Dry-run by default. */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "..", "config.env") });
const Template = require("../models/TemplateModel");
const {
  getLocalUploadRoot,
  normalizeObjectKey,
  resolveLocalPath,
} = require("../src/shared/utils/localStorage");

const APPLY = process.argv.includes("--apply");
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

async function walk(directory) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return nested.flat();
}

async function main() {
  await mongoose.connect(process.env.DATABASE, {
    tlsCertificateKeyFile: process.env.DATABASE_CERT_PATH || undefined,
  });
  const templateRoot = resolveLocalPath("templates");
  const cutoff = Date.now() - MAX_AGE_MS;
  const files = await walk(templateRoot);
  const oldFiles = [];
  for (const file of files) {
    const stat = await fs.promises.stat(file);
    if (stat.mtimeMs < cutoff) {
      oldFiles.push(path.relative(getLocalUploadRoot(), file).split(path.sep).join("/"));
    }
  }
  const known = new Set(
    (await Template.find({}, { imageRef: 1, thumbnailRef: 1 }).lean())
      .flatMap((template) => [template.imageRef, template.thumbnailRef])
      .map(normalizeObjectKey)
      .filter(Boolean),
  );
  const orphans = oldFiles.filter((key) => !known.has(key));
  console.log(JSON.stringify({ apply: APPLY, scanned: oldFiles.length, orphans: orphans.length }));
  if (APPLY) {
    for (const key of orphans) await fs.promises.unlink(resolveLocalPath(key));
  }
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
