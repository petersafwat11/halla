// Bounded operational diagnostics; never include provider payloads or guest data.
function safeText(value) {
  return String(value || '').replace(/https?:\/\/[^\s]+/gi, '[url]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(?:Bearer\s+|token[=: ]+)[^\s,;]+/gi, '[credential]')
    .replace(/\+?\d[\d ()-]{8,}\d/g, '[number]').slice(0, 400);
}
function dispatchDiagnostic(error) {
  return {
    code: safeText(error?.code || 'UNEXPECTED_DISPATCH_ERROR'),
    name: safeText(error?.name || 'Error'),
    stage: safeText(error?.dispatchStage || 'batch_or_idempotency'),
    message: safeText(error?.message || error),
    statusCode: Number(error?.statusCode || error?.status) || null,
    frames: String(error?.stack || '').split('\n').slice(1, 5).map(safeText),
  };
}
module.exports = { dispatchDiagnostic };
