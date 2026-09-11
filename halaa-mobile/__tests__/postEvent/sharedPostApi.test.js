const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
function load(file, mocks) {
 const code = babel.transformSync(fs.readFileSync(path.resolve(__dirname, '../../hooks/postEvent', file), 'utf8'), {configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code;
 const exports = {}; vm.runInNewContext(code, {exports,require:name=>{if(name in mocks)return mocks[name];throw Error(name)}, FormData, globalThis, Date}); return exports;
}
test('mobile shared-post likes/comments target the same endpoints as web', async()=>{
 const calls=[]; const requests=async(url,options)=>{calls.push({url,options});return {data:{}};};
 const keys={content:id=>['content',id],commentsForPost:(id,post)=>['comments',id,post],hostContent:id=>['host',id]};
 const mutations=load('mutations.js',{'@tanstack/react-query':{useMutation:x=>x,useQueryClient:()=>({invalidateQueries:()=>{}})},'../../config/api':{API_BASE_URL:'https://api.test',ENDPOINTS:{POST_EVENT:{}}},'../../services/http':{},'./keys':{postEventKeys:keys},'./queries':{postEventGuestRequest:requests,postEventWithSession:token=>({Authorization:`Bearer ${token}`})}});
 await mutations.useTogglePostEventLike().mutationFn({eventId:'event',sessionToken:'session'});
 assert.equal(calls[0].url,'https://api.test/post-event/event/like');
 const form=new FormData();form.append('text','Thanks');
 await mutations.useAddPostEventComment().mutationFn({eventId:'event',formData:form,sessionToken:'session'});
 assert.equal(calls[1].url,'https://api.test/post-event/event/policies/accept');
 assert.equal(calls[2].url,'https://api.test/post-event/event/comments');
 assert.equal(calls[2].options.body,form);
});
test('shared-post comments include requested pagination and guest authentication',async()=>{
 let request;
 const queries=load('queries.js',{'@tanstack/react-query':{useQuery:x=>x},'../../config/api':{API_BASE_URL:'https://api.test',ENDPOINTS:{POST_EVENT:{}}},'../../services/http':{fetchWithTimeout:async(url,options)=>{request={url,options};return {ok:true,json:async()=>({})};}},'../../stores/authStore':{},'./keys':{postEventKeys:{comments:()=>['comments']}}});
 const query=queries.usePostEventComments('event',undefined,{page:2,limit:20},'session');
 assert.equal(query.enabled,true); await query.queryFn();
 assert.equal(request.url,'https://api.test/post-event/event/comments?page=2&limit=20');
 assert.equal(request.options.headers.Authorization,'Bearer session');
});
