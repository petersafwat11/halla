/** Create a category-neutral reminder; approval/activation remain separate. */
const { connectDB } = require('../src/config/database');
const mongoose = require('mongoose');
const service = require('../src/modules/taqnyat-templates/taqnyat-templates.service');
const Template = require('../models/TaqnyatTemplateModel');

const payload = {
  name: 'halaa_event_attendance_reminder_ar_v1',
  category: 'UTILITY',
  language: 'ar',
  bodyText: 'عزيزنا/عزيزتنا {{1}}،\nنذكّركم بموعد مناسبة {{2}} التي أكدتم حضورها.\nالتاريخ: {{3}}\nالوقت: {{4}} بتوقيت السعودية\nالموقع: {{5}}\nنتطلع إلى حضوركم.',
  bodyExamples: ['محمد', 'لقاء العائلة', '14 سبتمبر 2026', '12:00 م', 'قاعة اللقاء، جدة'],
};
const varMapping = ['guest.name', 'eventDetails.title', 'eventDetails.dateFormatted', 'eventDetails.timeFormatted', 'eventDetails.location.address']
  .map((sourceKey, i) => ({ placeholder: `{{${i + 1}}}`, sourceKey }));

async function main() {
  if (!process.argv.includes('--submit')) {
    console.log(JSON.stringify({ payload, varMapping, active: false }, null, 2));
    return;
  }
  await connectDB();
  const existing = await Template.findOne({ templateName: payload.name });
  if (existing) {
    console.log(JSON.stringify({ id: existing._id, status: existing.status, active: existing.active, existing: true }));
    return;
  }
  const created = await service.createUpstreamTemplate(payload);
  const mapped = await service.assignMapping(created._id, {
    category: 'general_event', type: 'reminder_confirmed', varMapping, active: false,
  });
  console.log(JSON.stringify({ id: mapped._id, name: mapped.templateName, status: mapped.status, active: mapped.active }));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
