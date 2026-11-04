import test from 'node:test';
import assert from 'node:assert/strict';
import {createToastClient, toastConfiguration} from '../lib/toast-client.ts';
const env={TOAST_CLIENT_ID:'test-client',TOAST_CLIENT_SECRET:'test-secret',TOAST_RESTAURANT_GUID:'11111111-1111-4111-8111-111111111111'};
const jwt=scopes=>`header.${Buffer.from(JSON.stringify({scope:scopes})).toString('base64url')}.signature`;
const auth=scopes=>Response.json({status:'SUCCESS',token:{accessToken:jwt(scopes),expiresIn:3600}});

test('rejects credential exfiltration hosts, paths and invalid location IDs',()=>{
 for(const host of ['http://ws-api.toasttab.com','https://evil.test','https://ws-api.toasttab.com.evil.test','https://ws-api.toasttab.com/other','https://user:password@ws-api.toasttab.com'])assert.throws(()=>toastConfiguration({...env,TOAST_API_HOST:host}),/INVALID_TOAST_HOST/);
 assert.throws(()=>toastConfiguration({...env,TOAST_RESTAURANT_GUID:'245656'}),/INVALID_RESTAURANT_GUID/);
});
test('reports missing configuration without exposing values',()=>{
 assert.deepEqual(toastConfiguration({}).missing,['TOAST_CLIENT_ID','TOAST_CLIENT_SECRET','TOAST_RESTAURANT_GUID']);
});
test('authenticates once for concurrent reads, refreshes expiring tokens, sends the location header',async()=>{
 let clock=1000,logins=0;
 const client=createToastClient(env,async(url,options)=>{
   if(url.endsWith('/login')){logins++;assert.deepEqual(JSON.parse(options.body),{clientId:'test-client',clientSecret:'test-secret',userAccessType:'TOAST_MACHINE_CLIENT'});return auth(['config:read']);}
   assert.equal(options.method,'GET');assert.equal(options.headers['Toast-Restaurant-External-ID'],env.TOAST_RESTAURANT_GUID);return Response.json([]);
 },()=>clock);
 await Promise.all([client.read('/config/v2/tables'),client.read('/config/v2/diningOptions')]);assert.equal(logins,1);
 clock+=3_550_000;await client.read('/config/v2/tables');assert.equal(logins,2);
 await assert.rejects(()=>client.read('/orders/v2/orders'),/TOAST_ENDPOINT_NOT_ALLOWED/);
});
test('read-only credentials never appear payment-ready; reports accepted payment scopes without enabling checkout',async()=>{
 for(const scopes of [['config:read'],['config:read','orders.orders:write','credit_cards.authorization:write']]){
  const client=createToastClient(env,async url=>url.endsWith('/login')?auth(scopes):Response.json([{guid:'table-guid'}]));
  const report=await client.inspectAccess();assert.equal(report.checkoutEnabled,false);assert.equal(report.tableCount,1);assert.equal(report.locationAccess,'verified');
  assert.equal(report.missingPaymentScopes.length,scopes.length===1?2:0);
  assert.doesNotMatch(JSON.stringify(report),/test-secret|accessToken|signature/);
 }
});
test('maps auth and location failures to redacted errors',async()=>{
 const denied=createToastClient(env,async()=>new Response('SECRET UPSTREAM BODY',{status:401}));
 await assert.rejects(()=>denied.inspectAccess(),error=>error.code==='TOAST_AUTHENTICATION_REJECTED'&&!JSON.stringify(error).includes('SECRET'));
 const locationDenied=createToastClient(env,async url=>url.endsWith('/login')?auth(['config:read']):new Response('',{status:403}));
 assert.equal((await locationDenied.inspectAccess()).locationAccess,'denied');
});
test('rejects malformed auth responses and reports missing restaurant without sending a read',async()=>{
 const malformed=createToastClient(env,async()=>Response.json({status:'SUCCESS',token:{accessToken:'bad',expiresIn:0}}));
 await assert.rejects(()=>malformed.authenticate(),/INVALID_TOAST_AUTH_RESPONSE/);
 const client=createToastClient({...env,TOAST_RESTAURANT_GUID:''},async()=>auth([]));
 assert.equal((await client.inspectAccess()).locationAccess,'not_checked');
 await assert.rejects(()=>client.read('/config/v2/tables'),/TOAST_RESTAURANT_GUID_MISSING/);
});
