/**
 * Submit Wedding Invitation WhatsApp Template with IMAGE header
 *
 * Steps:
 *   1. Upload a sample image to Taqnyat /media/ to get a header_handle
 *   2. Create the template with IMAGE header + body + footer + buttons
 *
 * Template variables (same structure as existing):
 *   {{1}} guest_name
 *   {{2}} event_name
 *   {{3}} event_date
 *   {{4}} event_time
 *   {{5}} event_location
 *
 * Run: node scripts/submitWeddingTemplate.js
 */

const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const TAQNYAT_API_KEY = process.env.TAQNYAT_API_KEY;
const WA_BASE_URL = process.env.TAQNYAT_WA_BASE_URL || 'https://api.taqnyat.sa/wa/v2';

// Public URL of the sample image for template header example
// Taqnyat/360dialog requires a publicly accessible URL for header_handle
const SAMPLE_IMAGE_URL =
  'https://hallamangement.s3.eu-north-1.amazonaws.com/template-samples/wedding-sample.png';

const waClient = axios.create({
  baseURL: WA_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TAQNYAT_API_KEY}`,
  },
  timeout: 60000,
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Create template with IMAGE header
// ─────────────────────────────────────────────────────────────────────────────

function buildWeddingTemplate(headerHandleUrl) {
  return {
    name: 'halaa_wedding_invite_v1',
    category: 'UTILITY',
    language: 'ar',
    allow_category_change: true,
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        example: {
          header_handle: [headerHandleUrl],
        },
      },
      {
        type: 'BODY',
        text: [
          'مرحباً {{1}}،',
          '',
          'تتشرف عائلتنا بدعوتكم لحضور حفل زفاف *{{2}}*',
          '',
          'اليوم: {{3}}',
          'الساعة: {{4}}',
          'الموقع: {{5}}',
          '',
          'نتمنى تشريفكم ومشاركتنا هذه الفرحة، يرجى تأكيد الحضور.',
        ].join('\n'),
        example: {
          body_text: [
            [
              'عبدالله الشهري',
              'أحمد وسارة',
              'الجمعة 15 أغسطس 2025',
              '8:30 مساءً',
              'فندق الريتز كارلتون، جدة',
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
        ],
      },
    ],
  };
}

async function submitTemplate(template) {
  console.log(`\n📤 Step 2: Submitting template: ${template.name}`);
  console.log(`   Category: ${template.category} | Language: ${template.language}`);
  console.log(`   Payload:\n${JSON.stringify(template, null, 2)}`);

  try {
    const response = await waClient.post('/templates/', template);
    const data = response.data;
    console.log(`   Raw response:`, JSON.stringify(data, null, 2));

    return {
      success: true,
      templateId: data.id,
      status: data.statuses || data.status || 'PENDING',
    };
  } catch (error) {
    const errData = error.response?.data;
    console.error(`   ❌ Submission failed (${error.response?.status}):`);
    console.error(`      Response:`, JSON.stringify(errData || error.message, null, 2));
    return {
      success: false,
      error: errData?.reason || errData?.message || error.message,
      code: error.response?.status,
      details: errData,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!TAQNYAT_API_KEY) {
    console.error('❌ TAQNYAT_API_KEY is not set in config.env — aborting.');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log(' Halaa — Wedding Template Submission (with IMAGE header)');
  console.log('='.repeat(60));
  console.log(`\n API : ${WA_BASE_URL}`);
  console.log(` Key : ${TAQNYAT_API_KEY.slice(0, 6)}${'*'.repeat(20)}`);
  console.log(` Sample image : ${SAMPLE_IMAGE_URL}`);

  // Build and submit template (header_handle takes a public URL per Taqnyat/360dialog)
  const template = buildWeddingTemplate(SAMPLE_IMAGE_URL);
  const result = await submitTemplate(template);

  console.log('\n' + '='.repeat(60));
  if (result.success) {
    console.log(' ✅ Template submitted successfully!');
    console.log(`    Template ID : ${result.templateId}`);
    console.log(`    Status      : ${result.status}`);
    console.log('\n Next steps:');
    console.log('   1. Template is PENDING Meta review (usually 24-48 hours).');
    console.log('   2. Run: node scripts/sync-template-status.js — to check status.');
    console.log('   3. Once APPROVED, use template name "halaa_wedding_invite_v1" in event creation.');
    console.log('\n   At send time:');
    console.log('   sendWhatsAppTemplateWithImage(phone, "halaa_wedding_invite_v1", "ar", imageUrl, bodyParams)');
  } else {
    console.log(' ❌ Template submission failed');
    console.log(`    Error: ${result.error}`);
    if (result.details) console.log(`    Details:`, JSON.stringify(result.details, null, 2));
  }
  console.log('='.repeat(60));

  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
