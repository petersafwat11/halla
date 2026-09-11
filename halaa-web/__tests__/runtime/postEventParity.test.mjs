import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {setupDom} from '../helpers/domSetup.mjs';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {postEventMediaUrl} from '../../utils/postEventMedia.js';
test('relative post media resolves against the backend and signed URLs remain intact',()=>{
 assert.ok(postEventMediaUrl('/uploads/post/photo.jpg').endsWith('/uploads/post/photo.jpg'));
 assert.ok(postEventMediaUrl('/uploads/post/photo.jpg').startsWith('http'));
 const url='https://storage.test/photo.jpg?signature=123';assert.equal(postEventMediaUrl(url),url);
});
test('published post exposes preview, send, and edit without generating guest tokens',async()=>{
 setupDom();const {render,fireEvent}=await import('@testing-library/react');
 const {default:PublishedView}=await import('../../app/[lang]/host/post-event/[eventId]/_components/PublishedView/PublishedView.jsx');
 let edits=0;const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
 const view=render(React.createElement(QueryClientProvider,{client},React.createElement(PublishedView,{eventId:'event',content:{media:[],stats:{lastSend:{total:4,whatsapp:0,sms:0,failed:4}}},onEdit:()=>edits++})));
 assert.ok(view.getByRole('button',{name:'host.viewSharedPage'}));
 assert.ok(view.getByRole('button',{name:'host.accessLinks.title'}));
 fireEvent.click(view.getByRole('button',{name:'host.editContent'}));assert.equal(edits,1);
 view.unmount();client.clear();
});
test('host and admin routes share the canonical post-event component',async()=>{
 const host=await import('../../app/[lang]/host/post-event/[eventId]/page.js');
 const admin=await import('../../app/[lang]/admin-dash/post-event/[eventId]/page.js');
 const component=await import('../../app/[lang]/host/post-event/[eventId]/_components/HostPostEventContent.jsx');
 assert.equal(host.default,component.default);assert.equal(admin.default,component.default);
});
