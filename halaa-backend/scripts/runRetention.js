#!/usr/bin/env node
const { connectDB, disconnectDB } = require("../src/config/database");
const { runRetention } = require("../src/modules/privacy/retention.service");

async function main() {
  const execute = process.argv.includes("--execute");
  const dryRun = !execute;
  const batchArg = process.argv.find((arg) => arg.startsWith("--batch="));
  const batchSize = batchArg ? Number(batchArg.split("=")[1]) : 250;
  if (execute && process.env.RETENTION_EXECUTION_CONFIRMED !== "true") {
    throw new Error("execute requires RETENTION_EXECUTION_CONFIRMED=true; run dry-run first");
  }
  await connectDB();
  const run = await runRetention({ dryRun, batchSize });
  console.log(JSON.stringify({ runId: run.runId, mode: run.mode, status: run.status, policyHash: run.policyHash, results: run.results }, null, 2));
  if (run.status !== "completed") process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => disconnectDB().catch(() => {}));
