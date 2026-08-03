/**
 * Pure helpers for the controls embedded in approved WhatsApp templates.
 * `type` describes the template purpose; `invitationMode` describes the
 * exact invitation journey that the template is safe to power.
 */

const {
  INVITATION_TYPE,
  GENERAL_EVENT_FALLBACK_CATEGORIES: GENERAL_EVENT_FALLBACK_CATEGORY_VALUES,
} = require('../../shared/constants');

const INVITATION_MODES = Object.values(INVITATION_TYPE);
const REQUIRED_RSVP_BUTTON_TEXTS = ['سأحضر', 'سأعتذر'];
const OBSOLETE_INVITATION_TEMPLATE_NAMES = new Set([
  'halaa_event_reminder',
  'halaa_invitation_v1',
  'halaa_invitation_v2',
  'halaa_wedding_invite_gold',
  'halaa_wedding_invite_v1',
]);
const OBSOLETE_OWNER_TEMPLATE_PATTERN =
  /^halaa_(wedding|engagement|conference|ladies_event|baby_shower|birthday|general_event)_(reply|qr)_ar_v1$/i;
const GENERAL_EVENT_FALLBACK_CATEGORIES = new Set(
  GENERAL_EVENT_FALLBACK_CATEGORY_VALUES
);

function isTemplateCategoryCompatible(template, category) {
  if (!category || template?.category === category) return true;
  return (
    GENERAL_EVENT_FALLBACK_CATEGORIES.has(category) &&
    template?.category === 'other' &&
    /^halaa_general_event_/i.test(String(template?.templateName || ''))
  );
}

function isObsoleteHalaInvitationTemplateName(name) {
  const normalized = String(name || '').toLowerCase();
  return (
    OBSOLETE_INVITATION_TEMPLATE_NAMES.has(normalized) ||
    OBSOLETE_OWNER_TEMPLATE_PATTERN.test(normalized)
  );
}

function normalizeTemplateButtons(components = []) {
  const buttonsComponent = components.find(
    (component) => String(component?.type || '').toUpperCase() === 'BUTTONS'
  );

  return (buttonsComponent?.buttons || []).map((button, index) => ({
    type: String(button?.type || '').toUpperCase(),
    text: String(button?.text || '').trim(),
    url: String(button?.url || ''),
    index,
  }));
}

function getButtonCapability(buttons = []) {
  const normalized = buttons.map((button, index) => ({
    type: String(button?.type || '').toUpperCase(),
    text: String(button?.text || '').trim(),
    url: String(button?.url || ''),
    index: Number.isInteger(button?.index) ? button.index : index,
  }));
  const quickReplyCount = normalized.filter((button) => button.type === 'QUICK_REPLY').length;
  const urlButtonCount = normalized.filter((button) => button.type === 'URL').length;
  const dynamicUrlButtonCount = normalized.filter(
    (button) => button.type === 'URL' && /\{\{\d+\}\}/.test(button.url)
  ).length;
  const unknownButtonCount = normalized.length - quickReplyCount - urlButtonCount;
  const quickReplyTexts = normalized
    .filter((button) => button.type === 'QUICK_REPLY')
    .map((button) => button.text);
  const quickReplyLabelsValid =
    quickReplyTexts.length === REQUIRED_RSVP_BUTTON_TEXTS.length &&
    REQUIRED_RSVP_BUTTON_TEXTS.every((text) => quickReplyTexts.includes(text));

  let kind = 'unsupported';
  let compatibleInvitationModes = [];
  if (normalized.length === 0) {
    kind = 'none';
    compatibleInvitationModes = [INVITATION_TYPE.NONE];
  } else if (
    normalized.length === 2 &&
    quickReplyCount === 2 &&
    quickReplyLabelsValid
  ) {
    kind = 'two_quick_replies';
    compatibleInvitationModes = [
      INVITATION_TYPE.REPLY_AND_QR,
      INVITATION_TYPE.REPLY_ONLY,
    ];
  }

  return {
    kind,
    buttonCount: normalized.length,
    quickReplyCount,
    urlButtonCount,
    dynamicUrlButtonCount,
    unknownButtonCount,
    quickReplyLabelsValid,
    compatibleInvitationModes,
  };
}

function isTemplateCompatibleWithInvitationMode(template, invitationMode) {
  if (!INVITATION_MODES.includes(invitationMode)) return false;
  const capability = getButtonCapability(template?.buttons || []);

  // Existing invite rows predate button metadata and mode assignment. Keep
  // only that exact legacy path working until the admin re-saves the row.
  if (
    template?.type === 'invite' &&
    template?.buttonsSynced !== true &&
    invitationMode === INVITATION_TYPE.REPLY_AND_QR
  ) {
    return true;
  }

  return capability.compatibleInvitationModes.includes(invitationMode);
}

function effectiveInvitationMode(template) {
  if (template?.invitationMode) return template.invitationMode;
  return template?.type === 'invite' ? INVITATION_TYPE.REPLY_AND_QR : null;
}

module.exports = {
  INVITATION_MODES,
  normalizeTemplateButtons,
  getButtonCapability,
  isTemplateCompatibleWithInvitationMode,
  effectiveInvitationMode,
  REQUIRED_RSVP_BUTTON_TEXTS,
  GENERAL_EVENT_FALLBACK_CATEGORIES,
  isTemplateCategoryCompatible,
  isObsoleteHalaInvitationTemplateName,
};
