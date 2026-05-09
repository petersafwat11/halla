/**
 * Taqnyat Templates service — sync upstream cache, host filtered list,
 * admin list / assign / create / delete.
 *
 * @module modules/taqnyat-templates/taqnyat-templates.service
 */

const TaqnyatTemplate = require('../../../models/TaqnyatTemplateModel');
const taqnyat = require('../../infrastructure/taqnyat');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const { AppError, NotFoundError, ValidationError } = require('../../shared/errors');

const safeAudit = async (entry) => {
  try {
    await logAudit(entry);
  } catch (err) {
    logger.warn('taqnyat audit log failed', { action: entry?.action, err: err?.message });
  }
};

/**
 * Pull the full template list from Taqnyat and upsert into the cache.
 */
async function syncFromTaqnyat({ actor } = {}) {
  const result = await taqnyat.getTemplates();
  if (!result.success) {
    throw new AppError(
      `Taqnyat sync failed: ${result.error || 'unknown'}`,
      502,
      'TAQNYAT_UPSTREAM_FAILED'
    );
  }

  const upstream = result.templates || [];

  // Outage protection: if Meta returned an empty list, skip the orphan
  // soft-delete pass — otherwise we'd mass-mark every cached template
  // as removed and the host wizard would empty out.
  if (upstream.length === 0) {
    logger.warn('taqnyat sync returned empty list — skipping orphan pass to avoid mass soft-delete');
    await safeAudit({
      action: 'taqnyat_template.sync',
      actor,
      targetType: 'taqnyat_template',
      metadata: { upstreamCount: 0, upsertedCount: 0, orphanedCount: 0, skippedOrphanPass: true },
    });
    return { upserted: [], count: 0, orphanedCount: 0, skippedOrphanPass: true };
  }

  const seenIds = new Set();
  const upserted = [];
  for (const t of upstream) {
    const taqnyatId = t.id || t.template_id || t.name;
    if (!taqnyatId) continue;
    seenIds.add(String(taqnyatId));

    const bodyComponent = (t.components || []).find((c) => c.type === 'BODY') || {};
    const hasImageHeader = (t.components || []).some(
      (c) => c.type === 'HEADER' && c.format === 'IMAGE'
    );

    // Preserve admin-curated fields (`category`, `varMapping`, `active`,
    // `sortOrder`) on update. `removedFromMeta` is forced false so a
    // re-approved template comes back into the host wizard automatically.
    const filter = { taqnyatId: String(taqnyatId) };
    const update = {
      $set: {
        templateName: t.name,
        language: t.language || 'ar',
        status: (t.status || 'APPROVED').toUpperCase(),
        metaCategory: t.category || null,
        bodyText: bodyComponent.text || '',
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

  // Soft-delete templates that no longer exist upstream so the host
  // wizard stops surfacing them; admin assignments stay intact.
  const orphanResult = await TaqnyatTemplate.updateMany(
    { taqnyatId: { $nin: [...seenIds] }, removedFromMeta: { $ne: true } },
    { $set: { removedFromMeta: true, lastSyncedAt: new Date() } }
  );

  if (actor?._id) {
    await safeAudit({
      action: 'taqnyat_template.sync',
      actor,
      targetType: 'taqnyat_template',
      metadata: {
        upstreamCount: upstream.length,
        upsertedCount: upserted.length,
        orphanedCount: orphanResult.modifiedCount || 0,
      },
    });
  }

  return {
    upserted,
    count: upserted.length,
    orphanedCount: orphanResult.modifiedCount || 0,
  };
}

async function listForHost({ category } = {}) {
  const query = {
    active: true,
    status: 'APPROVED',
    removedFromMeta: { $ne: true },
  };
  if (category) query.category = category;

  return TaqnyatTemplate.find(query)
    .sort({ sortOrder: 1, createdAt: -1 })
    .select('-createdBy -updatedBy -__v')
    .lean();
}

async function listForAdmin({ search, includeInactive = true } = {}) {
  const query = {};
  if (!includeInactive) query.active = true;
  if (search) {
    const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { templateName: { $regex: escaped, $options: 'i' } },
      { bodyText: { $regex: escaped, $options: 'i' } },
    ];
  }

  return TaqnyatTemplate.find(query).sort({ sortOrder: 1, createdAt: -1 }).lean();
}

async function assignMapping(id, updates, actor) {
  const doc = await TaqnyatTemplate.findById(id);
  if (!doc) throw new NotFoundError('TaqnyatTemplate');

  if (updates.varMapping !== undefined) doc.varMapping = updates.varMapping;
  if (updates.category !== undefined) doc.category = updates.category || null;
  if (updates.active !== undefined) doc.active = !!updates.active;
  if (typeof updates.sortOrder === 'number') doc.sortOrder = updates.sortOrder;

  doc.updatedBy = actor?._id || null;
  await doc.save();

  await safeAudit({
    action: 'taqnyat_template.assign',
    actor,
    targetType: 'taqnyat_template',
    targetId: doc._id,
    metadata: {
      templateName: doc.templateName,
      category: doc.category,
      varMappingCount: doc.varMapping.length,
    },
  });

  return doc;
}

/**
 * Build a Taqnyat WhatsApp `components[]` payload from the admin form.
 * Image-header templates use the dedicated submitWeddingTemplate.js flow.
 */
function buildComponents({ headerText, bodyText, bodyExamples, footerText }) {
  const components = [];

  if (headerText) {
    components.push({ type: 'HEADER', format: 'TEXT', text: headerText });
  }

  // Body is required by Meta. Zod has already validated examples count
  // matches placeholder count; this is the runtime-formatting step.
  const placeholders = bodyText.match(/\{\{\d+\}\}/g) || [];
  const uniqueCount = new Set(placeholders).size;
  const bodyComponent = { type: 'BODY', text: bodyText };

  if (uniqueCount > 0) {
    if (!Array.isArray(bodyExamples) || bodyExamples.length !== uniqueCount) {
      // Defence-in-depth: Zod already enforces this, but keep the
      // invariant local so the upstream call can never go out malformed.
      throw new ValidationError(
        `bodyExamples must contain exactly ${uniqueCount} value(s) — one per {{N}} placeholder`
      );
    }
    bodyComponent.example = { body_text: [bodyExamples.map(String)] };
  }
  components.push(bodyComponent);

  if (footerText) {
    components.push({ type: 'FOOTER', text: footerText });
  }

  return components;
}

/**
 * Submit a new template to Meta via Taqnyat and cache it locally as
 * PENDING. The cron polls status and flips it to APPROVED/REJECTED.
 */
async function createUpstreamTemplate(payload, actor) {
  const { name, category, language = 'ar', headerText, bodyText, bodyExamples, footerText } = payload || {};
  const components = buildComponents({ headerText, bodyText, bodyExamples, footerText });

  const result = await taqnyat.createTemplate(name, category, language, components, {
    allowCategoryChange: true,
  });
  if (!result.success) {
    throw new AppError(
      `Taqnyat create failed: ${result.error || 'unknown'}`,
      502,
      'TAQNYAT_UPSTREAM_FAILED'
    );
  }

  const taqnyatId = result.templateId || name;
  const status = (typeof result.status === 'string' ? result.status : 'PENDING').toUpperCase();

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

  await safeAudit({
    action: 'taqnyat_template.create',
    actor,
    targetType: 'taqnyat_template',
    targetId: doc._id,
    metadata: { templateName: name, category, language, status },
  });

  return doc;
}

/**
 * Hard-delete a template upstream on Meta and remove the local cache row.
 * Events still referencing the template by taqnyatId will fail at send
 * time — the UI warns the admin before invoking this.
 */
async function deleteUpstreamTemplate(id, actor) {
  const doc = await TaqnyatTemplate.findById(id);
  if (!doc) throw new NotFoundError('TaqnyatTemplate');

  const result = await taqnyat.deleteTemplate(doc.templateName, doc.taqnyatId);

  // "Already gone" responses (Object not found, not_found, etc.) mean
  // the template doesn't exist on Meta anymore — usually because it was
  // deleted via the Taqnyat dashboard or a prior partial run. Treat as
  // success and proceed with the local cleanup.
  const isAlreadyGone =
    !result.success &&
    /not[\s_]?found|already[\s_]?deleted|does\s?not\s?exist/i.test(String(result.error || ''));

  if (!result.success && !isAlreadyGone) {
    throw new AppError(
      `Taqnyat delete failed: ${result.error || 'unknown'}`,
      502,
      'TAQNYAT_UPSTREAM_FAILED'
    );
  }

  await TaqnyatTemplate.deleteOne({ _id: doc._id });

  await safeAudit({
    action: 'taqnyat_template.delete',
    actor,
    targetType: 'taqnyat_template',
    targetId: doc._id,
    metadata: {
      templateName: doc.templateName,
      taqnyatId: doc.taqnyatId,
      upstreamAlreadyGone: isAlreadyGone,
    },
  });

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
