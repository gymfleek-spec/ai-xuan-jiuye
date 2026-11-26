import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {EXAMPLE,makeBook} from './book.mjs';
import {analyticsEvent,track} from './analytics.mjs';
import {checkedEmail,registerWaitlist,attachWaitlist} from './waitlist.mjs';
import {checkedSignature,paintShareArtwork} from './share-art.mjs';
import {shareFields,needsShareImage} from './shareCard.mjs';
import {waitlistEndpoint} from '../growth-config.mjs';

test('only a reviewed dedicated HTTPS waitlist route may relax the no-network default',()=>{
  assert.equal(waitlistEndpoint(),'');
  assert.equal(waitlistEndpoint('/api/waitlist'),'https://xuan-jiuye-preview.pages.dev/api/waitlist');
  assert.equal(waitlistEndpoint('https://forms.example.invalid/xuan/a'),'https://forms.example.invalid/xuan/a');
  for (const endpoint of [
    'http://example.invalid/api/collect','//example.invalid/api/collect','https://example.invalid/',
    'https://example.invalid/api/','https://example.invalid/api/../collect','https://example.invalid/api?email=a',
    'https://a:b@example.invalid/api','https://example.invalid/api#data','https://example.invalid/a b',"'self'"
  ]) assert.throws(()=>waitlistEndpoint(endpoint));
});

