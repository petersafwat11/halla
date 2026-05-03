/**
 * Taqnyat Templates Service — Phase 4c W0-MODEL
 *
 * Three responsibilities:
 *   1. Sync the Taqnyat `/templates/` upstream into our cache
 *      (`syncFromTaqnyat`). Runs from the daily cron + the admin Sync
 *      button.
 *   2. Serve the host StepFour list — filtered by category, only active
 *      + APPROVED rows (`listForHost`).
 *   3. Serve the admin table (`listForAdmin`) and accept var-mapping +
 *      category assignments (`assignMapping`).
 *
 * @module modules/taqnyat-templates/taqnyat-templates.service
 */

const TaqnyatTemplate = require("../../../models/TaqnyatTemplateModel");
const taqnyat = require("../../infrastructure/taqnyat");
const { logAudit } = require("../../shared/utils/auditLog");
const { NotFoundError, ValidationError } = require("../../shared/errors");

/**
 * Pull the full template list from Taqnyat and upsert into the cache.
 * Returns the upserted documents (post-write).
 */
async function syncFromTaqnyat({ actor } = {}) {
  const result = await taqnyat.getTemplates();
  if (!result.success) {
    throw new Error(`Taqnyat sync failed: ${result.error || "unknown"}`);
  }

  const upstream = result.templates || [];

  const upserted = [];
  for (const t of upstream) {
    const taqnyatId = t.id || t.template_id || t.name; // Meta sometimes returns no `id`; fall back to name
    if (!taqnyatId) continue;

    const bodyComponent = (t.components || []).find((c) => c.type === "BODY") || {};
    const hasImageHeader = (t.components || []).some(
      (c) => c.type === "HEADER" && c.format === "IMAGE"
    );

    // Preserve admin-curated fields on update (`category`, `varMapping`,
    // `active`, `sortOrder`). Only refresh the upstream-derived fields.
    const filter = { taqnyatId: String(taqnyatId) };
    const update = {
      $set: {
        templateName: t.name,
        language: t.language || "ar",
        status: (t.status || "APPROVED").toUpperCase(),
        metaCategory: t.category || null,
        bodyText: bodyComponent.text || "",
        hasImageHeader: !!hasImageHeader,
        lastSyncedAt: new Date(),
      },
      $setOnInsert: {
        category: null,
        varMapping: [],
        active: true,
        sortOrder: 0,
        createdBy: actor?._id || null,
      },
    };

    const doc = await TaqnyatTemplate.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
    });
    upserted.push(doc);
  }

  if (actor?._id) {
    try {
      await logAudit({
        action: "taqnyat_template.sync",
        actor,
        targetType: "taqnyat_template",
        metadata: { upstreamCount: upstream.length, upsertedCount: upserted.length },
      });
    } catch (_) {
      /* swallow audit failure */
    }
  }

  return { upserted, count: upserted.length };
}

/** Host-facing list (filtered by category, only active + APPROVED). */
async function listForHost({ category } = {}) {
  const query = { active: true, status: "APPROVED" };
  if (category) query.category = category;

  const docs = await TaqnyatTemplate.find(query)
    .sort({ sortOrder: 1, createdAt: -1 })
    .select("-createdBy -updatedBy -__v")
    .lean();

  return docs;
}

/** Admin-facing list (every row, including inactive). */
async function listForAdmin({ search, includeInactive = true } = {}) {
  const query = {};
  if (!includeInactive) query.active = true;
  if (search) {
    const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { templateName: { $regex: escaped, $options: "i" } },
      { bodyText: { $regex: escaped, $options: "i" } },
    ];
  }

  return TaqnyatTemplate.find(query).sort({ sortOrder: 1, createdAt: -1 }).lean();
}

/**
 * Admin assigns category + per-`{{N}}` var mapping.
 *
 * @param {string} id
 * @param {{ category?: string, varMapping?: Array, active?: boolean, sortOrder?: number }} updates
 */
async function assignMapping(id, updates, actor) {
  const doc = await TaqnyatTemplate.findById(id);
  if (!doc) throw new NotFoundError("TaqnyatTemplate");

  if (updates.varMapping !== undefined) {
    if (!Array.isArray(updates.varMapping)) {
      throw new ValidationError("varMapping must be an array");
    }
    for (const m of updates.varMapping) {
      if (!m.placeholder || !m.sourceKey) {
        throw new ValidationError("Each varMapping entry needs placeholder + sourceKey");
      }
    }
    doc.varMapping = updates.varMapping;
  }
  if (updates.category !== undefined) doc.category = updates.category || null;
  if (updates.active !== undefined) doc.active = !!updates.active;
  if (typeof updates.sortOrder === "number") doc.sortOrder = updates.sortOrder;

  doc.updatedBy = actor?._id || null;
  await doc.save();

  try {
    await logAudit({
      action: "taqnyat_template.assign",
      actor,
      targetType: "taqnyat_template",
      targetId: doc._id,
      metadata: {
        templateName: doc.templateName,
        category: doc.category,
        varMappingCount: doc.varMapping.length,
      },
    });
  } catch (_) {
    /* swallow */
  }

  return doc;
}

module.exports = {
  syncFromTaqnyat,
  listForHost,
  listForAdmin,
  assignMapping,
};
