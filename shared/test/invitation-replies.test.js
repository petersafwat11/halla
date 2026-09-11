import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReplyPreview, getReplyDelivery, buildConfirmedCaption } from '../src/utils/rsvpMessages.js';
import defaults from '../src/constants/guestReplies.cjs';
import { INVITATION_TYPE_OPTIONS, getInvitationTypeCopy } from '../src/constants/invitationTypes.js';

const form = { invitationType: 'reply_and_qr', response: 'confirmed', guestReplies: { onAttend: '  Welcome!  ', onAbsent: 'See you next time' }, eventName: 'Celebration', eventDate: '2026-10-20', eventTime: '18:30', address: { address: 'Riyadh hall', latitude: 24, longitude: 46 } };

test('QR confirmation preview contains the complete actual caption, not just the editable reply', () => {
  const preview = buildReplyPreview(form);
  assert.equal(preview.channel, 'whatsapp');
  assert.equal(preview.includesQr, true);
  assert.equal(preview.text, 'Welcome!\n\n🎉 Celebration\n🗓️ 20 أكتوبر 2026 · 18:30\n📍 Riyadh hall\n👥 عدد الضيوف: 1\n\nيُرجى إبراز هذا الرمز عند الدخول.');
  assert.doesNotMatch(preview.text, /https?:|latitude|longitude/);
});

test('every invitation type and response obeys its delivery contract', () => {
  for(const mode of INVITATION_TYPE_OPTIONS) for(const response of ['confirmed','declined']) for(const isBusinessEvent of [false,true]) {
    const preview = buildReplyPreview({...form, invitationType:mode.value,response,isBusinessEvent});
    assert.equal(preview.channel, mode.reply ? isBusinessEvent ? 'portal' : 'whatsapp' : 'none');
    assert.equal(preview.includesQr, mode.qr && response === 'confirmed');
    if(!mode.reply) assert.equal(preview.text, '');
    else if(!preview.richCaption) assert.equal(preview.text, response === 'confirmed' ? 'Welcome!' : 'See you next time');
  }
  assert.equal(getReplyDelivery('unknown','confirmed').channel,'none');
});

test('empty overrides use real Arabic defaults, and missing event details are omitted', () => {
  const p=buildReplyPreview({...form,guestReplies:{onAttend:'   '},eventDate:null,eventTime:'18:00',address:{}});
  assert.ok(p.text.startsWith(defaults.onAttend));
  assert.doesNotMatch(p.text,/🗓|📍|18:00|undefined/);
  assert.equal(buildReplyPreview({...form,response:'declined',guestReplies:{}}).text,defaults.onAbsent);
});

test('Riyadh date boundary and per-guest party size are preserved', () => {
  const text=buildConfirmedCaption({eventDetails:{title:'Evening',date:'2026-10-19T22:00:00Z'}},{rsvp:{plusOnes:2}});
  assert.match(text,/20 أكتوبر 2026/);
  assert.match(text,/عدد الضيوف: 3/);
});

test('localized selector copy exists for all modes and both delivery paths', () => {
  for(const lang of ['ar','en']) for(const mode of INVITATION_TYPE_OPTIONS) for(const business of [false,true]) {
    const copy=getInvitationTypeCopy(mode.value,lang,business);
    assert.ok(copy.title && copy.description);
  }
});
