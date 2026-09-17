import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import i18next from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupDom } from '../helpers/domSetup.mjs';
import TransitionModal from '../../app/[lang]/admin-dash/custom-designs/_components/TransitionModal.jsx';
import TicketTableContent from '../../app/[lang]/admin-dash/tickets/_components/TicketTableContent.jsx';
import TicketResponsePopup from '../../app/[lang]/admin-dash/tickets/_components/TicketResponsePopup.jsx';

test('custom-design shared fields retain values and ticket popup separates type, subject and message', async () => {
  setupDom();
  const { render, fireEvent } = await import('@testing-library/react');
  const i18n = i18next.createInstance();
  await i18n.use(initReactI18next).init({ lng: 'en', resources: {}, fallbackLng: 'en' });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) => React.createElement(I18nextProvider, { i18n }, React.createElement(QueryClientProvider, { client }, children));
  let closed = false;
  const modal = render(React.createElement(TransitionModal, { isOpen: true, onClose: () => { closed = true; }, order: { id: 'design-one', status: 'paid', fulfillment: { customerNote: 'Customer update', internalNotes: 'Team note' } } }), { wrapper });
  const note = modal.getByDisplayValue('Customer update');
  fireEvent.change(note, { target: { value: 'Revised update' } });
  assert.equal(note.value, 'Revised update');
  assert.ok(modal.getByDisplayValue('Team note'));
  // Expected delivery uses the house DatePicker + TimePicker, not a native
  // datetime-local: the native control renders a US-format value and ignores
  // the app's locale and RTL layout.
  assert.equal(document.querySelector('input[type="datetime-local"]'), null);
  assert.ok(document.querySelector('img[alt="calendar"]'), 'date picker rendered');
  assert.ok(modal.getByLabelText('timePicker.select'), 'time picker rendered');
  fireEvent.click(modal.getByLabelText('Close'));
  assert.equal(closed, true);
  modal.unmount();
  const popup = render(React.createElement(TicketResponsePopup, { ticket: { id: 'ticket-one', type: 'technical', subject: 'Distinct subject', message: 'Original customer message' }, onClose() {} }), { wrapper });
  assert.ok(popup.getByDisplayValue('technical'));
  assert.ok(popup.getByDisplayValue('Distinct subject'));
  assert.ok(popup.getByDisplayValue('Original customer message'));
  popup.unmount();
  let mediaTicket = null;
  let responseTicket = null;
  const ticket = { id: 'row-one', type: 'technical', subject: 'Separate subject', message: 'Separate message', status: 'open', attachments: [{ url: '/one.jpg', type: 'image' }] };
  const table = render(React.createElement(TicketTableContent, { tableData: [ticket], filters: {}, data: {}, canUpdate: true, canDelete: false,
    handleResponseClick: (row) => { responseTicket = row; }, handleMediaClick: (row) => { mediaTicket = row; },
  }), { wrapper });
  assert.ok(table.getByText('Separate subject'));
  assert.ok(table.getByText('Separate message'));
  fireEvent.click(table.getByRole('button', { name: 'media.view (1)' }));
  assert.equal(mediaTicket, ticket);
  fireEvent.click(table.getByRole('button', { name: 'technical' }));
  assert.equal(responseTicket, ticket);
  assert.equal(table.queryByText('table.columns.priority'), null);
  table.unmount();
  client.clear();
});
