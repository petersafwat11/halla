const config = require('../../config');
const { AppError } = require('../../shared/errors');

function resolveInvitationDelivery(event) {
  if (event?.invitationDeliveryMode) return event.invitationDeliveryMode;
  return event?.host?.accountType === 'business' || event?.branding?.businessName
    ? 'portal_link' : 'quick_reply';
}

function buildGuestInvitationUrl(event, code, language = 'ar') {
  const origin = String(config.frontend?.url || 'https://halaa.sa').replace(/\/$/, '');
  const route = resolveInvitationDelivery(event) === 'portal_link' ? 'business-invitation' : 'invitation';
  return `${origin}/${language === 'en' ? 'en' : 'ar'}/${route}/${encodeURIComponent(code)}`;
}

function isBusinessTemplate(template) {
  const slots = [...new Set(String(template?.bodyText || '').match(/\{\{\d+\}\}/g) || [])];
  const mappings = template?.varMapping || [];
  return template?.deliveryMode === 'portal_link' && template.buttonsSynced === true &&
    Array.isArray(template.buttons) && template.buttons.length === 0 &&
    slots.length > 0 && slots.length === mappings.length &&
    slots.every(slot => mappings.filter(m => m.placeholder === slot).length === 1) &&
    mappings.some(m => m.sourceKey === 'invitation.url' && slots.includes(m.placeholder));
}

function assertBusinessTemplate(template) {
  if (!isBusinessTemplate(template) || template.active === false ||
      template.status !== 'APPROVED' || template.removedFromMeta === true) {
    throw new AppError('Select an approved business template with a guest link in its body and zero buttons.',
      400, 'BUSINESS_LINK_TEMPLATE_REQUIRED');
  }
  return template;
}

module.exports = { resolveInvitationDelivery, buildGuestInvitationUrl, isBusinessTemplate, assertBusinessTemplate };
