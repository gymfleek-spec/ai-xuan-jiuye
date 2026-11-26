import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createHmac} from 'node:crypto';
import {guard} from '../../functions/_commercial/http.mjs';
import {checkoutAvailability,postReading,postCheckout,postStripeWebhook,getReport,getReportPage} from '../../functions/_commercial/handlers.mjs';

const ORIGIN='https://route2.example.invalid';
const EMAIL='recipient@example.invalid';
const birth={year:'1995',month:'08',day:'15',time:'19:30',gender:'male',place:''};
const okRead={nickname:'虛構阿澄',topic:'career',birth,consent:true};

function configure(){
  const sql=new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../../migrations/0001_commercial_mvp.sql',import.meta.url),'utf8'));
  function prepare(statement){
    const raw=sql.prepare(statement);
    return {bind(...args){return {first:async()=>raw.get(...args)||null,
      run:async()=>raw.run(...args),all:async()=>({results:raw.all(...args)}),execute:()=>raw.run(...args)};}};
  }
  const DB={prepare,batch:async bindings=>{
    sql.exec('BEGIN TRANSACTION');
    try{const out=bindings.map(o=>o.execute());sql.exec('COMMIT');return out;}
    catch(error){sql.exec('ROLLBACK');throw error;}
  }};
  const env={DB,COMMERCIAL_MODE:'test',PUBLIC_BASE_URL:ORIGIN,STRIPE_SECRET_KEY:'sk_test_fixture',
    STRIPE_WEBHOOK_SECRET:'whsec_fixture',RESEND_API_KEY:'re_fixture',
    RESEND_FROM:'茶室 <sender@example.invalid>',TEST_ORDER_EMAIL:EMAIL,
    ASSETS:{fetch:async()=>new Response('<main id="report-content" hidden></main>')}};
  return {sql,env};
}
function call(env,handler,path,{body,token,origin=ORIGIN,headers={}}={}){
  const init=body===undefined?{headers}:{method:'POST',headers:{"Content-Type":"application/json",Origin:origin,...headers},body:JSON.stringify(body)};
  return guard(handler)({env,request:new Request(ORIGIN+path,init),params:{token}});
}
function provider(){
  const sessions=new Map(), requests=[],letters=[];
  let rejectEmail=false;
  const fakeFetch=async(url,init)=>{
    requests.push({url,init});
    if(url==='https://api.stripe.com/v1/checkout/sessions'){
      const f=new URLSearchParams(init.body), id=f.get('client_reference_id');
      assert.equal(init.headers['Idempotency-Key'],'xj-checkout-'+id);
      assert.equal(f.get('customer_email'),EMAIL);
      assert.equal(f.get('metadata[order_id]'),id);
      assert.equal(f.get('line_items[0][price_data][currency]'),'hkd');
      assert.equal(f.get('payment_method_types[0]'),'card');
      assert.equal(f.get('adaptive_pricing[enabled]'),'false');
      assert.ok(f.get('success_url').startsWith(ORIGIN+'/r/'));
      assert.doesNotMatch(init.body.toString(),/1995|19%3A30|birth|nickname|chart_json/);
      const sid='cs_test_'+id.replaceAll('-','');
      if(!sessions.has(sid))sessions.set(sid,{id:sid,client_reference_id:id,amount_total:Number(f.get('line_items[0][price_data][unit_amount]')),
        currency:'hkd',status:'open',livemode:false,url:'https://checkout.stripe.com/c/pay/'+sid});
      return Response.json(sessions.get(sid));
    }
    if(url.startsWith('https://api.stripe.com/v1/checkout/sessions/'))return Response.json(sessions.get(url.split('/').pop()));
    if(url==='https://api.resend.com/emails'){
      if(rejectEmail)return Response.json({error:'fixture'}, {status:503});
      const payload=JSON.parse(init.body);
      assert.deepEqual(payload.to,[EMAIL]);
      assert.ok(payload.text.includes(ORIGIN+'/r/'));
      assert.match(payload.subject,/你嘅「(?:全盤三年命書|單題拆局書)」已經準備好/);
      assert.doesNotMatch(JSON.stringify(payload),/1995|19:30|虛構阿澄|第一章/);
      const id=init.headers['Idempotency-Key'];
      if(!letters.some(v=>v.id===id))letters.push({id,payload});
      return Response.json({id:'fixture-accepted'});
    }
    assert.fail('Unexpected external request '+url);
  };
  return {fakeFetch,sessions,requests,letters,fail:v=>{rejectEmail=v;}};
}
async function setupOrder(env,sku='xuan_full_3yr_v1'){
  const reading=await call(env,postReading,'/api/readings',{body:okRead});
  assert.equal(reading.status,201);
  const {readingId,publicToken}=await reading.json();
  assert.match(publicToken,/^[a-f0-9]{32}$/);
  const body={readingId,publicToken,email:EMAIL,sku,price:1,currency:'USD'};
  const checkout=await call(env,postCheckout,'/api/checkout',{body});
  assert.equal(checkout.status,200);
  const {checkoutUrl}=await checkout.json();assert.ok(checkoutUrl.startsWith('https://checkout.stripe.com/'));
  return {body,publicToken,checkoutUrl};
}
function eventFor(session,overrides={}){
  return {id:'evt_fixture',type:'checkout.session.completed',livemode:false,data:{object:{
    ...session,object:'checkout.session',mode:'payment',metadata:{order_id:session.client_reference_id},status:'complete',payment_status:'paid',...overrides
  }}};
}
function webhook(env,event,{unsigned=false,age=0}={}){
  const raw=JSON.stringify(event), time=Math.floor(Date.now()/1000)-age;
  const sign=createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(time+'.'+raw).digest('hex');
  return guard(postStripeWebhook)({env,request:new Request(ORIGIN+'/api/webhooks/stripe',{
    method:'POST',headers:unsigned?{}:{'Stripe-Signature':'t='+time+',v1='+sign},body:raw
  })});
}
function report(env,token){
  return call(env,getReport,'/api/reports/'+token,{token});
}

