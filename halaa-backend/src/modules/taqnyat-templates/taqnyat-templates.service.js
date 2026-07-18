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
const { INVITATION_TYPE } = require('../../shared/constants');
const {
  normalizeTemplateButtons,
  getButtonCapability,
  isTemplateCompatibleWithInvitationMode,
  effectiveInvitationMode,
} = require('./taqnyat-template-capabilities');

const decorateTemplate = (template) => {
  const invitationModeLegacy = template.type === 'invite' && !template.invitationMode;
  const buttonCapability = getButtonCapability(template.buttons || []);
  const legacyUnverified = template.type === 'invite' && template.buttonsSynced !== true;
  return {
    ...template,
    invitationMode: effectiveInvitationMode(template),
    invitationModeLegacy,
    buttonCapability: legacyUnverified
      ? {
          ...buttonCapability,
          kind: 'unverified',
          compatibleInvitationModes: [effectiveInvitationMode(template)],
        }
      : buttonCapability,
  };
};

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
  const notificationService = require('../notifications/notifications.service');
  for (const t of upstream) {
    const taqnyatId = t.id || t.template_id || t.name;
    if (!taqnyatId) continue;
    seenIds.add(String(taqnyatId));

    const componentDefinitionAvailable = Array.isArray(t.components);
    const bodyComponent = (t.components || []).find((c) => c.type === 'BODY') || {};
    const hasImageHeader = (t.components || []).some(
      (c) => c.type === 'HEADER' && c.format === 'IMAGE'
    );
    const buttons = normalizeTemplateButtons(t.components || []);

    const nextStatus = (t.status || 'APPROVED').toUpperCase();
    const existing = await TaqnyatTemplate.findOne({ taqnyatId: String(taqnyatId) })
      .select('status createdBy templateName type invitationMode');
    const shouldBackfillLegacyReplyMode =
      existing?.type === 'invite' &&
      !existing?.invitationMode &&
      getButtonCapability(buttons).kind === 'three_quick_replies';

    // Preserve admin-curated fields (`category`, `varMapping`, `active`,
    // `sortOrder`) on update. `removedFromMeta` is forced false so a
    // re-approved template comes back into the host wizard automatically.
    const filter = { taqnyatId: String(taqnyatId) };
    const update = {
      $set: {
        templateName: t.name,
        language: t.language || 'ar',
        status: nextStatus,
        metaCategory: t.category || null,
        ...(componentDefinitionAvailable && {
          bodyText: bodyComponent.text || '',
          hasImageHeader: !!hasImageHeader,
          buttons,
          buttonsSynced: true,
        }),
        ...(shouldBackfillLegacyReplyMode && {
          invitationMode: INVITATION_TYPE.REPLY_AND_QR,
        }),
        removedFromMeta: false,
        lastSyncedAt: new Date(),
      },
      $setOnInsert: {
        category: null,
        invitationMode: null,
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

    // Notify the template's creator on terminal status transitions. The
    // host-side `eventUpdates` preference covers this type per the
    // notifications service mapping.
    const previousStatus = existing?.status;
    const creatorId = existing?.createdBy || doc.createdBy;
    if (
      creatorId &&
      previousStatus !== nextStatus &&
      (nextStatus === 'APPROVED' || nextStatus === 'REJECTED')
    ) {
      const isApproved = nextStatus === 'APPROVED';
      notificationService
        .sendToUser(creatorId, {
          type: 'template_status_change',
          title: isApproved ? 'Template Approved' : 'Template Rejected',
          titleAr: isApproved ? 'تمت الموافقة على القالب' : 'تم رفض القالب',
          message: isApproved
            ? `Your WhatsApp template "${t.name}" has been approved.`
            : `Your WhatsApp template "${t.name}" was rejected.`,
          messageAr: isApproved
            ? `تمت الموافقة على قالب الواتساب "${t.name}".`
            : `تم رفض قالب الواتساب "${t.name}".`,
          data: {
            entityType: 'taqnyat_template',
            entityId: doc._id,
            metadata: { taqnyatId, status: nextStatus },
          },
        })
        .catch((err) =>
          logger.warn('template_status_change notify failed', { err: err?.message })
        );
    }
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

async function listForHost({ category, type = 'invite', invitationMode } = {}) {
  const query = {
    active: true,
    status: 'APPROVED',
    removedFromMeta: { $ne: true },
    type,
  };
  if (category) query.category = category;

  if (type === 'invite' && invitationMode) {
    query.$or = invitationMode === INVITATION_TYPE.REPLY_AND_QR
      ? [
          { invitationMode },
          { invitationMode: null },
          { invitationMode: { $exists: false } },
        ]
      : [{ invitationMode }];
  }

  const templates = await TaqnyatTemplate.find(query)
    .sort({ sortOrder: 1, createdAt: -1 })
    .select('-createdBy -updatedBy -__v')
    .lean();
  return templates
    .filter((template) =>
      type !== 'invite' ||
      !invitationMode ||
      isTemplateCompatibleWithInvitationMode(template, invitationMode)
    )
    .map(decorateTemplate);
}

/**
 * Look up the single active template for a (category, type) pair.
 * `staff_access` is global — category is ignored. Used by the auto-reminder
 * cron, the scheduled-extra-reminder dispatcher, and the staff notify flow.
 */
async function findActiveByCategoryAndType(category, type) {
  const filter =
    type === 'staff_access'
      ? { type: 'staff_access', active: true, status: 'APPROVED', removedFromMeta: { $ne: true } }
      : {
          category,
          type,
          active: true,
          status: 'APPROVED',
          removedFromMeta: { $ne: true },
        };
  return TaqnyatTemplate.findOne(filter).lean();
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

  const templates = await TaqnyatTemplate.find(query).sort({ sortOrder: 1, createdAt: -1 }).lean();
  return templates.map(decorateTemplate);
}

// Types that allow exactly one active doc per (category) — or globally for
// staff_access. Enforced atomically in `assignMapping` by deactivating the
// previous active doc in a single updateMany before flipping the new one.
const UNIQUE_TYPES = new Set([
  'reminder_confirmed',
  'post_event',
  'staff_access',
]);

async function assignMapping(id, updates, actor) {
  const doc = await TaqnyatTemplate.findById(id);
  if (!doc) throw new NotFoundError('TaqnyatTemplate');

  const nextType = updates.type !== undefined ? updates.type || null : doc.type;
  const requestedMode = updates.invitationMode !== undefined
    ? updates.invitationMode || null
    : doc.invitationMode;
  const nextMode = nextType === 'invite'
    ? requestedMode || effectiveInvitationMode(doc)
    : null;

  if (
    nextType === 'invite' &&
    !isTemplateCompatibleWithInvitationMode(doc.toObject(), nextMode)
  ) {
    const capability = getButtonCapability(doc.buttons || []);
    throw new AppError(
      `Template controls (${capability.kind}) are incompatible with invitation mode ${nextMode}`,
      400,
      'TAQNYAT_TEMPLATE_MODE_MISMATCH'
    );
  }

  if (updates.varMapping !== undefined) doc.varMapping = updates.varMapping;
  if (updates.category !== undefined) doc.category = updates.category || null;
  if (updates.type !== undefined) doc.type = updates.type || null;
  doc.invitationMode = nextMode;
  if (updates.active !== undefined) doc.active = !!updates.active;
  if (typeof updates.sortOrder === 'number') doc.sortOrder = updates.sortOrder;

  // Singleton-type enforcement: if turning this row active and another active
  // row already owns the (category, type) slot, deactivate that one first so
  // the cron's `findOne` lookup is unambiguous.
  if (doc.active && doc.type && UNIQUE_TYPES.has(doc.type)) {
    const filter =
      doc.type === 'staff_access'
        ? { _id: { $ne: doc._id }, type: 'staff_access', active: true }
        : { _id: { $ne: doc._id }, category: doc.category, type: doc.type, active: true };
    await TaqnyatTemplate.updateMany(filter, { $set: { active: false } });
  }

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
      type: doc.type,
      invitationMode: doc.invitationMode,
      varMappingCount: doc.varMapping.length,
    },
  });

  return doc;
}

