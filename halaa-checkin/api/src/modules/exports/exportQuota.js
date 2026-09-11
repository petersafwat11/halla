import mongoose from 'mongoose';

// Write FIRST in the enqueue transaction. Write-conflict retries serialize
// creators across events/admins. Jobs themselves are the capacity ledger, so
// crashes, repeated expiry and cleanup never leak or invent slots.
const schema = new mongoose.Schema({ _id: String, revision: { type: Number, default: 0 } });
export const ExportQuota = mongoose.models.ExportQuota || mongoose.model('ExportQuota', schema);
export async function ensureExportQueueFence() {
  try {
    await ExportQuota.updateOne({ _id: 'global' }, { $setOnInsert: { revision: 0 } }, { upsert: true });
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
}
export async function lockExportQueue(session) {
  const result = await ExportQuota.updateOne({ _id: 'global' }, { $inc: { revision: 1 } }, { session });
  if (result.matchedCount !== 1) throw new Error('Export queue fence is missing');
}
