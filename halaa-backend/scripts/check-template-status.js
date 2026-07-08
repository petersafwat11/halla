const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });
const taqnyat = require('../src/infrastructure/taqnyat');

const COLORS = {
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
};

const STATUS_COLOR = {
  APPROVED: COLORS.green,
  PENDING:  COLORS.yellow,
  REJECTED: COLORS.red,
  OTHER:    COLORS.gray,
};

const c = (color, text) => `${color}${text}${COLORS.reset}`;

(async () => {
  console.log(c(COLORS.cyan + COLORS.bold, '\nTaqnyat WhatsApp Templates\n'));

  const result = await taqnyat.getTemplates();
  if (!result.success) {
    console.error(c(COLORS.red, 'Error: ' + result.error));
    process.exit(1);
  }

  const templates = result.templates;
  if (!templates.length) {
    console.log(c(COLORS.gray, 'No templates found.'));
    return;
  }

  const groups = { APPROVED: [], PENDING: [], REJECTED: [], OTHER: [] };
  for (const t of templates) {
    const s = (t.status || '').toUpperCase();
    (groups[s] ?? (groups.OTHER = groups.OTHER)).push(t);
    if (!groups[s]) groups.OTHER.push(t);
  }

  // Summary line
  const summary = Object.entries(groups)
    .filter(([, list]) => list.length > 0)
    .map(([status, list]) => c(STATUS_COLOR[status], `${list.length} ${status}`))
    .join('  |  ');
  console.log(`Total: ${c(COLORS.bold, String(templates.length))}   ${summary}\n`);

  for (const [status, list] of Object.entries(groups)) {
    if (!list.length) continue;

    const col = STATUS_COLOR[status];
    console.log(c(col + COLORS.bold, `━━━ ${status} (${list.length}) ━━━`));

    for (const t of list) {
      console.log(`  ${c(COLORS.bold, t.name || '(no name)')}`);
      console.log(`    id       : ${c(COLORS.gray, t.id || '—')}`);
      console.log(`    category : ${t.category || '—'}`);
      console.log(`    language : ${t.language || '—'}`);
      if (t.rejected_reason || t.rejection_reason) {
        console.log(`    reason   : ${c(COLORS.red, t.rejected_reason || t.rejection_reason)}`);
      }
      console.log('');
    }
  }
})();