test('commercial intake requires a ready test environment, consent, correct origin and valid birth data',async()=>{
  const {env,sql}=configure();
  try{
    assert.equal((await call({...env,COMMERCIAL_MODE:'off'},postReading,'/api/readings',{body:okRead})).status,503);
    assert.equal((await call(env,postReading,'/api/readings',{body:okRead,origin:'https://other.example.invalid'})).status,403);
    assert.equal((await call(env,postReading,'/api/readings',{body:{...okRead,consent:false}})).status,400);
    assert.equal((await call(env,postReading,'/api/readings',{body:{...okRead,birth:{...birth,day:'31',month:'02'}}})).status,400);
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM readings').get().n,0);
    const availability=await call(env,checkoutAvailability,'/api/checkout');
    assert.deepEqual(await availability.json(),{available:true,test:true});
  }finally{sql.close();}
});

test('server prices both plans, payment alone unlocks four sections, links reopen without checkout keys, and duplicate events send once',async()=>{
  const {env,sql}=configure(), p=provider(), realFetch=globalThis.fetch;
  globalThis.fetch=p.fakeFetch;
  try {
    for(const [sku,amount] of [['xuan_single_v1',8800],['xuan_full_3yr_v1',14800]]){
      const {body,publicToken,checkoutUrl}=await setupOrder(env,sku);
      assert.equal((await call(env,postCheckout,'/api/checkout',{body:{...body,email:'other@example.invalid'}})).status,400);
      assert.equal((await call(env,postCheckout,'/api/checkout',{body:{...body,publicToken:'f'.repeat(32)}})).status,404);
      assert.equal((await call(env,postCheckout,'/api/checkout',{body:{...body,sku:'unlisted'}})).status,400);
      assert.deepEqual(await (await report(env,publicToken)).json(),{status:'LOCKED'});
      const pendingPage=await call(env,getReportPage,'/r/'+publicToken+'?paid=1',{token:publicToken});
      assert.equal(pendingPage.status,200);assert.match(pendingPage.headers.get('cache-control'),/no-store/);
      assert.match(pendingPage.headers.get('content-security-policy'),/frame-ancestors 'none'/);
      assert.doesNotMatch(await pendingPage.text(),/第一章|birth_payload/);
      const retry=await call(env,postCheckout,'/api/checkout',{body});
      assert.equal((await retry.json()).checkoutUrl,checkoutUrl);
      const id=checkoutUrl.split('/').at(-1);
      const session=p.sessions.get(id);
      assert.equal(session.amount_total,amount);
      const event=eventFor(session);
      assert.equal((await webhook(env,event,{unsigned:true})).status,400);
      assert.equal((await webhook(env,event,{age:301})).status,400);
      await webhook(env,eventFor(session,{payment_status:'unpaid'}));
      await webhook(env,eventFor(session,{amount_total:1}));
      await webhook(env,{...event,livemode:true});
      assert.deepEqual(await(await report(env,publicToken)).json(),{status:'LOCKED'});
      const prior=p.letters.length;
      const results=await Promise.all([webhook(env,event),webhook(env,event),webhook(env,event)]);
      assert.ok(results.every(response=>response.status===200));
      assert.equal((await webhook(env,event)).status,200);
      assert.equal(p.letters.length,prior+1);
      const disabled={DB:env.DB,COMMERCIAL_MODE:'off',PUBLIC_BASE_URL:ORIGIN};
      const resumed=await report(disabled,publicToken);
      assert.match(resumed.headers.get('referrer-policy'),/no-referrer/);
      const data=await resumed.json();
      assert.deepEqual(data.sections.map(s=>s.key),['ch1','ch2','ch3','ch4']);
      assert.equal(data.status,'READY');
      assert.doesNotMatch(JSON.stringify(data),/1995|19:30|recipient@|虛構阿澄|birth_payload/);
      for(const {paragraphs} of data.sections){
        const text=paragraphs.join('');
        if(sku==='xuan_single_v1')assert.doesNotMatch(text,/(?:家庭|財運|愛情|未來方向)｜/);
        else assert.match(text,/家庭｜.*財運｜/s);
      }
      assert.equal(data.sections[1].paragraphs.filter(p=>/^[0-9]{4} 年第 [1-4] 季｜/.test(p)).length,12);
      assert.ok(data.sections[0].paragraphs.some(p=>p.startsWith('太陽｜')));
      assert.ok(data.sections[0].paragraphs.some(p=>p.startsWith('巨門｜')));
      const order=sql.prepare('SELECT status,report_status,email_sent_at,id FROM orders WHERE stripe_session_id=?').get(id);
      assert.equal(order.status,'PAID');assert.equal(order.report_status,'READY');assert.ok(order.email_sent_at);
      assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM report_sections WHERE order_id=?').get(order.id).n,4);
    }
    for(const token of ['invalid-token','c'.repeat(32)]){
      assert.equal((await report(env,token)).status,404);
      assert.equal((await call(env,getReportPage,'/r/'+token,{token})).status,404);
    }
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM orders').get().n,2);
  } finally {globalThis.fetch=realFetch;sql.close();}
});

