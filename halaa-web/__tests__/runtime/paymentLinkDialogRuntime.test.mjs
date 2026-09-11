import { before, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import axios from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupDom } from '../helpers/domSetup.mjs';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fs from 'node:fs';

let rtl, Dialog, Detail, keys, auth, client, postCount, ready;
const config = { actorId: 'staff-test', enabled: true, canCreate: true, canRefresh: true, minAmountSar: 1, maxAmountSar: 1000,
  expiryChoicesDays: [1, 7, 30], defaultExpiryDays: 7 };
let currentConfig = config;
const result = () => ({ id: 'link-1', reference: 'HPL-RUNTIME', amountSar: '250.50',
  creationState: ready ? 'ready' : 'creation_unknown', status: 'awaiting_payment',
  expiresAt: '2026-10-01T00:00:00Z', url: ready ? 'https://checkout.moyasar.com/invoices/test' : null });
before(async () => {
  setupDom();
  await i18n.use(initReactI18next).init({ lng: 'en', fallbackLng: 'en', resources: {
    en: { adminPayments: JSON.parse(fs.readFileSync(new URL('../../localization/locales/en/adminPayments.json', import.meta.url), 'utf8')), common: {} },
  } });
  globalThis.sessionStorage = window.sessionStorage;
  axios.defaults.adapter = async (request) => {
    let data;
    if (request.url.endsWith('/config')) data = currentConfig;
    else if (request.method === 'post') { postCount++; data = result(); }
    else data = result();
    return { data: { status: ready ? 'success' : 'pending', data }, status: ready ? 201 : 202,
      statusText: 'OK', headers: {}, config: request };
  };
  rtl = await import('@testing-library/react');
  keys = (await import('../../hooks/admin/keys.js')).adminKeys;
  auth = (await import('../../stores/authStore.js')).default;
  Dialog = (await import('../../app/[lang]/admin-dash/payments/_components/CreatePaymentLinkDialog.jsx')).default;
  Detail = (await import('../../app/[lang]/admin-dash/payments/_components/PaymentLinkDetailModal.jsx')).default;
});
afterEach(() => { rtl.cleanup(); client?.clear(); sessionStorage.clear(); });
const mount = (Component = Dialog, props = {}) => {
  postCount = 0; currentConfig = config;
  auth.setState({ user: { _id: 'staff-test', role: 'admin' } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  client.setQueryData(keys.paymentLinksConfig(), { status: 'success', data: config });
  const wrapper = ({ children }) => React.createElement(QueryClientProvider, { client }, children);
  return rtl.render(React.createElement(Component, { open: true, onClose() {}, ...props }), { wrapper });
};
test('uncertain creation cannot create another and updates when recovery completes', async () => {
  ready = false;
  const view = mount();
  rtl.fireEvent.change(view.baseElement.querySelector('#amountSar'), { target: { value: '٢٥٠٫٥٠' } });
  rtl.fireEvent.submit(view.baseElement.querySelector('form'));
  await rtl.waitFor(() => assert.match(view.baseElement.textContent, /Still creating/));
  assert.equal(postCount, 1);
  assert.equal(view.getByRole('button', { name: 'Create another' }).disabled, true);
  ready = true;
  rtl.act(() => client.setQueryData(keys.paymentLinkDetail('link-1'), { status: 'success', data: result() }));
  await rtl.waitFor(() => assert.match(view.baseElement.textContent, /Link ready/));
  assert.equal(view.getByRole('button', { name: 'Create another' }).disabled, false);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied'); } } });
  rtl.fireEvent.click(view.getByRole('button', { name: 'Copy link' }));
  await rtl.waitFor(() => assert.match(view.baseElement.textContent, /copy it manually/));
  assert.equal(view.queryByText('Copied'), null);
});

test('configured amount limit prevents provider request', async () => {
  ready = true;
  const view = mount();
  rtl.fireEvent.change(view.baseElement.querySelector('#amountSar'), { target: { value: '1000.01' } });
  rtl.fireEvent.submit(view.baseElement.querySelector('form'));
  await rtl.waitFor(() => assert.match(view.baseElement.textContent, /between SAR/));
  assert.equal(postCount, 0);
});

test('form rejects ambiguous monetary input without creating an invoice', async () => {
  ready = true;
  const view = mount();
  for (const value of ['0', '-10', '1e3', '1,000', '١٬٠٠٠', '1.234']) {
    rtl.fireEvent.change(view.baseElement.querySelector('#amountSar'), { target: { value } });
    rtl.fireEvent.submit(view.baseElement.querySelector('form'));
    await rtl.waitFor(() => assert.equal(view.baseElement.querySelector('#amountSar').getAttribute('aria-invalid'), 'true'));
    assert.equal(postCount, 0);
  }
});

test('shared expiry dropdown supports keyboard selection and Escape without closing the form', async () => {
  ready = true;
  let closed = false;
  const view = mount(Dialog, { onClose() { closed = true; } });
  const expiry = view.getByRole('combobox', { name: 'Expires after' });
  rtl.fireEvent.focus(expiry);
  rtl.fireEvent.keyDown(expiry, { key: 'ArrowDown' });
  rtl.fireEvent.keyDown(expiry, { key: 'ArrowDown' });
  rtl.fireEvent.keyDown(expiry, { key: 'Enter' });
  assert.equal(expiry.value, '30 days');
  rtl.fireEvent.click(expiry);
  rtl.fireEvent.keyDown(expiry, { key: 'Escape' });
  assert.equal(closed, false);
  assert.equal(expiry.getAttribute('aria-expanded'), 'false');
});

test('remount restores a pending request without submitting another invoice', async () => {
  ready = false;
  const first = mount();
  rtl.fireEvent.change(first.baseElement.querySelector('#amountSar'), { target: { value: '250.50' } });
  rtl.fireEvent.submit(first.baseElement.querySelector('form'));
  await rtl.waitFor(() => assert.match(first.baseElement.textContent, /Still creating/));
  first.unmount(); client.clear();
  const restored = mount();
  await rtl.waitFor(() => assert.match(restored.baseElement.textContent, /HPL-RUNTIME/));
  assert.equal(postCount, 0);
  assert.equal(restored.getByRole('button', { name: 'Create another' }).disabled, true);
});

test('disabled creation configuration cannot submit', async () => {
  ready = true;
  const view = mount();
  rtl.act(() => client.setQueryData(keys.paymentLinksConfig(), { data: { ...config, enabled: false, canCreate: false } }));
  await rtl.waitFor(() => assert.equal(view.getByRole('button', { name: 'Create link' }).disabled, true));
});

test('dialog traps Tab and restores focus on close', async () => {
  ready = true;
  const trigger = document.createElement('button'); document.body.appendChild(trigger); trigger.focus();
  let closed = false;
  const view = mount(Dialog, { onClose() { closed = true; } });
  const last = view.getByRole('button', { name: 'Create link' }); last.focus();
  rtl.fireEvent.keyDown(document, { key: 'Tab' });
  assert.equal(document.activeElement.id, 'amountSar');
  rtl.fireEvent.keyDown(document, { key: 'Escape' }); assert.equal(closed, true);
  view.unmount(); assert.equal(document.activeElement, trigger); trigger.remove();
});

test('detail load error displays an error and an available close action', async () => {
  ready = true;
  const view = mount(Detail, { linkId: 'link-1' });
  await rtl.waitFor(() => assert.match(view.baseElement.textContent, /HPL-RUNTIME/));
  rtl.act(() => client.getQueryCache().find({ queryKey: keys.paymentLinkDetail('link-1') }).setState({
    data: undefined, error: new Error('offline'), status: 'error', fetchStatus: 'idle',
  }));
  await rtl.waitFor(() => assert.ok(view.getByRole('alert')));
  assert.ok(view.getByRole('button', { name: 'Close' }));
});
