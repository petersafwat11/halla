import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { FormProvider, useForm } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupDom } from '../helpers/domSetup.mjs';
import { buildReplyPreview } from '@halaa/shared/utils/rsvpMessages';
import { getInvitationTypeCopy } from '@halaa/shared/constants/invitationTypes';
setupDom();
const { render, fireEvent, cleanup } = await import('@testing-library/react');
const { default: StepFour } = await import('../../app/[lang]/host/create-event/_components/stepFour/StepFour.js');
const form = { eventName:'Celebration',eventDate:'2026-10-20',eventTime:'18:30',address:{address:'Riyadh hall'},guestReplies:{onAttend:'Welcome!',onAbsent:'Sorry to miss you'},invitationType:'reply_and_qr' };

for(const language of ['ar','en']) for(const isBusinessEvent of [false,true]) {
 test(`Step 4 ${language} ${isBusinessEvent?'business':'personal'} updates actual reply preview with mode and text`,async()=>{
  const i18n=createInstance();
  const dictionary=JSON.parse(fs.readFileSync(new URL(`../../localization/locales/${language}/createEvent.json`,import.meta.url),'utf8'));
  await i18n.init({lng:language,resources:{[language]:{createEvent:dictionary}},defaultNS:'createEvent',interpolation:{escapeValue:false}});
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
  function Wrapper(){const methods=useForm({defaultValues:{...form,isBusinessEvent}});return React.createElement(I18nextProvider,{i18n},React.createElement(QueryClientProvider,{client},React.createElement(FormProvider,methods,React.createElement(StepFour))));}
  const view=render(React.createElement(Wrapper));
  try {
   const expected=buildReplyPreview({...form,isBusinessEvent,response:'confirmed'}).text;
   assert.ok(view.container.querySelector('.message').textContent === expected);
   fireEvent.change(view.getByLabelText(dictionary.reply_editable_text),{target:{value:'Changed reply'}});
   assert.ok(view.container.querySelector('.message').textContent.startsWith('Changed reply'));
   fireEvent.click(view.getByRole('button',{name:dictionary.auto_replies_tab_absence}));
   assert.equal(view.container.querySelector('.message').textContent,'Sorry to miss you');
   assert.equal(view.container.querySelector('.qr'),null);
   fireEvent.click(view.getByRole('button',{name:dictionary.auto_replies_tab_attending}));
   fireEvent.click(view.getByRole('button',{name:new RegExp(getInvitationTypeCopy('reply_only',language,isBusinessEvent).title)}));
   assert.equal(view.container.querySelector('.message').textContent,'Changed reply');
   fireEvent.change(view.getByLabelText(dictionary.reply_editable_text),{target:{value:'   '}});
   assert.ok(view.container.querySelector('.message').textContent.startsWith('شكرًا'));
   fireEvent.click(view.getByRole('button',{name:new RegExp(getInvitationTypeCopy('none',language,isBusinessEvent).title)}));
   assert.equal(view.container.querySelector('textarea'),null);
   assert.equal(view.container.querySelector('.preview'),null);
  } finally {cleanup();client.clear();}
 });
}

test('business result displays the host reply and separately labels the guest note',async()=>{
 const { default: BusinessGuestHub }=await import('../../app/[lang]/business-invitation/[code]/BusinessGuestHub.jsx');
 const i18n=createInstance();
 const dictionary=JSON.parse(fs.readFileSync(new URL('../../localization/locales/ar/businessGuestHub.json',import.meta.url),'utf8'));
 await i18n.init({lng:'ar',resources:{ar:{businessGuestHub:dictionary}},defaultNS:'businessGuestHub'});
 const client=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnMount:false}}});
 // The shared navigation mock supplies lang=ar and no route code.
 client.setQueryData(['guests','token',undefined,'ar'],{
  guest:{id:'fixture-guest',name:'Guest',rsvp:{response:'confirmed',message:'Guest note'}},
  event:{deliveryMode:'portal_link',allowsReply:true,canRespond:true,includesQr:false,title:'Event',branding:{}},
  message:'Host automatic reply',pass:null,
 });
 const view=render(React.createElement(I18nextProvider,{i18n},React.createElement(QueryClientProvider,{client},React.createElement(BusinessGuestHub,{code:'fixture-code'}))));
 try{
  assert.ok(view.getByText('Host automatic reply'));
  assert.ok(view.getByText('Guest note'));
  assert.ok(view.getByText(`${dictionary.message}:`));
 } finally {cleanup();client.clear();}
});
