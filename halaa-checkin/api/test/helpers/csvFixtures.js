/**
 * @halaa-checkin/api
 * Synthetic CSV test fixtures for T04 CSV import integration tests.
 */

export const CSV_FIXTURES = Object.freeze({
  // 1. Valid Arabic with UTF-8 BOM
  validArabicWithBom:
    '\uFEFFname,allowedCompanions,companionNames,reference\n' +
    'أحمد بن محمد السعدون,2,سارة السعدون|عمر السعدون,INV-AR-001\n' +
    'نورة عبدالله الفهد,0,,INV-AR-002\n' +
    'فيصل بن سلطان الدوسري,1,ريما الدوسري,INV-AR-003\n',

  // 2. Valid English with quoted names and commas
  validEnglishWithQuotes:
    'name,allowedCompanions,companionNames,reference\n' +
    '"Smith, Alexander M.",2,John Smith|Mary Smith,INV-EN-001\n' +
    '"Al-Otaibi, Dr. Sarah",0,,INV-EN-002\n' +
    'Michael Brown,3,Sarah Brown|Tom Brown|Lucy Brown,INV-EN-003\n',

  // 3. Valid mixed CSV without references
  validNoReferences:
    'name,allowedCompanions,companionNames,reference\n' +
    'خالد بن وليد الشمري,1,مرافق 1,\n' +
    'فاطمة الزهراء,0,,\n',

  // 4. Invalid row: companion count > 20
  invalidExcessCompanions:
    'name,allowedCompanions,companionNames,reference\n' +
    'Guest One,2,Companion 1|Companion 2,REF-001\n' +
    'Invalid Guest,25,,REF-002\n',

  // 5. Invalid row: companionNames length > allowedCompanions
  invalidExcessNames:
    'name,allowedCompanions,companionNames,reference\n' +
    'Guest One,1,Comp A|Comp B,REF-001\n',

  // 6. Invalid row: missing name
  invalidMissingName:
    'name,allowedCompanions,companionNames,reference\n' +
    ',2,Comp 1|Comp 2,REF-001\n',

  // 7. Duplicate references within the CSV file
  duplicateReferenceInFile:
    'name,allowedCompanions,companionNames,reference\n' +
    'Guest Alpha,1,Comp 1,DUP-REF-001\n' +
    'Guest Beta,0,,dup-ref-001\n', // Collides case-insensitively

  // 8. Duplicate names within file (should be non-blocking warning)
  duplicateNameInFile:
    'name,allowedCompanions,companionNames,reference\n' +
    'محمد عبدالله,1,مرافق,REF-A\n' +
    'محمد عبدالله,0,,REF-B\n',

  // 9. Missing required header
  missingHeader:
    'name,allowedCompanions,companionNames\n' +
    'Guest One,0,\n',

  // 10. Unexpected extra header
  unexpectedHeader:
    'name,allowedCompanions,companionNames,reference,phone\n' +
    'Guest One,0,,REF-001,0501234567\n',

  // 11. Empty CSV
  emptyCsv: '',

  // 12. Header only (no data rows)
  headerOnly: 'name,allowedCompanions,companionNames,reference\n',
});

/**
 * Generate a CSV string with N rows.
 *
 * @param {number} rowCount
 * @param {string} [prefix='ROW']
 * @returns {string}
 */
export function generateLargeCsv(rowCount, prefix = 'ROW') {
  let csv = 'name,allowedCompanions,companionNames,reference\n';
  for (let i = 1; i <= rowCount; i++) {
    csv += `Guest ${prefix} ${i},1,Companion ${i},${prefix}-REF-${i}\n`;
  }
  return csv;
}
