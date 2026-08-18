const fs = require("node:fs");
const path = require("node:path");

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDirectory(path.dirname(filePath));
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function writeText(filePath, value) {
  ensureDirectory(path.dirname(filePath));
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, value, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isWithin(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

module.exports = { ensureDirectory, writeJson, writeText, readJson, isWithin };
