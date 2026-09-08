import test from 'node:test';
import assert from 'node:assert/strict';
import { parseXlsxRowsToObjects } from '../src/utils/xlsx.js';

test('guest files can omit optional categories while retaining local phone strings', () => {
  const headers = [{key:'name',label:'Guest Name'},{key:'mobile',label:'Phone Number'},{key:'category',label:'Category',optional:true}];
  const result = parseXlsxRowsToObjects([['Guest Name','Phone Number'],['QA Guest','0500115122']], headers, () => ({isValid:true}));
  assert.equal(result.data[0].mobile,'0500115122');
  assert.equal(result.data[0].category,'');
  assert.deepEqual(parseXlsxRowsToObjects([['Guest Name']],headers,()=>({isValid:true})).missing,['Phone Number']);
});
