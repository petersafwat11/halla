const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeTemplateButtons,
  getButtonCapability,
  isTemplateCompatibleWithInvitationMode,
  effectiveInvitationMode,
  isTemplateCategoryCompatible,
  isObsoleteHalaInvitationTemplateName,
} = require('../src/modules/taqnyat-templates/taqnyat-template-capabilities');

test('two quick replies support both reply invitation modes', () => {
  const buttons = normalizeTemplateButtons([
    {
      type: 'BUTTONS',
      buttons: [
        { type: 'QUICK_REPLY', text: 'سأحضر' },
        { type: 'QUICK_REPLY', text: 'سأعتذر' },
      ],
    },
  ]);
  const capability = getButtonCapability(buttons);
  assert.equal(capability.kind, 'two_quick_replies');
  assert.deepEqual(capability.compatibleInvitationModes, ['reply_and_qr', 'reply_only']);
});

test('arbitrary quick replies are rejected because the webhook maps exact labels', () => {
  const capability = getButtonCapability([
    { type: 'QUICK_REPLY', text: 'Accept', index: 0 },
    { type: 'QUICK_REPLY', text: 'Decline', index: 1 },
  ]);
  assert.equal(capability.kind, 'unsupported');
  assert.equal(capability.quickReplyLabelsValid, false);
});

test('URL-button templates are unsupported invitation controls', () => {
  const dynamic = normalizeTemplateButtons([
    {
      type: 'BUTTONS',
      buttons: [{ type: 'URL', text: 'Open pass', url: 'https://halaa.sa/ar/invitation/{{1}}' }],
    },
  ]);
  const staticUrl = [{ type: 'URL', text: 'Open', url: 'https://halaa.sa', index: 0 }];

  assert.equal(getButtonCapability(dynamic).kind, 'unsupported');
  assert.equal(getButtonCapability(staticUrl).kind, 'unsupported');
  assert.equal(isTemplateCompatibleWithInvitationMode({ type: 'invite', buttonsSynced: true, buttons: dynamic }, 'none'), false);
});

test('no-button templates support only the none mode', () => {
  const template = {
    type: 'invite',
    invitationMode: 'none',
    buttonsSynced: true,
    buttons: [],
  };
  assert.equal(isTemplateCompatibleWithInvitationMode(template, 'none'), true);
  assert.equal(isTemplateCompatibleWithInvitationMode(template, 'reply_only'), false);
});

test('general-event templates cover graduation and meeting categories', () => {
  const general = { category: 'other', templateName: 'halaa_general_event_reply_qr_ar_v2' };
  const ladies = { category: 'ladies_event', templateName: 'halaa_ladies_event_reply_qr_ar_v2' };
  assert.equal(isTemplateCategoryCompatible(general, 'graduation'), true);
  assert.equal(isTemplateCategoryCompatible(general, 'meeting'), true);
  assert.equal(isTemplateCategoryCompatible(ladies, 'graduation'), false);
  assert.equal(isTemplateCategoryCompatible(general, 'wedding'), false);
});

test('legacy invitation templates stay suppressed from future Hala syncs', () => {
  assert.equal(
    isObsoleteHalaInvitationTemplateName('halaa_wedding_reply_ar_v1'),
    true
  );
  assert.equal(
    isObsoleteHalaInvitationTemplateName('halaa_wedding_qr_ar_v1'),
    true
  );
  assert.equal(
    isObsoleteHalaInvitationTemplateName('halaa_wedding_invite_gold'),
    true
  );
  assert.equal(
    isObsoleteHalaInvitationTemplateName('halaa_wedding_plain_ar_v1'),
    false
  );
  assert.equal(
    isObsoleteHalaInvitationTemplateName('halaa_wedding_reply_qr_ar_v2'),
    false
  );
});

test('legacy unverified invite rows remain reply_and_qr only', () => {
  const template = { type: 'invite', invitationMode: null, buttonsSynced: false, buttons: [] };
  assert.equal(effectiveInvitationMode(template), 'reply_and_qr');
  assert.equal(isTemplateCompatibleWithInvitationMode(template, 'reply_and_qr'), true);
  assert.equal(isTemplateCompatibleWithInvitationMode(template, 'reply_only'), false);
  assert.equal(
    isTemplateCompatibleWithInvitationMode(
      { ...template, invitationMode: 'reply_and_qr' },
      'reply_and_qr'
    ),
    true
  );
});
