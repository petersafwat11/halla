const crypto = require("node:crypto");

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function makeOperation(provider, phase, action, key, payload) {
  return {
    id: sha256(`${provider}\0${phase}\0${action}\0${key}`).slice(0, 24),
    provider,
    phase,
    action,
    key,
    payload,
  };
}

function sealPlan(plan) {
  const unsealed = { ...plan };
  delete unsealed.planHash;
  return { ...unsealed, planHash: sha256(canonicalJson(unsealed)) };
}

function verifyPlan(plan) {
  if (!plan || typeof plan !== "object" || !plan.planHash) return false;
  return sealPlan(plan).planHash === plan.planHash;
}

module.exports = { canonicalize, canonicalJson, sha256, makeOperation, sealPlan, verifyPlan };
