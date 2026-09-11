const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const load = async () => import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(__dirname, '../../components/events/sendAudiences.js'), 'utf8')).toString('base64'));

test('Unavailable reminder template blocks sending despite confirmed guests', async () => {
  const { computeSendAudiences, buildSendActionStates } = await load();
  const audiences = computeSendAudiences([{ id: 'confirmed', status: 'confirmed', invitation: { sent: true } }]);
  const unavailable = buildSendActionStates({ status: 'live', reminderAvailability: { configured: false } }, audiences);
  assert.equal(unavailable.extraReminder.enabled, false);
  assert.equal(unavailable.extraReminder.reasonKey, 'reminderUnavailable');
  const available = buildSendActionStates({ status: 'live', reminderAvailability: { configured: true } }, audiences);
  assert.equal(available.extraReminder.enabled, true);
});

test('Configured reminder still needs confirmed recipients', async () => {
  const { computeSendAudiences, buildSendActionStates } = await load();
  const states = buildSendActionStates({ status: 'live', reminderAvailability: { configured: true } }, computeSendAudiences([]));
  assert.equal(states.extraReminder.enabled, false);
  assert.equal(states.extraReminder.reasonKey, 'noConfirmed');
});

test('web and mobile reminder audiences exclude deleted, declined and unanswered guests', async () => {
 const webPath=path.join(__dirname,'../../../halaa-web/components/event-detail/sendActions/sendAudiences.js');
 const web=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(webPath,'utf8')).toString('base64'));
 const mobile=await load();
 const guests=[{id:'yes',status:'confirmed'},{id:'checked',status:'checked_in'},{id:'deleted',status:'confirmed',deleted:true},{id:'no',status:'declined'},{id:'pending',status:'pending',invitation:{sent:true}}];
 for(const helper of [web,mobile]){
  const audiences=helper.computeSendAudiences(guests);
  assert.deepEqual(audiences.extraReminder.map(g=>g.id),['yes','checked']);
  assert.equal(helper.buildSendActionStates({status:'live',reminderAvailability:{configured:false}},audiences).extraReminder.enabled,false);
 }
});
