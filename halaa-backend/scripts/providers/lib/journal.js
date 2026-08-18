const fs = require("node:fs");
const path = require("node:path");
const { ensureDirectory } = require("./files");

const ALLOWED_STATUSES = new Set(["started", "completed", "failed", "skipped"]);

function appendJournal(filePath, record) {
  if (!ALLOWED_STATUSES.has(record.status)) throw new Error(`Invalid journal status: ${record.status}`);
  ensureDirectory(path.dirname(filePath));
  const safeRecord = {
    at: new Date().toISOString(),
    planHash: record.planHash,
    operationId: record.operationId,
    provider: record.provider,
    action: record.action,
    key: record.key,
    status: record.status,
    httpStatus: record.httpStatus || null,
    errorCode: record.errorCode || null,
  };
  fs.appendFileSync(filePath, `${JSON.stringify(safeRecord)}\n`, "utf8");
}

function readJournal(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function completedOperationIds(filePath, planHash) {
  return new Set(
    readJournal(filePath)
      .filter((record) => record.planHash === planHash && record.status === "completed")
      .map((record) => record.operationId),
  );
}

module.exports = { appendJournal, readJournal, completedOperationIds };
