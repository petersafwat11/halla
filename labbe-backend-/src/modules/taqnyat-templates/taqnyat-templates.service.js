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

  const seenIds = new Set();
  const upserted = [];
  for (const t of upstream) {
    const taqnyatId = t.id || t.template_id || t.name; // Meta sometimes returns no `id`; fall back to name
    if (!taqnyatId) continue;
    seenIds.add(String(taqnyatId));

    const bodyComponent = (t.components || []).find((c) => c.type === "BODY") || {};
    const hasImageHeader = (t.components || []).some(
      (c) => c.type === "HEADER" && c.format === "IMAGE"
    );

    // Preserve admin-curated fields on update (`category`, `varMapping`,
    // `active`, `sortOrder`). Only refresh the upstream-derived fields.
    // `removedFromMeta` is forced false on every successful match so a
    // re-approved template comes back into the host wizard automatically.
    const filter = { taqnyatId: String(taqnyatId) };
    const update = {
      $set: {
        templateName: t.name,
        language: t.language || "ar",
        status: (t.status || "APPROVED").toUpperCase(),
        metaCategory: t.category || null,
        bodyText: bodyComponent.text || "",
        hasImageHeader: !!hasImageHeader,
        removedFromMeta: false,
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

  // Soft-delete: mark cached templates that no longer exist upstream so
  // the host wizard stops surfacing them. Admin assignments stay intact.
  const orphanResult = await TaqnyatTemplate.updateMany(
    { taqnyatId: { $nin: [...seenIds] }, removedFromMeta: { $ne: true } },
    { $set: { removedFromMeta: true, lastSyncedAt: new Date() } }
  );

  if (actor?._id) {
    try {
      await logAudit({
        action: "taqnyat_template.sync",
        actor,
        targetType: "taqnyat_template",
        metadata: {
          upstreamCount: upstream.length,
          upsertedCount: upserted.length,
          orphanedCount: orphanResult.modifiedCount || 0,
        },
      });
    } catch (_) {
      /* swallow audit failure */
    }
  }

  return {
    upserted,
    count: upserted.length,
    orphanedCount: orphanResult.modifiedCount || 0,
  };
}

/** Host-facing list (filtered by category, only active + APPROVED + present upstream). */
async function listForHost({ category } = {}) {
  const query = {
    active: true,
    status: "APPROVED",
    removedFromMeta: { $ne: true },
  };
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

/**
 * Build a Taqnyat WhatsApp template `components[]` payload from the
 * simple admin form. Supports text-only header, body with `{{N}}`
 * placeholders + per-placeholder example values, optional footer.
 * Image-header templates are out of scope here — those need media upload
 * and live in the dedicated submitWeddingTemplate.js script flow.
 */
function buildComponents({ headerText, bodyText, bodyExamples, footerText }) {
  const components = [];

  if (headerText) {
    components.push({ type: "HEADER", format: "TEXT", text: headerText });
  }

  // Body is required by Meta. Detect placeholders to validate examples.
  const placeholders = (bodyText.match(/\{\{\d+\}\}/g) || []);
  const uniqueCount = new Set(placeholders).size;
  const bodyComponent = { type: "BODY", text: bodyText };

  if (uniqueCount > 0) {
    if (!Array.isArray(bodyExamples) || bodyExamples.length !== uniqueCount) {
      throw new ValidationError(
        `bodyExamples must contain exactly ${uniqueCount} value(s) — one per {{N}} placeholder`
      );
    }
    bodyComponent.example = { body_text: [bodyExamples.map(String)] };
  }
  components.push(bodyComponent);

  if (footerText) {
    components.push({ type: "FOOTER", text: footerText });
  }

  return components;
}

const VALID_CATEGORIES = ["UTILITY", "MARKETING", "AUTHENTICATION"];
const TEMPLATE_NAME_REGEX = /^[a-z][a-z0-9_]{0,511}$/;

/**
 * Submit a new template to Meta via Taqnyat and cache it locally as
 * PENDING. The cached row is materialised immediately so the admin sees
 * the submission in the table without waiting for the next sync; status
 * polling (the existing 30-min cron) flips it to APPROVED/REJECTED.
 */
async function createUpstreamTemplate(payload, actor) {
  const { name, category, language = "ar", headerText, bodyText, bodyExamples, footerText } = payload || {};

  if (!name || !TEMPLATE_NAME_REGEX.test(name)) {
    throw new ValidationError(
      "Template name must be lowercase, start with a letter, contain only letters/digits/underscores, max 512 chars"
    );
  }
  if (!VALID_CATEGORIES.includes(category)) {
    throw new ValidationError(`category must be one of ${VALID_CATEGORIES.join(", ")}`);
  }
  if (!bodyText || !bodyText.trim()) {
    throw new ValidationError("bodyText is required");
  }

  const components = buildComponents({ headerText, bodyText, bodyExamples, footerText });

  const result = await taqnyat.createTemplate(name, category, language, components, {
    allowCategoryChange: true,
  });
  if (!result.success) {
    throw new Error(`Taqnyat create failed: ${result.error || "unknown"}`);
  }

  const taqnyatId = result.templateId || name;
  const status = (typeof result.status === "string" ? result.status : "PENDING").toUpperCase();

  const doc = await TaqnyatTemplate.findOneAndUpdate(
    { taqnyatId: String(taqnyatId) },
    {
      $set: {
        templateName: name,
        language,
        status,
        metaCategory: category,
        bodyText,
        hasImageHeader: false,
        removedFromMeta: false,
        lastSyncedAt: new Date(),
      },
      $setOnInsert: {
        category: null,
        varMapping: [],
        active: true,
        sortOrder: 0,
        createdBy: actor?._id || null,
      },
    },
    { upsert: true, new: true }
  );

  try {
    await logAudit({
      action: "taqnyat_template.create",
      actor,
      targetType: "taqnyat_template",
      targetId: doc._id,
      metadata: { templateName: name, category, language, status },
    });
  } catch (_) {
    /* swallow */
  }

  return doc;
}

/**
 * Delete a template upstream on Meta and remove the local cache row.
 * Hard-delete by design — admin's intent is "gone everywhere". Events
 * referencing the template by taqnyatId will fail at send time;
 * callers should warn the admin in the UI before invoking this.
 */
async function deleteUpstreamTemplate(id, actor) {
  const doc = await TaqnyatTemplate.findById(id);
  if (!doc) throw new NotFoundError("TaqnyatTemplate");

  const result = await taqnyat.deleteTemplate(doc.templateName, doc.taqnyatId);

  // Upstream "already gone" responses (Object not found, not_found, etc.)
  // mean the template doesn't exist on Meta anymore — usually because it
  // was deleted via the Taqnyat dashboard or a prior partial run. Treat
  // those as successful from the user's perspective and proceed with the
  // local cleanup so the row stops haunting the admin table.
  const isAlreadyGone =
    !result.success &&
    /not[\s_]?found|already[\s_]?deleted|does\s?not\s?exist/i.test(
      String(result.error || "")
    );

  if (!result.success && !isAlreadyGone) {
    throw new Error(`Taqnyat delete failed: ${result.error || "unknown"}`);
  }

  await TaqnyatTemplate.deleteOne({ _id: doc._id });

  try {
    await logAudit({
      action: "taqnyat_template.delete",
      actor,
      targetType: "taqnyat_template",
      targetId: doc._id,
      metadata: {
        templateName: doc.templateName,
        taqnyatId: doc.taqnyatId,
        upstreamAlreadyGone: isAlreadyGone,
      },
    });
  } catch (_) {
    /* swallow */
  }

  return {
    deleted: true,
    templateName: doc.templateName,
    upstreamAlreadyGone: isAlreadyGone,
  };
}

module.exports = {
  syncFromTaqnyat,
  listForHost,
  listForAdmin,
  assignMapping,
  createUpstreamTemplate,
  deleteUpstreamTemplate,
};