const showcase=[
 ['enter_room',{}], ['topic_selected',{topic:'career'}],
 ['chart_generated',{topic:'family'}], ['resonance_clicked',{topic:'love'}],
 ['share_card_downloaded',{topic:'wealth'}], ['share_quote_copied',{topic:'direction'}],
 ['sku_selected',{sku:'single_88'}], ['unlock_modal_opened',{sku:'full_148',topic:'career'}],
 ['unlock_email_sent',{sku:'single_88',topic:'family'}]
];
test('all nine event schemas remove personal fields and reject unlisted, invalid or inherited data',()=>{
  for(const [event,payload] of showcase) {
    assert.deepEqual(analyticsEvent(event,{...payload,alias:'虛構稱呼',signature:'另填署名',birth:'1995-08-15',time:'09:30',gender:'male',email:'qa@example.invalid',entry_btn:'luopan_v1',has_empty_palace:true,method:'long_press'}),{event,payload});
  }
  for (const [event,payload] of [
    ['__proto__',{topic:'career'}],['chart_generated',{topic:'not_a_topic'}],
    ['topic_selected',{topic:'person@example.invalid'}],['unlock_email_sent',{topic:'career',sku:'full_388'}],
    ['share_card_saved',{topic:'career'}],['topic_selected',Object.create({topic:'career'})]
  ]) assert.equal(analyticsEvent(event,payload),null);
});
const flush = () => new Promise(resolve=>setImmediate(resolve));
async function withStubs(bindings, fn) {
  const before=Object.fromEntries(Object.keys(bindings).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  Object.assign(globalThis,bindings);
  try { await fn(); }
  finally { for (const [k,v] of Object.entries(before)) v ? Object.defineProperty(globalThis,k,v) : delete globalThis[k]; }
}

test('anonymous events dispatch asynchronously and leave only a bounded page-local history, with no network',async()=>{
  const records=[],requests=[];
  await withStubs({
    __XUAN_EVENTS__:[],
    dispatchEvent:e=>records.push([e.type,e.detail]),
    fetch:(...args)=>{requests.push(args);return Promise.reject(new Error('unexpected analytics network'));}
  },async()=>{
    track('topic_selected',{topic:'direction',name:'虛構稱呼'});
    assert.equal(records.length,0,'reading never waits for the event sink');
    await flush();
    assert.deepEqual(records,[['xuan:track',{event:'topic_selected',payload:{topic:'direction'}}]]);
    track('share_card_downloaded',{topic:'wealth',method:'long_press',email:'qa@example.invalid'});
    track('bogus',{});
    track('topic_selected',{get topic(){throw new Error('invalid input');}});
    await flush();
    assert.deepEqual(globalThis.__XUAN_EVENTS__.slice(-2),records.map(r=>r[1]));
    assert.ok(Object.isFrozen(globalThis.__XUAN_EVENTS__));assert.equal(records.length,2);
    for(let i=0;i<135;i++)track('enter_room',{time:'09:30',birth:'1988-07-16'});
    await flush();
    assert.equal(globalThis.__XUAN_EVENTS__.length,128);
    assert.ok(globalThis.__XUAN_EVENTS__.every(e=>e.event==='enter_room'&&Object.keys(e.payload).length===0));
    assert.equal(requests.length,0);
  });
});

test('email checks dot placement, DNS labels, length and injection without calling any service',()=>{
  assert.equal(checkedEmail('  Visitor+1@share.example.invalid  '),'Visitor+1@share.example.invalid');
  for(const value of [
    '',null,'qa','qa@example','qa..two@example.invalid','.qa@example.invalid','qa.@example.invalid',
    'a@-example.invalid','a@example.invalid.','a@abc.123','a@exa_mple.invalid','a@two@example.invalid',
    'a b@example.invalid','a\nb@example.invalid','a＠example.invalid','a@example。invalid','a'.repeat(65)+'@example.invalid'
  ]) assert.equal(checkedEmail(value),null,value);
});

test('the waitlist sends its three fields only and requires a positive server receipt', async()=>{
  const seen=[],record={email:' QA@share.example.invalid ',sku:'full_148',topic:'career',alias:'虛構',gender:'male',year:1995,timestamp:'2026-01-01T00:00:00.000Z'};
  let reply={ok:true,json:async()=>({ok:true})};
  await withStubs({fetch:async (url,init)=>{seen.push({url,...init});return reply;}},async()=>{
    assert.equal(await registerWaitlist('',record),false);
    assert.equal(await registerWaitlist('/api/waitlist',{...record,email:'a'}),false);
    assert.equal(await registerWaitlist('/api/waitlist',{...record,topic:'anything'}),false);
    assert.equal(seen.length,0);
    const scope=new AbortController();
    assert.equal(await registerWaitlist('/api/waitlist',record,scope.signal),true);
    const req=seen[0], payload=JSON.parse(req.body);
    assert.deepEqual(payload,{email:'QA@share.example.invalid',sku:'full_148',topic:'career'});
    assert.equal(req.credentials,'omit');assert.equal(req.redirect,'error');assert.equal(req.referrerPolicy,'no-referrer');
    assert.equal(req.signal,scope.signal);
    for (const mock of [{ok:false,json:async()=>({ok:true})},{ok:true,json:async()=>({})},{ok:true,json:async()=>({ok:'true'})}]) {
      reply=mock;assert.equal(await registerWaitlist('/api/waitlist',record),false);
    }
  });
});

function modalFixture(endpoint) {
  const nodes=new Map(), find=id=>{
    if (!nodes.has(id)) nodes.set(id,{hidden:false,open:false,handlers:{},attributes:{},
      addEventListener(type,listener){this.handlers[type]=listener;},setAttribute(k,v){this.attributes[k]=v;},
      showModal(){this.open=true;},close(){this.open=false;this.handlers.close?.();},focus(){this.focused=true;}});
    return nodes.get(id);
  };
  const ctrl=attachWaitlist(find,endpoint);
  return {find,ctrl,submit:()=>find('waitlist-form').handlers.submit({preventDefault(){}})};
}

test('the disconnected modal saves one session draft only after validation; the event stays anonymous',async()=>{
  const f=modalFixture(''),events=[],saved=new Map(),requests=[];
  await withStubs({
    fetch:(...args)=>{requests.push(args);return Promise.reject(new Error('unexpected offline network'));},
    dispatchEvent:e=>events.push(e.detail),
    sessionStorage:{setItem:(key,value)=>saved.set(key,value)}
  },async()=>{
    f.ctrl.open('full_148','wealth');
    assert.equal(f.find('waitlist-form').hidden,false);
    assert.equal(f.find('waitlist-email').disabled,false);
    assert.equal(f.find('waitlist-submit').textContent,'暫存電郵');
    f.find('waitlist-email').value='invalid';await f.submit();
    assert.match(f.find('waitlist-status').textContent,/有效/);assert.equal(saved.size,0);
    f.find('waitlist-email').value='qa@example.invalid';await f.submit();await flush();
    assert.equal(f.find('waitlist-local').hidden,false);
    assert.equal(f.find('waitlist-form').hidden,true);assert.equal(f.find('waitlist-email').value,'');
    assert.equal(f.find('waitlist-success').hidden,true);
    assert.match(f.find('purchase-title').textContent,/分頁暫存/);
    assert.match(f.find('waitlist-local').textContent,/冇傳出，亦未正式留位/);
    assert.deepEqual(JSON.parse(saved.get('xuan:waitlist-draft')),{email:'qa@example.invalid',sku:'full_148',topic:'wealth'});
    assert.deepEqual(events,[{event:'unlock_modal_opened',payload:{sku:'full_148',topic:'wealth'}},{event:'unlock_email_sent',payload:{sku:'full_148',topic:'wealth'}}]);
    f.ctrl.clear();
    assert.equal(f.find('waitlist-local').hidden,true);assert.equal(f.find('purchase-dialog').open,false);
    f.ctrl.open('single_88','family');f.find('waitlist-email').value='other@example.invalid';await f.submit();await flush();
    assert.equal(saved.size,1);assert.deepEqual(JSON.parse(saved.get('xuan:waitlist-draft')),{email:'other@example.invalid',sku:'single_88',topic:'family'});
    assert.equal(requests.length,0);
  });
});

test('blocked session storage and an unreviewed runtime endpoint cannot claim saving or sending the email',async()=>{
  const events=[],requests=[];
  await withStubs({
    document:{querySelector:()=>({content:''})},__XUAN_WAITLIST_ENDPOINT__:'https://unreviewed.example.invalid/intake',
    sessionStorage:{setItem(){throw new Error('storage disabled');}},
    fetch:(...args)=>{requests.push(args);return Promise.reject(new Error('unexpected network'));},
    dispatchEvent:e=>events.push(e.detail)
  },async()=>{
    const f=modalFixture();
    assert.equal(globalThis.__XUAN_WAITLIST_ENDPOINT__,'');
    f.ctrl.open('single_88','career');f.find('waitlist-email').value='qa@example.invalid';await f.submit();await flush();
    assert.equal(f.find('purchase-title').textContent,'電郵格式已核對');
    assert.match(f.find('waitlist-local').textContent,/留唔低電郵/);
    assert.equal(f.find('waitlist-success').hidden,true);
    assert.deepEqual(events.map(e=>e.event),['unlock_modal_opened']);assert.equal(requests.length,0);
  });
});

test('the configured modal waits for confirmation, shows failure safely, and ignores a response after closing',async()=>{
  const f=modalFixture('https://forms.example.invalid/xj'),requests=[],events=[];
  await withStubs({
    fetch:(url,req)=>new Promise(resolve=>requests.push({req,resolve})),
    dispatchEvent:e=>events.push(e.detail),
    document:{querySelector:()=>null}
  },async()=>{
    f.ctrl.open('single_88','family');
    await f.submit();
    assert.equal(requests.length,0);assert.equal(f.find('waitlist-email').attributes['aria-invalid'],'true');
    f.find('waitlist-email').value=' qa@example.invalid ';
    const first=f.submit();await f.submit();
    assert.equal(requests.length,1);assert.equal(f.find('waitlist-submit').disabled,true);
    requests[0].resolve({ok:true,json:async()=>({ok:false})});
    await first;assert.equal(f.find('waitlist-success').hidden,true);assert.match(f.find('waitlist-status').textContent,/未記低/);
    const stale=f.submit();f.ctrl.clear();f.ctrl.open('full_148','career');
    assert.equal(requests[1].req.signal.aborted,true);
    requests[1].resolve({ok:true,json:async()=>({ok:true})});await stale;
    assert.equal(f.find('waitlist-success').hidden,true);
    assert.equal(f.find('waitlist-email').value,'');
    f.find('waitlist-email').value='qa@example.invalid';
    const valid=f.submit();
    requests[2].resolve({ok:true,json:async()=>({ok:true})});
    await valid;await flush();
    assert.equal(f.find('purchase-title').textContent,'已為你留好位置');
    assert.equal(f.find('waitlist-email').value,'');
    assert.deepEqual(events.filter(e=>e.event==='unlock_email_sent'),[{
      event:'unlock_email_sent',payload:{sku:'full_148',topic:'career'}
    }]);
  });
});

test('share art is chart-led for each topic, but text output is blind to birth data, gender and unfiltered intake text',()=>{
  const engineBox={self:{}};
  runInNewContext(readFileSync(new URL('../vendor/iztro-v2.6.5.min.js',import.meta.url),'utf8'),engineBox);
  const engine=engineBox.self.iztro, book=makeBook(EXAMPLE,engine), alternate=makeBook({...EXAMPLE,time:'09:30'},engine);
  const drawlog=[], qrMarks=[], ctx={
    setTransform(a,b,c,d,e,f){assert.deepEqual([a,b,c,d,e,f],[2/3,0,0,2/3,0,0]);},
    createLinearGradient:()=>({addColorStop(){}}),fillRect(x,y,w,h){if(x>=750&&y>=1587)qrMarks.push([x,y,w,h]);},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},drawImage(){},
    measureText(s){return {width:s.length*55};},fillText(s){drawlog.push(s);}
  };
  const canvas={getContext:()=>ctx,ownerDocument:{createElement:()=>({getContext:()=>ctx})}};
  const quotes=new Set();
  for(const c of book.chapters){
    const fields=shareFields({...c,input:EXAMPLE,alias:'虛構化名',question:'虛構原句'},book.element);
    assert.deepEqual(Object.keys(fields),['topic','pattern','quote']);
    assert.ok(c.stars.every(s=>fields.pattern.includes(s)));
    assert.notEqual(fields.pattern,shareFields(alternate.chapters.find(x=>x.key===c.key),alternate.element).pattern);
    quotes.add(fields.quote);
    for (const signature of ['', 'guest','阿澄','1995-08-15','19:30','qa@example.invalid','female','一九九五年八月','三月三日','八八 年 七 月 十六 日','捌捌 年 柒 月 拾陸 日']) {
      drawlog.length=qrMarks.length=0;paintShareArtwork(canvas,{...fields,signature},{});
      assert.deepEqual([canvas.width,canvas.height],[720,1280]);
      assert.equal(drawlog.includes('寫畀 夜茶客'),signature==='guest');
      assert.deepEqual(qrMarks[0],[750,1587,222,222]);assert.ok(qrMarks.length>300);
      assert.ok(drawlog.includes('xuan-jiuye-preview.pages.dev'));
      assert.doesNotMatch(drawlog.join(''),/虛構化名|虛構原句|1995|19:30|female|example.invalid|一九九五年|三月三日|八八|捌捌|阿澄/);
      assert.ok(drawlog.join('').includes(fields.quote.replaceAll('\n','')));
    }
  }
  assert.equal(quotes.size,5);assert.equal(shareFields({key:'官祿',stars:['不屬於命盤']},book.element),null);
  assert.equal(checkedSignature('guest'),'夜茶客');
  assert.equal(checkedSignature(' 阿澄 '),null);
  assert.equal(checkedSignature('八八 年 七 月 十六 日'),null);
  assert.equal(checkedSignature(''),'');
  assert.equal(checkedSignature('阿\u202e澄'),null);
});

test('iOS, embedded WhatsApp/Instagram and browsers without download get the long-press image',()=>{
  for (const [ua,touches,download] of [['Mozilla iPhone Safari',0,true],['Macintosh AppleWebKit Safari',5,true],
    ['Mozilla Android WhatsApp',0,true],['Mozilla Android Instagram',0,true],['Other',0,false]]) assert.ok(needsShareImage(ua,touches,download));
  assert.equal(needsShareImage('Mozilla Macintosh Safari',0,true),false);
  assert.equal(needsShareImage('Mozilla Android Chrome',2,true),false);
});