function assertResolvedInviteTemplateCompatible(template, { category, invitationMode } = {}) {
  if (
    !template ||
    template.type !== 'invite' ||
    template.active === false ||
    template.status !== 'APPROVED' ||
    template.removedFromMeta === true
  ) {
    throw new AppError(
      'The selected WhatsApp invitation template is unavailable',
      400,
      'TAQNYAT_TEMPLATE_UNAVAILABLE'
    );
  }
  if (category && template.category !== category) {
    throw new AppError(
      'The selected WhatsApp template does not match the event category',
      400,
      'TAQNYAT_TEMPLATE_CATEGORY_MISMATCH'
    );
  }
  if (!isTemplateCompatibleWithInvitationMode(template, invitationMode)) {
    throw new AppError(
      'The selected WhatsApp template does not match the invitation mode',
      400,
      'TAQNYAT_TEMPLATE_MODE_MISMATCH'
    );
  }

  return decorateTemplate(template);
}

async function assertInviteTemplateCompatible(templateRef, options = {}) {
  if (!templateRef) {
    throw new AppError(
      'A WhatsApp invitation template is required',
      400,
      'NO_TEMPLATE_SELECTED'
    );
  }

  const id = templateRef?._id || templateRef;
  const template = await TaqnyatTemplate.findById(id).lean();
  return assertResolvedInviteTemplateCompatible(template, options);
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
        buttons: [],
        buttonsSynced: true,
        removedFromMeta: false,
        lastSyncedAt: new Date(),
      },
      $setOnInsert: {
        category: null,
        invitationMode: null,
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
  findActiveByCategoryAndType,
  assertInviteTemplateCompatible,
  assertResolvedInviteTemplateCompatible,
  createUpstreamTemplate,
  deleteUpstreamTemplate,
};
