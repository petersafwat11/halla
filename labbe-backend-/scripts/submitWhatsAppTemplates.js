/**
 * One-off script to create and submit professional WhatsApp templates to Taqnyat/Meta.
 *
 * Templates submitted:
 *   1. halaa_event_invitation  — main invitation with IMAGE header + 3 RSVP buttons
 *   2. halaa_event_reminder    — reminder to guests who haven't responded (already submitted)
 *
 * Run: node scripts/submitWhatsAppTemplates.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const taqnyat = require('../src/infrastructure/taqnyat');


// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Template 1 — Main event invitation
 *
 * Variables (positional):
 *   {{1}} guest_name
 *   {{2}} event_name
 *   {{3}} event_date
 *   {{4}} event_time
 *   {{5}} event_location
 *
 * Structure:
 *   HEADER  → IMAGE (dynamic event card injected at send time)
 *   BODY    → personalised Arabic invitation text
 *   FOOTER  → brand tag
 *   BUTTONS → 3 QUICK_REPLY RSVP buttons
 */
function buildInvitationTemplate() {
  return {
    name: 'halaa_invitation_v1',
    category: 'UTILITY',
    language: 'ar',
    components: [
      // NOTE: IMAGE header must be added via Taqnyat dashboard, not API.
      // Taqnyat's API rejects IMAGE format (their validator demands a text field,
      // but Meta rejects text+IMAGE together). Once approved via dashboard,
      // the image is injected at send time via sendWhatsAppTemplateWithImage().
      // For this API submission we omit the header — body + buttons are what matter.
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
          'يرجى تاكيد مشاركتك من خلال الخيارات ادناه.',
        ].join('\n'),
        example: {
          body_text: [
            [
              'محمد العمري',
              'حفل زفاف أحمد ونورة',
              'الجمعة 20 يونيو 2025',
              '7:00 مساء',
              'قاعة الأفراح الملكية، الرياض',
            ],
          ],
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
  };
}

/**
 * Template 2 — RSVP reminder
 * (already submitted — only re-run this if it needs to be recreated)
 *
 * Variables:
 *   {{1}} host_name
 *   {{2}} event_name
 *   {{3}} event_date
 */
const REMINDER_TEMPLATE = {
  name: 'halaa_event_reminder',
  category: 'UTILITY',
  language: 'ar',
  components: [
    {
      type: 'BODY',
      text: [
        'تذكير ودي،',
        '',
        '{{1}} لا يزال بانتظار ردّك على دعوة *{{2}}*',
        '',
        'الموعد: {{3}}',
        '',
        'لم يصلنا ردّك بعد، يُرجى تأكيد حضورك.',
      ].join('\n'),
      example: {
        body_text: [
          [
            'أسرة آل خالد',
            'حفل الخطوبة',
            'السبت 21 يونيو 2025',
          ],
        ],
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
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBMISSION
// ─────────────────────────────────────────────────────────────────────────────

async function submitTemplate(template) {
  console.log(`\n📤 Submitting: ${template.name} (${template.category} | ${template.language})`);

  const result = await taqnyat.createTemplate(
    template.name,
    template.category,
    template.language,
    template.components,
  );

  if (result.success) {
    console.log(`   ✅ Submitted successfully`);
    console.log(`      Template ID : ${result.templateId}`);
    console.log(`      Status      : ${result.status}`);
  } else {
    console.error(`   ❌ Submission failed`);
    console.error(`      Error  : ${result.error}`);
    console.error(`      Code   : ${result.code}`);
    console.error(`      Details: ${result.details}`);
  }

  return result;
}

async function main() {
  if (!taqnyat.TAQNYAT_CONFIG.apiKey) {
    console.error('❌  TAQNYAT_API_KEY is not set in config.env — aborting.');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log(' Halaa — WhatsApp Template Submission');
  console.log('='.repeat(60));
  console.log(`\n API : ${taqnyat.TAQNYAT_CONFIG.waBaseUrl}`);
  console.log(` Key : ${taqnyat.TAQNYAT_CONFIG.apiKey.slice(0, 6)}${'*'.repeat(20)}`);

  const results = [];

  // Step 2 — submit invitation template (IMAGE header, no example — Taqnyat media upload not available)
  results.push(await submitTemplate(buildInvitationTemplate()));

  // Step 3 — reminder already submitted (PENDING: qIEBsnt8vFQJFz25XiNAWT), skip resubmission
  // Uncomment below only if it needs to be recreated:
  // results.push(await submitTemplate(REMINDER_TEMPLATE));

  const successful = results.filter(r => r.success).length;
  const failed     = results.length - successful;

  console.log('\n' + '='.repeat(60));
  console.log(` Done — ${successful} submitted, ${failed} failed`);
  console.log('='.repeat(60));

  if (successful > 0) {
    console.log('\n Next steps:');
    console.log('   1. Templates are PENDING Meta review (usually 24-48 h).');
    console.log('   2. node scripts/sync-template-status.js  — to check status.');
    console.log('   3. Once APPROVED, use template name "halaa_event_invitation" in event creation.');
    console.log('\n   At send time the real event card image is injected via:');
    console.log('   sendWhatsAppTemplateWithImage(phone, "halaa_event_invitation", "ar", imageUrl, bodyParams)');
    console.log('\n   Button → RSVP mapping (messaging.service.js):');
    console.log('     "سأحضر"  → confirmed');
    console.log('     "سأعتذر" → declined');
    console.log('     "ربما"   → maybe');
  }

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
