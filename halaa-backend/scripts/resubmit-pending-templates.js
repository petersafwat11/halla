/**
 * Check pending/rejected WhatsApp templates and resubmit them.
 *
 * Usage:
 *   node scripts/resubmit-pending-templates.js                -- check only
 *   node scripts/resubmit-pending-templates.js --resubmit     -- delete old + submit v2 names for PENDING & REJECTED
 *
 * What it does:
 *   1. Fetches all templates from Taqnyat/Meta
 *   2. Groups them by status (APPROVED / PENDING / REJECTED / OTHER)
 *   3. With --resubmit:
 *      - Deletes each PENDING/REJECTED template
 *      - Recreates it under a new name (see NAME_MAP below)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const axios = require('axios');
const taqnyat = require('../src/infrastructure/taqnyat');

const SHOULD_RESUBMIT = process.argv.includes('--resubmit');

// ─────────────────────────────────────────────────────────────────────────────
// OLD → NEW NAME MAPPING
// Update this map whenever you need to resubmit under a new name.
// ─────────────────────────────────────────────────────────────────────────────
const NAME_MAP = {
  halaa_invitation_v1:    'halaa_invitation_v2',
  halaa_event_reminder:   'halaa_event_reminder_v2',
};

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL TEMPLATE DEFINITIONS  (keyed by NEW name)
// ─────────────────────────────────────────────────────────────────────────────
const TEMPLATES = {
  halaa_invitation_v2: {
    name: 'halaa_invitation_v2',
    category: 'UTILITY',
    language: 'ar',
    components: [
      {
        type: 'BODY',
        text: [
          'أهلاً {{1}}،',
          '',
          'يسعدنا دعوتك لحضور *{{2}}*',
          '',
          'التاريخ: {{3}}',
          'الوقت: {{4}}',
          'المكان: {{5}}',
          '',
          'يرجى تأكيد مشاركتك من خلال الخيارات أدناه.',
        ].join('\n'),
        example: {
          body_text: [[
            'محمد العمري',
            'حفل زفاف أحمد ونورة',
            'الجمعة 20 يونيو 2025',
            '7:00 مساءً',
            'قاعة الأفراح الملكية، الرياض',
          ]],
        },
      },
      {
        type: 'FOOTER',
        text: 'هلا - منصة المناسبات الذكية',
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'سأحضر' },
          { type: 'QUICK_REPLY', text: 'سأعتذر' },
          { type: 'QUICK_REPLY', text: 'ربما' },
        ],
      },
    ],
  },

  halaa_event_reminder_v2: {
    name: 'halaa_event_reminder_v2',
    category: 'UTILITY',
    language: 'ar',
    components: [
      {
        type: 'BODY',
        text: [
          'تذكير ودّي،',
          '',
          '{{1}} لا يزال بانتظار ردّك على دعوة *{{2}}*',
          '',
          'الموعد: {{3}}',
          '',
          'لم يصلنا ردّك بعد، يُرجى تأكيد حضورك.',
        ].join('\n'),
        example: {
          body_text: [[
            'أسرة آل خالد',
            'حفل الخطوبة',
            'السبت 21 يونيو 2025',
          ]],
        },
      },
      {
        type: 'FOOTER',
        text: 'هلا - منصة المناسبات الذكية',
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'سأحضر' },
          { type: 'QUICK_REPLY', text: 'سأعتذر' },
          { type: 'QUICK_REPLY', text: 'ربما' },
        ],
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const waClient = () => axios.create({
  baseURL: taqnyat.TAQNYAT_CONFIG.waBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${taqnyat.TAQNYAT_CONFIG.apiKey}`,
  },
  timeout: 30000,
});

async function deleteTemplate(templateName) {
  try {
    await waClient().delete(`/templates/${templateName}/`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      status: err.response?.status,
      error: err.response?.data?.message || err.response?.data?.reason || err.message,
    };
  }
}

async function processTemplate(oldName) {
  const newName = NAME_MAP[oldName] || oldName;
  const def = TEMPLATES[newName];

  if (!def) {
    console.log(`  No definition found for new name "${newName}" — skipping.`);
    console.log(`  Add it to the TEMPLATES object in this script.`);
    return { success: false };
  }

  // Taqnyat does not support DELETE via API (405) — we skip deletion.
  // Old PENDING templates will stay until Meta auto-expires them.
  // We submit under a new name instead.
  console.log(`  Submitting "${newName}" to Meta...`);

  // Call createTemplate and capture the raw axios response for debugging
  let result;
  try {
    const waClient = axios.create({
      baseURL: taqnyat.TAQNYAT_CONFIG.waBaseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${taqnyat.TAQNYAT_CONFIG.apiKey}`,
      },
      timeout: 30000,
    });

    const payload = {
      name: def.name,
      category: def.category,
      language: def.language,
      allow_category_change: true,
      components: def.components,
    };

    console.log('  Payload:', JSON.stringify(payload, null, 2));

    const response = await waClient.post('/templates/', payload);
    console.log('  Raw response:', JSON.stringify(response.data, null, 2));

    result = {
      success: true,
      templateId: response.data.id,
      status: response.data.statuses || response.data.status || 'PENDING',
    };
    console.log(`  Submitted — ID: ${result.templateId}  Status: ${result.status}`);
  } catch (err) {
    const data = err.response?.data || {};
    console.error(`  Failed (HTTP ${err.response?.status})`);
    console.error('  Raw error response:', JSON.stringify(data, null, 2));
    result = { success: false, error: data.message || err.message, code: err.response?.status };
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!taqnyat.TAQNYAT_CONFIG.apiKey) {
    console.error('TAQNYAT_API_KEY is not set in config.env — aborting.');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log(' Halaa — WhatsApp Template Status Check');
  if (SHOULD_RESUBMIT) {
    console.log(' Mode: CHECK + RESUBMIT (PENDING & REJECTED)');
  } else {
    console.log(' Mode: CHECK ONLY  (add --resubmit to also resubmit)');
  }
  console.log('='.repeat(60));

  console.log('\nFetching templates from Taqnyat/Meta...');
  const fetched = await taqnyat.getTemplates();

  if (!fetched.success) {
    console.error('Failed to fetch templates:', fetched.error);
    process.exit(1);
  }

  const templates = fetched.templates;
  console.log(`Total templates on account: ${templates.length}`);

  const groups = { APPROVED: [], PENDING: [], REJECTED: [], OTHER: [] };
  for (const t of templates) {
    const s = (t.status || '').toUpperCase();
    (groups[s] ?? groups.OTHER).push(t);
  }

  for (const [status, list] of Object.entries(groups)) {
    if (list.length === 0) continue;
    const icon = { APPROVED: '✅', PENDING: '⏳', REJECTED: '❌' }[status] || '❓';
    console.log(`\n${icon} ${status} (${list.length})`);
    console.log('-'.repeat(40));
    for (const t of list) {
      console.log(`  name     : ${t.name}`);
      console.log(`  id       : ${t.id || 'N/A'}`);
      console.log(`  category : ${t.category || 'N/A'}`);
      console.log(`  language : ${t.language || 'N/A'}`);
      const reason = t.rejected_reason || t.rejection_reason;
      if (reason && reason !== 'NONE') console.log(`  reason   : ${reason}`);
      console.log('');
    }
  }

  const needsWork = [...groups.PENDING, ...groups.REJECTED];

  if (needsWork.length === 0) {
    console.log('\nAll templates are APPROVED — nothing to do.');
    return;
  }

  console.log(`\n${needsWork.length} template(s) need resubmission:`);
  for (const t of needsWork) {
    const newName = NAME_MAP[t.name] || '(same name)';
    console.log(`  - ${t.name}  →  ${NAME_MAP[t.name] || t.name}  [${t.status}]`);
  }

  if (!SHOULD_RESUBMIT) {
    console.log('\nRun with --resubmit to delete and resubmit them:');
    console.log('  node scripts/resubmit-pending-templates.js --resubmit');
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log(' Resubmitting...');
  console.log('='.repeat(60));

  let ok = 0, fail = 0;

  for (const t of needsWork) {
    console.log(`\n[${t.name}]`);
    const r = await processTemplate(t.name);
    if (r.success) ok++; else fail++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(` Done — ${ok} submitted, ${fail} failed`);
  console.log('='.repeat(60));

  if (ok > 0) {
    console.log('\nNext steps:');
    console.log('  Templates are PENDING Meta review (24-48 h).');
    console.log('\n  Once approved, update messaging.service.js:');
    console.log('    reminderTemplateName default → "halaa_event_reminder_v2"');
    console.log('\n  Hosts pick invitation template from the approved list in the');
    console.log('  event creation UI — no code change needed for invitations.');
    console.log('\n  Check status again:');
    console.log('    node scripts/resubmit-pending-templates.js');
  }

  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
