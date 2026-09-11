#!/usr/bin/env node
'use strict';

// Dry-run by default. --submit submits the reviewed batch and configures its
// local assignments. Re-runs reconcile upstream names before creating anything.
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
require('dotenv').config({ path: path.join(__dirname, '../config.env'), quiet: true });
const mongoose = require('mongoose');
const manifest = require('../../docs/TAQNYAT_BUSINESS_TEMPLATES_MANIFEST.json');
const statePath = path.join(__dirname, '../../docs/TAQNYAT_BUSINESS_SUBMISSION_RESULT.json');

async function main() {
  assert.equal(manifest.templates.length, 8);
  const records = manifest.templates.map(t => {
    const slots = [...new Set(t.bodyText.match(/\{\{\d+\}\}/g) || [])];
    assert.equal(slots.length, t.varMapping.length);
    assert.equal(slots.length, t.bodyExamples.length);
    assert.ok(t.varMapping.some(m => m.sourceKey === 'invitation.url'));
    assert.ok(t.bodyText.length <= 1024);
    const components = [
      ...(t.imageHeader ? [{ type: 'HEADER', format: 'IMAGE', example: { header_handle: [manifest.imageSample] } }] : []),
      { type: 'BODY', text: t.bodyText, example: { body_text: [t.bodyExamples] } },
      { type: 'FOOTER', text: manifest.footer },
    ];
    return { ...t, components };
  });
  if (!process.argv.includes('--submit')) {
    console.log(JSON.stringify(records.map(t => ({ name: t.name, type: t.type, category: t.category, variables: t.varMapping.length, buttons: 0 })), null, 2));
    return;
  }
  const taqnyat = require('../src/infrastructure/taqnyat');
  const initial = await taqnyat.getTemplates();
  if (!initial.success || !initial.templates?.length) throw new Error('Cannot reconcile upstream catalogue; no submissions attempted.');
  const existing = new Map(initial.templates.map(t => [t.name, t]));
  const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : { templates: {} };
  for (const record of records) {
    if (existing.has(record.name) || state.templates[record.name]?.success) continue;
    const result = await taqnyat.createTemplate(record.name, manifest.metaCategory, manifest.language, record.components, { allowCategoryChange: false });
    state.templates[record.name] = { success: result.success, status: result.status || null, templateId: result.templateId || null, error: result.error || null, submittedAt: new Date().toISOString() };
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
    console.log(record.name, result.success ? result.status : result.error);
  }
  const { connectDB } = require('../src/config/database');
  await connectDB();
  const service = require('../src/modules/taqnyat-templates/taqnyat-templates.service');
  const Template = require('../models/TaqnyatTemplateModel');
  await service.syncFromTaqnyat();
  for (const record of records) {
    const doc = await Template.findOne({ templateName: record.name });
    if (!doc) continue;
    await service.assignMapping(doc._id, { category: record.category, type: record.type, deliveryMode: 'portal_link', compatibleInvitationModes: ['reply_and_qr', 'reply_only', 'none'], varMapping: record.varMapping, active: true });
    state.templates[record.name] = { ...state.templates[record.name], status: doc.status, configured: true, syncedAt: new Date().toISOString() };
  }
  const personal = await Template.findOne({ templateName: 'halaa_event_attendance_reminder_ar_v1' });
  if (!personal) throw new Error('Personal reminder template missing.');
  await service.assignMapping(personal._id, { category: null, type: 'reminder_confirmed', deliveryMode: 'quick_reply', active: true });
  state.personalReminder = { name: personal.templateName, status: personal.status, category: null, active: true };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
  console.log(JSON.stringify(state, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
