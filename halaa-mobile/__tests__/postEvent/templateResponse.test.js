const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.resolve(__dirname, '../../utils/taqnyatTemplates.js'), 'utf8');
const load = () => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
test('template selectors handle API envelopes and empty responses', async () => {
 const {readTaqnyatTemplates: read} = await load();
 const templates = [{_id:'template-1',templateName:'Post-event'}];
 for (const response of [{data:{templates}}, {templates}, {data:templates}, templates]) assert.deepEqual(read(response).map(t=>t._id), ['template-1']);
 for (const response of [undefined,null,{}, {data:{}}, {data:{templates:null}}, {data:{templates:'invalid'}}]) assert.deepEqual(read(response), []);
});
