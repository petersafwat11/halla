import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {setupDom} from '../helpers/domSetup.mjs';
import i18next from 'i18next';
import {initReactI18next} from 'react-i18next';
test('web guest editor displays persisted Saudi phone in local editable form',async()=>{
 setupDom();const {render}=await import('@testing-library/react');
 await i18next.use(initReactI18next).init({lng:'en',resources:{en:{'home-events':{}}},interpolation:{escapeValue:false}});
 const {default:Editor}=await import('../../ui/host/popups/addGuestPopup/AddGuestPopup.js');
 const view=render(React.createElement(Editor,{editGuest:{_id:'guest',name:'QA Guest',phone:'966533447741'},onConfirm:()=>{},onCancel:()=>{}}));
 assert.equal(view.container.querySelector('input[name="phone"]').value,'0533447741');view.unmount();
});
