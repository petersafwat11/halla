const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

test('admin event actions are callable through their public domain exports', () => {
  const root = path.resolve(__dirname, '../..');
  const source = fs.readFileSync(path.join(root, 'hooks/admin/index.js'), 'utf8');
  const {code} = babel.transformSync(source, {configFile:false, babelrc:false, plugins:['@babel/plugin-transform-modules-commonjs']});
  const exports = {};
  vm.runInNewContext(code, {exports, require: () => new Proxy({}, {get: (_target, name) => name === '__esModule' ? true : () => ({})})});
  for (const name of ['useBulkCancelEvents', 'useBulkDeleteEvents', 'useExportAdminEvents']) {
    assert.equal(typeof exports[name], 'function', `${name} must be available to the admin event screen`);
  }
});

test('admin event action section renders valid action components', () => {
  const root = path.resolve(__dirname, '../..');
  const source = fs.readFileSync(path.join(root, 'components/admin-dashboard/events/EventActionsSection.js'), 'utf8');
  const {code} = babel.transformSync(source, {configFile:false, babelrc:false, plugins:['@babel/plugin-transform-react-jsx','@babel/plugin-transform-modules-commonjs']});
  const exports = {};
  const Row = () => null;
  const React = require('react');
  vm.runInNewContext(code, {exports, require: id => id === 'react' ? React : {__esModule:true, default:Row}});
  for (const status of ['pending_scheduling','scheduled','live','cancelled','completed']) {
    const section = exports.default({event:{status}, canEdit:true, canDelete:true, t:key=>key, SectionCard:()=>null});
    React.Children.forEach(section.props.children, child => assert.equal(child.type, Row, `Invalid action for ${status}`));
  }
});

test('event-owner query unwraps the API envelope and rejects failed requests', async () => {
  const root = path.resolve(__dirname, '../..');
  const source = fs.readFileSync(path.join(root, 'hooks/admin/queries.js'), 'utf8');
  const {code} = babel.transformSync(source, {configFile:false, babelrc:false, plugins:['@babel/plugin-transform-modules-commonjs']});
  const targets = [{id:'host-qa',subscription:{eventsRemaining:3}}];
  let response = {success:true,data:{data:{targets}}};
  const exports = {};
  vm.runInNewContext(code, {exports, require: id => {
    if (id === '@tanstack/react-query') return {useQuery: options => options};
    if (id.endsWith('/api')) return {ENDPOINTS:{ADMIN:{EVENT_TARGETS:'/owners'}}};
    if (id.endsWith('/authStore')) return {useAuthStore: select => select({token:'qa'})};
    if (id === './keys') return {adminKeys:{all:['admin']}};
    if (id === './_request') return {adminRequest: async()=>response};
    return {};
  }});
  const query = exports.useAdminEventTargets('host');
  assert.equal((await query.queryFn()).targets, targets);
  response = {success:false,error:'Unavailable'};
  await assert.rejects(query.queryFn(), /Unavailable/);
});
