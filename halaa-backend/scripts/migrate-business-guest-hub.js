/** Additive migration: dry-run by default; --apply only after reviewing the report. */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/database');
const Event = require('../models/EventModel');
const Template = require('../models/TaqnyatTemplateModel');
require('../models/UserModel');
const { isBusinessTemplate } = require('../src/modules/messaging/invitationDelivery');

async function migrate({ apply = false } = {}) {
  const report = { apply, classifiedBusiness: 0, classifiedPersonal: 0, unknownOwner: 0, businessWithoutCover: 0, incompatibleBusinessTemplates: 0 };
  const cursor = Event.find({}).populate('host', 'accountType').cursor();
  for await (const event of cursor) {
    let delivery = event.invitationDeliveryMode;
    if (!delivery) {
      if (event.branding?.businessName || event.host?.accountType === 'business') { delivery = 'portal_link'; report.classifiedBusiness++; }
      else if (event.host?.accountType === 'personal') { delivery = 'quick_reply'; report.classifiedPersonal++; }
      else { report.unknownOwner++; continue; }
      if (apply) await Event.updateOne({ _id: event._id, invitationDeliveryMode: null }, { $set: { invitationDeliveryMode: delivery } });
    }
    if (delivery === 'portal_link') {
      if (!event.branding?.coverImageKey) report.businessWithoutCover++;
      const template = event.taqnyatTemplate?.templateRef ? await Template.findById(event.taqnyatTemplate.templateRef).lean() : null;
      if (!isBusinessTemplate(template) || template.status !== 'APPROVED' || !template.active || template.removedFromMeta || !template.compatibleInvitationModes?.includes(event.invitationType)) report.incompatibleBusinessTemplates++;
    }
  }
  // No retrospective branding rewrite, template guessing, or guest data output.
  return report;
}

if (require.main === module) {
  (async () => { try { await connectDB(); console.log(JSON.stringify(await migrate({ apply: process.argv.includes('--apply') }), null, 2)); } finally { await mongoose.disconnect(); } })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { migrate };