test('email failure does not relock an order and a retry uses the same delivery key',async()=>{
  const {env,sql}=configure(), p=provider(), old=globalThis.fetch;globalThis.fetch=p.fakeFetch;
  try{
    const {checkoutUrl,publicToken}=await setupOrder(env), event=eventFor(p.sessions.get(checkoutUrl.split('/').at(-1)));
    p.fail(true);assert.equal((await webhook(env,event)).status,503);
    assert.equal((await(await report(env,publicToken)).json()).status,'READY');
    p.fail(false);assert.equal((await webhook(env,event)).status,200);assert.equal((await webhook(env,event)).status,200);
    assert.equal(p.letters.length,1);
    const sends=p.requests.filter(v=>v.url==='https://api.resend.com/emails');
    assert.equal(sends.length,2);
    assert.equal(sends[0].init.headers['Idempotency-Key'],sends[1].init.headers['Idempotency-Key']);
  } finally {globalThis.fetch=old;sql.close();}
});

test('rate buckets reject excess work without storing IP or birth fields in the limiter',async()=>{
  const {env,sql}=configure();
  try{
    const {limit}=await import('../../functions/_commercial/http.mjs');
    const request=new Request(ORIGIN,{headers:{'CF-Connecting-IP':'203.0.113.44'}});
    await limit(request,env,'fixture',1);
    await assert.rejects(limit(request,env,'fixture',1),e=>e.status===429);
    assert.match(sql.prepare('SELECT bucket FROM rate_buckets').get().bucket,/^[a-f0-9]{64}$/);
  }finally{sql.close();}
});
