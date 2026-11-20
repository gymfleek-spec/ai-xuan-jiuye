import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { attachZiwei } from './ziwei.js';

const loaded = { self: {} };
runInNewContext(readFileSync(new URL('./vendor/iztro-v2.6.5.min.js', import.meta.url), 'utf8'), loaded);
function fixture(reduce=false) {
  const prior = { document: globalThis.document, engine: globalThis.iztro, set: globalThis.setTimeout, clear: globalThis.clearTimeout, media: globalThis.matchMedia };
  const timers=new Map(); let last=0;
  globalThis.setTimeout=(fn,delay)=>{timers.set(++last,{fn,delay});return last;};
  globalThis.clearTimeout=id=>timers.delete(id);
  globalThis.matchMedia=()=>({matches:reduce});
  const nodes = {}, handlers = {}, phases = [], links = [];
  class Node {
    constructor(tag='') { this.tagName=tag; this.attrs={}; this.children = []; this.style = {}; this.value = ''; this.parentElement = { addEventListener() {} }; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    setAttribute(k,v) {this.attrs[k]=String(v);} removeAttribute(k) {delete this.attrs[k];} focus() {}
    get textContent() { return this.text || this.children.map(n => n.textContent).join(''); }
    set textContent(value) { this.text = value; }
  }
  globalThis.document = { createElement: tag => { const node = new Node(tag); if (tag === 'a') links.push(node); return node; }, createElementNS: (_ns,tag)=>new Node(tag), getElementById: id => nodes[id] ||= new Node() };
  globalThis.iztro = loaded.self.iztro;
  const dialog = { open: true, addEventListener: (name, fn) => handlers[name] = fn };
  const content = { querySelectorAll: () => [], addEventListener: (name, fn) => handlers[name] = fn };
  let html = '', phase = '';
  const open = attachZiwei(dialog, content, (copy, stage) => {
    html = copy; phase = stage; phases.push(stage);
    for (const id of Object.keys(nodes)) delete nodes[id];
  });
  const click = (name, extra = {}) => handlers.click({ target: { closest: () => ({ dataset: { ziwei: name, ...extra } }) } });
  const type = (key, value) => handlers.input({ target: { dataset: { ziweiField: key }, value, removeAttribute() {} } });
  const submit = (id, submitter) => handlers.submit({ target: { id }, submitter, preventDefault() {}, stopImmediatePropagation() {} });
  const date = () => { type('year','2000'); type('month','8'); type('day','16'); submit('ziwei-date-form'); };
  const options = (precision = 'exact') => { type('precision',precision); if (precision === 'exact') type('time','03:30'); type('gender','female'); submit('ziwei-options-form'); };
  const field=id=>globalThis.document.getElementById('ziwei-'+id);
  const start=(palace='官祿')=>{dialog.open=true;open(false);click('greet',{reply:'yes'});click('focus',{palace});};
  const alias=(value='小晴')=>{field('alias').value=value;submit('career-alias-form');};
  const born=(day='1995-08-15',time='09:30',gender='male')=>{for(const [k,v] of [['date',day],['time',time],['gender',gender]])field(k).value=v;submit('career-birth-form');};
  const ask=(value='幾樣工作同時要交，點排先後？')=>{field('question').value=value;submit('career-question-form');};
  const tick=()=>{const t=timers.get(last);assert.ok(t,'an automatic transition is scheduled');timers.delete(last);t.fn();};
  const endRitual=()=>{nodes['ritual-seal']?.onanimationend?.();tick();};
  return { nodes,phases,links,content,open,click,type,submit,date,options,field,start,alias,born,ask,tick,endRitual,timers,
    timer:()=>timers.get(last), lines:()=>nodes['career-strip'].children.map(p=>p.textContent),
    close(){dialog.open=false;handlers.close();}, get html(){return html;},get phase(){return phase;},
    restore(){Object.assign(globalThis,{document:prior.document,iztro:prior.engine,setTimeout:prior.set,clearTimeout:prior.clear,matchMedia:prior.media});}
  };
}

test('the desk waits for the film; a blocked click cannot choose a topic', () => {
  const f=fixture(); try {
    f.open(false); f.content.inert=true; f.click('greet',{reply:'yes'});
    assert.equal(f.phase,'entrance'); f.content.inert=false; f.click('greet',{reply:'invalid'});
    assert.equal(f.phase,'entrance'); f.click('greet',{reply:'yes'});
    assert.equal(f.phase,'interaction');
  } finally { f.restore(); }
});
test('both greetings open the same five topics in one click; there is no landmark button', () => {
  const f=fixture(); try {
    for (const [reply,copy] of [['curious','我係玄，呢位係九爺。'],['yes','好呀。']]) {
      f.open(false);assert.match(f.html,/有呀，想傾吓/);assert.match(f.html,/你係邊位/);
      assert.doesNotMatch(f.html,/look-altar|望吓周圍先|aria-pressed="true"|<form/);
      f.click('greet',{reply}); assert.equal(f.phase,'interaction'); assert.ok(f.html.includes(copy));
      assert.equal((f.html.match(/data-ziwei="focus"/g)||[]).length,5);
      f.click('focus',{palace:'官祿'}); assert.equal(f.phase,'career-setup');assert.match(f.html,/點稱呼你好/);
      f.click('choose-focus'); assert.equal(f.phase,'interaction');
    }
    assert.equal(f.phases.filter(v=>v==='entrance').length,2);
  } finally { f.restore(); }
});
test('each topic opens its actual palace and twelve houses from a fictitious chart', () => {
  for(const [palace, label] of [['官祿','事業'],['夫妻','愛情'],['田宅','家庭'],['財帛','財運'],['命宮','未來方向']]) {
    const f=fixture();try{
      f.open(false);f.click('greet',{reply:'yes'});f.click('focus',{palace});assert.ok(f.html.includes(label));
      if(['官祿','夫妻'].includes(palace)){f.alias();f.born();f.ask('');assert.equal(f.phase,'career-ritual');f.endRitual();assert.equal(f.phase,'career-comic');}
      else{assert.match(f.html,/免費試排紫微盤/);f.click('skip');f.date();f.options();assert.match(f.html,/免費排盤/);f.click('calculate');}
      f.click('view-result');
      assert.equal(f.phase,'ziwei-result');assert.ok(f.html.includes('先由「'+label+'」睇起'));
      assert.equal(f.nodes['ziwei-grid'].children.length,13);assert.ok(f.nodes['ziwei-palace-note'].textContent.includes(palace));
      assert.match(f.nodes['ziwei-palace-note'].textContent, /解讀依據/);
      assert.deepEqual(f.links.filter(a => a.href && new URL(a.href, 'https://site.test').origin !== 'https://site.test'), [], label + ': no reference links');
    }finally{f.restore();}
  }
});

test('the live renderer distinguishes borrowed and native stars after switching topics and retains a clean original grid',()=>{
  const f=fixture();try{
    f.start();f.alias();f.born();f.ask();f.endRitual();f.click('view-result');
    const n=()=>f.nodes['ziwei-palace-note'].textContent;
    assert.match(n(),/官祿宮.*本宮無十四主星.*借對宮夫妻宮.*武曲、貪狼/);
    assert.doesNotMatch(n(),/心理學|未做借星|先唔替|模型|內部/);
    f.click('palace',{palace:'田宅'}); assert.match(n(),/田宅宮.*本宮無十四主星.*借對宮子女宮.*天同、太陰/); assert.doesNotMatch(n(),/貪狼/);
    f.click('palace',{palace:'命宮'}); assert.match(n(),/命宮.*天相/); assert.doesNotMatch(n(),/借對宮子女|太陰/);
    const career=f.nodes['ziwei-grid'].children.find(cell=>cell.children[0]?.textContent==='官祿');
    assert.match(career.textContent,/本宮無十四主星/);assert.doesNotMatch(career.textContent,/武曲|貪狼/);
  }finally{f.restore();}
});
test('explicit reviewed calculation creates a real chart before reveal; movie completion cannot open it', () => {
  const f = fixture(); try {
    f.open(false); f.click('greet',{reply:'curious'}); f.click('focus',{palace:'田宅'}); f.click('skip');
    f.date(); assert.equal(f.phase,'ziwei-options'); f.options(); assert.equal(f.phase,'ziwei-review');
    f.click('view-result'); assert.equal(f.phase,'ziwei-review');
    f.click('calculate'); assert.equal(f.phase,'reveal'); assert.match(f.html,/十二宮命盤排好喇/);
    assert.doesNotMatch(f.html,/id="ziwei-grid"/);
    f.click('view-result'); assert.equal(f.phase,'ziwei-result');
    assert.equal(f.nodes['ziwei-grid'].children.length,13);
    assert.match(f.nodes['ziwei-palace-note'].textContent,/田宅宮/);
  } finally { f.restore(); }
});

test('unknown time never invokes the engine or enters the decorative success reveal', () => {
  const f = fixture(); try {
    f.open(true); f.date(); f.options('unknown');
    globalThis.iztro = { get version() { throw new Error('unknown must not read engine'); } };
    f.click('calculate'); assert.equal(f.phase,'ziwei'); assert.match(f.html,/資料未足，先唔落盤/);
    assert.equal(f.phases.includes('reveal'),false); f.click('view-result'); assert.equal(f.phase,'ziwei');
  } finally { f.restore(); }
});

test('engine failure cannot paint a successful reveal or hide the actionable error', () => {
  const f = fixture(); try {
    f.open(true); f.date(); f.options(); globalThis.iztro = null;
    f.click('calculate'); assert.equal(f.phase,'ziwei-review'); assert.match(f.nodes['ziwei-error'].textContent,/未能建立命盤/);
    assert.equal(f.phases.includes('reveal'),false); f.click('view-result'); assert.equal(f.phase,'ziwei-review');
  } finally { f.restore(); }
});

test('editing from reveal clears the old chart and requires a new explicit confirmation', () => {
  const f = fixture(); try {
    f.open(true); f.date(); f.options(); f.click('calculate'); assert.equal(f.phase,'reveal');
    f.click('edit-date'); assert.equal(f.phase,'ziwei-date');
    f.click('view-result'); assert.equal(f.phase,'ziwei-date');
    f.type('day','17'); f.submit('ziwei-date-form'); f.options(); f.click('calculate'); f.click('view-result');
    assert.match(f.nodes['ziwei-palace-note'].textContent,/天機/);
    assert.doesNotMatch(f.nodes['ziwei-palace-note'].textContent,/本盤命宮[^。]*紫微/);
  } finally { f.restore(); }
});

test('no movie callback controls Ziwei, review, calculation or user navigation', () => {
  const app = readFileSync(new URL('./app.js',import.meta.url),'utf8');
  const callback = app.match(/onComplete\(\{ reason \}\) \{([^}]+)\}/)[1];
  assert.match(callback,/sceneFigure.dataset.complete = reason/);
  assert.doesNotMatch(callback,/calculate|openZiwei|paint|submit|input|showResult|click/);
});


test('the portrait stage has no negative-inset decorative element that widens mobile pages', () => {
  const css = readFileSync(new URL('./styles.css', import.meta.url),'utf8');
  assert.doesNotMatch(css, /\.home-stage:before/);
  assert.match(css, /dialog\[data-phase=ziwei-result\] \.dialog-grid\{display:block\}/);
});


test('alias → birth → free question → timed dial → six; changing only the question keeps the chart',()=>{
 const f=fixture();try{
   f.start();assert.doesNotMatch(f.html,/轉工|留低|data-situation/);f.alias('阿岑');f.click('example');
   assert.equal(f.field('date').value,'1995-08-15');assert.equal(f.field('time').value,'09:30');assert.equal(f.field('gender').value,'male');
   f.submit('career-birth-form');assert.match(f.html,/最近工作上/);
   f.ask('點同上司傾升職？');assert.equal(f.phase,'career-ritual');assert.equal(f.nodes['ritual-name'].textContent,'阿岑嘅事業盤');assert.match(f.nodes['ritual-birth'].textContent,/1995 年 08 月 15 日.*09:30/);
   assert.equal(f.timer().delay,6000);const fact=f.nodes['ritual-fact'].textContent;assert.match(fact,/官祿宮.*未.*借對宮夫妻宮.*武曲、貪狼/);
   f.endRitual();const first=f.lines();assert.equal(first.length,6);assert.match(first[0],/下一級/);assert.ok(first[1].includes(fact));assert.match(first[2],/武曲/);assert.match(first[3],/貪狼/);assert.match(first[4],/責|結果/);
   f.click('ask-again');assert.equal(f.field('question').value,'');f.ask('幾件急事點排先後？');f.endRitual();
   const second=f.lines();assert.equal(second.length,6);for(const i of [0,3,4,5])assert.notEqual(second[i],first[i]);for(const i of [1,2])assert.equal(second[i],first[i]);
   f.click('view-result');assert.ok(f.nodes['ziwei-palace-note'].textContent.includes(fact));assert.equal(f.nodes['ziwei-grid'].children.length,13);
   f.click('read-comic');assert.deepEqual(f.lines(),second);
 }finally{f.restore();}
});
test('optional question: skip ignores a draft and opens six frames on the same chart without attributing a question',()=>{
 const f=fixture();try{
   f.start();f.alias('阿榆');assert.match(f.html,/<label for="ziwei-gender">性別<select/);
   f.born('1995-08-15','09:30','');assert.match(f.nodes['ziwei-error'].textContent,/請選擇性別/);
   f.born();assert.match(f.html,/type="submit" value="skip-question"[^>]*>略過/);
   assert.doesNotMatch(f.html,/<textarea[^>]*required/);assert.match(f.html,/選填/);
   f.ask('我想同上司傾升職');f.endRitual();const asked=f.lines();
   f.click('ask-again');f.field('question').value='我冇打算送出呢句';
   f.submit('career-question-form',{value:'skip-question'});
   assert.equal(f.phase,'career-ritual');assert.equal(f.nodes['ritual-name'].textContent,'阿榆嘅事業盤');
   const fact=f.nodes['ritual-fact'].textContent;assert.match(fact,/未.*武曲、貪狼/);
   f.endRitual();const general=f.lines();assert.equal(general.length,6);
   assert.equal(asked[1],general[1]);assert.equal(asked[2],general[2]);assert.match(general[0],/官祿宮/);
   assert.doesNotMatch(general.join(''),/你想問：「|呢條問題|我冇打算送出呢句|傾升職/);
   f.click('view-result');assert.ok(f.nodes['ziwei-palace-note'].textContent.includes(fact));
   f.click('read-comic');assert.deepEqual(f.lines(),general);
   f.click('ask-again');f.ask('下星期有面試可以點準備？');f.endRitual();
   assert.match(f.lines()[0],/準備面試.*難題/);assert.equal(f.lines()[1],general[1]);
 }finally{f.restore();}
});
test('optional question: a blank normal submission reads the chosen birth chart, even with reduced motion',()=>{
 const f=fixture(true);try{
   f.start();f.alias();f.born('2000-08-16','03:30','female');f.ask('   ');
   assert.equal(f.phase,'career-ritual');assert.equal(f.timer().delay,0);f.endRitual();
   assert.equal(f.phase,'career-comic');assert.equal(f.lines().length,6);
   assert.match(f.lines()[1],/戌.*廉貞、天府/);assert.doesNotMatch(f.lines().join(''),/你想問：「|呢條問題|借對宮/);
   f.close();f.start();assert.equal(f.field('alias').value,'');
 }finally{f.restore();}
});
test('the last stamp must be held before the comic, even when the renderer never sends animationend',()=>{
 const f=fixture();try{
   f.start();f.alias();f.born();f.ask();
   const oldFinish=f.nodes['ritual-seal'].onanimationend;
   assert.equal(f.timer().delay,6000);
   oldFinish();assert.equal(f.phase,'career-ritual');assert.equal(f.nodes['ritual-box'].attrs['data-ink-set'],'');assert.equal(f.timer().delay,600);assert.equal(f.timers.size,1);
   f.tick();assert.equal(f.phase,'career-comic');assert.equal(f.lines().length,6);
   f.click('ask-again');f.ask('點同同事分工？');oldFinish();assert.equal(f.timer().delay,6000);
   f.tick();assert.equal(f.phase,'career-ritual');assert.equal(f.nodes['ritual-box'].attrs['data-ink-set'],'');assert.equal(f.timer().delay,1200);
   f.tick();assert.equal(f.phase,'career-comic');assert.equal(f.lines().length,6);
   f.click('ask-again');f.ask();f.nodes['ritual-seal'].onanimationend();const oldReveal=f.timer().fn;
   f.close();f.start();oldReveal();assert.equal(f.phase,'career-setup');assert.equal(f.timers.size,0);
 }finally{f.restore();}
});
test('keep the question, change the birth: the dial and result both switch from borrowed to native stars',()=>{
 const f=fixture(true);try{
   f.start();f.alias();f.born();f.ask('想同同事夾好分工');assert.equal(f.timer().delay,0);f.endRitual();const first=f.lines();
   f.click('career-birth');f.born('2000-08-16','03:30','female');assert.equal(f.field('question').value,'想同同事夾好分工');f.submit('career-question-form');
   assert.match(f.nodes['ritual-fact'].textContent,/戌.*本宮主星係廉貞、天府/);f.endRitual();const second=f.lines();assert.equal(second[0],first[0]);assert.equal(second[4],first[4]);assert.doesNotMatch(second.join(''),/武曲|貪狼|借對宮/);
   f.click('view-result');assert.match(f.nodes['ziwei-palace-note'].textContent,/戌.*廉貞、天府/);
 }finally{f.restore();}
});
test('missing time, invalid dates, overlong questions and unavailable engine never yield a success animation',()=>{
 const f=fixture();try{
   f.start();f.alias('   ');assert.match(f.nodes['ziwei-error'].textContent,/化名/);f.alias();f.born('1995-02-30');assert.ok(f.nodes['ziwei-error'].textContent);f.born('1995-08-15','','male');assert.match(f.nodes['ziwei-error'].textContent,/要有出生時間/);
   assert.equal(f.field('time').value,'');assert.equal(f.phases.includes('career-ritual'),false);f.click('example');f.submit('career-birth-form');f.ask('工'.repeat(241));assert.match(f.nodes['ziwei-error'].textContent,/240 字/);
   const real=globalThis.iztro;globalThis.iztro=null;f.ask('工作點安排？');assert.match(f.nodes['ziwei-error'].textContent,/未能建立事業盤/);assert.equal(f.field('question').value,'工作點安排？');assert.equal(f.phases.includes('career-ritual'),false);
   globalThis.iztro=real;f.ask();assert.equal(f.phase,'career-ritual');f.click('read-comic');assert.equal(f.phase,'career-comic');assert.equal(f.timers.size,0);
 }finally{f.restore();}
});
test('close cancels the old reveal; names and questions containing punctuation stay text, never markup',()=>{
 const f=fixture();try{
   f.start();f.alias('小晴<&>');f.born();f.ask('合作要用 <A&B>？');assert.equal(f.nodes['ritual-name'].textContent,'小晴<&>嘅事業盤');assert.doesNotMatch(f.html,/<&>/);
   const stale=f.timer().fn;f.close();assert.equal(f.timers.size,0);f.start();assert.equal(f.field('alias').value,'');f.alias('乙');assert.equal(f.field('date').value,'');f.born();assert.equal(f.field('question').value,'');stale();assert.equal(f.phase,'career-setup');
   f.ask('合作要用 <A&B>？');f.endRitual();assert.match(f.lines()[0],/分工/);assert.doesNotMatch(f.lines().join('')+f.html,/<A&B>/);
 }finally{f.restore();}
});
test('1280 unique synthetic birthdays and aliases render the same native/borrowed evidence in the dial, comic and grid',t=>{
 const f=fixture(true), dates=new Set(),names=new Set(),branches=new Set(),labels=['阿晴','Rin','星🌙','Élan','小九·','晴子','晨星長名字試排','Q&A'],questions=['我想傾升職','如何排工作先後','轉行前點部署','下星期有面試','點同同事夾交接','進修學邊樣','接單點安排','一個未分類問題'];let native=0,borrowed=0;
 try{for(let i=0;i<1280;i++){
   const day=new Date(Date.UTC(1984,1,29)+i*11*86400000).toISOString().slice(0,10), time=['00:00','22:59','23:00','23:59','09:30','03:30','11:07','15:31','17:06','19:42','21:55','01:12','07:47'][i%13];
   const alias=labels[i%labels.length]+i,q=questions[i%questions.length]+'？'+i;
   f.start();f.alias(alias);f.born(day,time,i%2?'female':'male');f.ask(q);assert.equal(f.phase,'career-ritual',day);assert.equal(f.nodes['ritual-name'].textContent,alias+'嘅事業盤');
   const [y,m,d]=day.split('-');assert.equal(f.nodes['ritual-birth'].textContent,y+' 年 '+m+' 月 '+d+' 日　'+time);
   const dial=f.nodes['career-dial'],houses=dial.children.filter(n=>n.attrs.class==='dial-house');assert.equal(houses.length,12);assert.equal(new Set(houses.map(n=>n.textContent)).size,12);assert.equal(houses.find(n=>n.attrs.fill==='#ffbe92').textContent,'官祿');
   const fact=f.nodes['ritual-fact'].textContent,branch=fact.match(/官祿宮喺(.)位/)[1];branches.add(branch);assert.equal(dial.children.at(-1).textContent,branch+' 位');f.endRitual();const lines=f.lines();assert.equal(lines.length,6);assert.doesNotMatch(lines[0],/你想問：「/);assert.ok(lines[1].includes(fact));assert.ok(lines.every(l=>l.length>5&&!l.includes('undefined')));
   f.click('view-result');assert.ok(f.nodes['ziwei-palace-note'].textContent.includes(fact));const cells=f.nodes['ziwei-grid'].children;
   const own=cells.find(c=>/^官祿( · 身宮)?$/.test(c.children[0].textContent)),other=cells.find(c=>/^夫妻( · 身宮)?$/.test(c.children[0].textContent));assert.ok(own.children[1].textContent.endsWith(branch));const isEmpty=own.children.some(n=>n.textContent==='本宮無十四主星');assert.equal(fact.includes('借對宮'),isEmpty);
   const stars=(isEmpty?other:own).children.filter(n=>n.className==='ziwei-major').map(n=>n.textContent.split(' · ')[0]);assert.ok(stars.length>0&&stars.every(x=>fact.includes(x)));if(isEmpty)borrowed++;else native++;dates.add(day);names.add(alias);f.close();
 }assert.equal(names.size,1280);assert.equal(dates.size,1280);assert.equal(branches.size,12);assert.ok(native&&borrowed);t.diagnostic('unique aliases/dates=1280; native='+native+'; opposite='+borrowed+'; branches='+branches.size);
 }finally{f.restore();}
});

test('career comic answers the chosen question first and never guesses when focus is unclear', () => {
  const f=fixture(true);
  const read = (q, skip=false) => {
    if (skip) {
      f.field('question').value=q;
      f.submit('career-question-form',{value:'skip-question'});
    } else f.ask(q);
    f.endRitual();
    const lines=f.lines();
    f.click('ask-again');
    return lines;
  };
  try {
    f.start();f.alias();f.born();
    const deadline=read('我唔係想升職，係想知三份稿點排先後。');
    assert.doesNotMatch(deadline.slice(3).join(''), /升職|職級|加薪/);
    assert.match(deadline[0], /交|接手/, deadline[0]);
    assert.match(deadline[1], /官祿宮.*借對宮夫妻宮.*武曲、貪狼/);
    for (const [question, lead, excluded] of [
      ['我唔想升職，只想同同事講清楚分工。', /跟到邊|接手/, /職級|加薪/],
      ['考慮轉工，但想先知道進修有冇用。', /練習|想學|試做/, /轉工|職位/],
      ['我想先排清兩個限期，再傾升職。', /幾點要交|接手/, /職級|加薪/],
      ['唔知點開口傾升職。', /下一級|加咗.*責任/, /限期/],
      ['我想轉工同進修，兩樣可以點安排？', /先揀|想先傾/, /趕住走|報課程/],
      ['先後要點排？順便想問升職。', /先揀|想先傾/, /職級|加薪/],
      ['我唔想升職。', /換個講法/, /升職|職級|加薪/],
      ['我唔想再升職。', /換個講法/, /升職|職級|加薪/],
      ['我唔想升職，只想少啲加班。', /收工前|押後/, /升職|職級|加薪/],
      ['我唔想再加班，想知同上司點傾？', /收工前|押後/, /升職|職級|加薪/],
      ['我想傾加薪，唔想再升職。', /薪酬點樣檢討/, /行到下一級/],
      ['只想學人工智能。', /試做/, /薪酬|職級/],
      ['我淨係想帶狗返工，可以嗎？', /換個講法/, /行到下一級/],
      ['我唔知升職嗰件事點同上司溝通。', /下一級/, /想先傾邊一件/],
      ['升職唔係我想問嘅，我想知點排兩個限期。', /幾點要交/, /升職|職級/],
      ['我暫時唔諗升職，想問點同同事交接。', /邊個接手/, /升職|職級/],
      ['我唔想升職，係想準時收工。', /收工前/, /升職|職級/],
      ['手上有三份稿，應該做邊份先？', /幾點要交/, /想先傾邊/],
      ['我想轉工，但係我最想先知讀邊科有用。', /想知進修/, /新工|新職位/],
      ['我同同事意見唔同。', /你嗰邊點睇/, /行到下一級|初稿/]
    ]) {
      const lines=read(question);
      assert.equal(lines.length,6);
      assert.match(lines[0],lead,question+' → '+lines[0]);
      assert.doesNotMatch(lines.join(''),excluded);
      assert.equal(lines[1],deadline[1]);
    }
    const skipped=read('未送草稿：我想傾升職',true);
    assert.deepEqual(skipped,read(''));
    assert.match(skipped[0],/冇特別問題|官祿宮/);
    assert.doesNotMatch(skipped.join(''),/未送草稿|升職|呢條問題/);
    f.click('career-birth');f.born('2000-08-16','03:30','female');
    const other=read('我唔係想升職，係想知三份稿點排先後。');
    assert.equal(other[0],deadline[0]);
    assert.match(other[1],/本宮主星係廉貞、天府/);
    assert.doesNotMatch(other[1],/借對宮/);
  } finally { f.restore(); }
});

test('two explicit career topics offer real choices; choosing one keeps the same chart, without another form or ritual',()=>{
 const f=fixture(true);
 try {
   for (const [date,time,sex,stars] of [['1995-08-15','09:30','male',/借對宮夫妻宮.*武曲、貪狼/],['2000-08-16','03:30','female',/本宮主星係廉貞、天府/]]) {
     f.start(); f.alias(); f.born(date,time,sex); f.ask('我想傾升職，又想同同事分清楚工作，可以點做？'); f.endRitual();
     const initial=f.lines(), fact=initial[1];
     assert.match(fact,stars); assert.match(initial[0],/想先傾邊一件/);
     const options=()=>f.nodes['career-strip'].children[0].children[1].children.at(-1).children;
     assert.deepEqual(options().map(b=>[b.tagName,b.attrs.type,b.attrs['data-ziwei'],b.attrs['data-topic']]),[
       ['button','button','choose-career-topic','升職'],['button','button','choose-career-topic','分工交接']]);
     f.click('choose-career-topic',{topic:'待遇'}); assert.deepEqual(f.lines(),initial);
     for (const [topic,expect] of [['分工交接',/邊個接手/],['升職',/下一級/]]) {
       const phases=f.phases.length;
       f.click('choose-career-topic',{topic}); const lines=f.lines();
       assert.deepEqual(f.phases.slice(phases),['career-comic']); assert.match(lines[0],expect);
       assert.equal(lines[1],fact); assert.equal(lines.length,6);
       f.click('view-result'); assert.match(f.nodes['ziwei-palace-note'].textContent,stars);
       f.click('read-comic'); assert.deepEqual(f.lines(),lines);
       f.click('reset-career-topic'); assert.deepEqual(f.lines(),initial);
     }
     f.click('ask-again'); f.ask('點先可以帶狗返工？'); f.endRitual();
     assert.match(f.lines()[0],/換個講法/); f.click('edit-question');
     assert.equal(f.field('question').value,'點先可以帶狗返工？');
     f.field('question').value='唔應引用嘅草稿：升職'; f.submit('career-question-form',{value:'skip-question'}); f.endRitual();
     assert.match(f.lines()[0],/冇特別問題/); assert.doesNotMatch(f.lines().join(''),/唔應引用|升職|想先傾邊/);
     f.close();
   }
 } finally {f.restore();}
});

test('homepage removes the whole optional story shelf, not the FAQs, entry or footer',()=>{
  const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
  assert.doesNotMatch(html,/另外，借個故事整理選擇|story-shelf|story-links|filter-status|data-action="story"/);
  assert.equal((html.match(/<details><summary>/g)||[]).length,4);
  assert.match(html,/<section class="before-enter[^]*<\/section>\s*<\/main>\s*<footer/);
  assert.match(html,/data-action="enter"/);assert.match(html,/傳統文化參考，不作吉凶預言/);
});
test('love follows the shared setup but uses its own dial, answer, opposite stars, and chart return',()=>{
 const f=fixture();try{
  const charts=[['09:30','丑',/夫妻宮喺丑位，本宮主星係武曲、貪狼/],['19:30','申',/夫妻宮喺申位，本宮無十四主星。借對宮官祿宮（寅位）嘅太陽、巨門/]];
  let first='',last='',life='';
  for(const [time,branch,fact] of charts){
    f.start('夫妻');assert.match(f.html,/愛情手記/);f.alias('阿澄');f.born('1995-08-15',time);
    assert.match(f.html,/感情上/);assert.doesNotMatch(f.html,/工作|公司/);
    f.ask('我想有多啲私人空間，點開口？');
    assert.equal(f.nodes['ritual-name'].textContent,'阿澄嘅愛情盤');assert.match(f.nodes['ritual-fact'].textContent,fact);
    const dial=f.nodes['career-dial'].children;
    assert.equal(dial.find(n=>n.attrs.fill==='#ffbe92').textContent,'夫妻');assert.equal(dial.at(-2).textContent,'夫妻');assert.equal(dial.at(-1).textContent,branch+' 位');
    f.endRitual();const lines=f.lines();assert.equal(lines.length,6);
    assert.equal(f.nodes['dialog-title'].textContent,'阿澄嘅愛情手記');assert.match(f.html,/對返夫妻宮/);assert.doesNotMatch(f.html,/事業手記|對返官祿宮/);
    assert.match(lines[0],/時間|空間|靜/);assert.match(lines[1],fact);assert.match(lines.at(-1),/可以試吓/);
    assert.doesNotMatch(lines.join(''),/上司|加薪|轉工|交稿|你已婚|一定會復合/);
    if(first){assert.equal(lines[0],first);assert.equal(lines[5],last);assert.notEqual(lines[2],life);}else{[first,life,last]=[lines[0],lines[2],lines[5]];}
    f.click('view-result');assert.match(f.nodes['ziwei-palace-note'].textContent,fact);f.click('read-comic');assert.deepEqual(f.lines(),lines);
    f.close();
  }
 }finally{f.restore();}
});
test('love question only sets the conversation: clear priorities, no-contact, two choices, unknown and skip',()=>{
 const f=fixture(true);try{
  f.start('夫妻');f.alias();f.born();const read=q=>{f.ask(q);f.endRitual();return f.lines();};
  const a=read('我唔係想表白，只係想知點講需要私人空間。');assert.match(a[0],/時間|空間|靜/);assert.doesNotMatch(a[0],/表白|想再認識你/);
  f.click('ask-again');const b=read('我想表白，又想傾私人空間。');assert.match(b[0],/想先傾邊一件/);
  const opts=f.nodes['career-strip'].children[0].children[1].children.at(-1).children.map(n=>n.attrs['data-topic']);
  assert.deepEqual(new Set(opts),new Set(['講出心意','相處界線']));
  f.click('choose-career-topic',{topic:'相處界線'});assert.equal(f.lines()[0],a[0]);assert.equal(f.lines()[1],a[1]);f.click('reset-career-topic');
  f.click('choose-career-topic',{topic:'講出心意'});assert.notEqual(f.lines()[0],a[0]);assert.equal(f.lines()[1],a[1]);
  f.click('ask-again');assert.match(read('對方已經話唔好再搵佢，仲應唔應該再傳訊息？')[0],/唔再聯絡|唔好再傳|唔再傳/);
  for(const [q,wanted] of [
    ['想見多啲，但一開口就拗，點講好？',/先約實一次/],
    ['我單身，有個鍾意嘅人，想試吓表白。',/想再認識你/],
    ['幾時遇到正緣？',/認識人/],
    ['已讀咗但未覆，係咪唔鍾意我？',/未覆|想先傾邊一件/],
    ['拗撬之後點開口？',/唔使重講/],
    ['分手後仲應唔應該復合？',/唔想重演/],
    ['佢威脅我，又想約我單獨見面傾復合。',/唔需要單獨見面/]]){
    f.click('ask-again');assert.match(read(q)[0],wanted,q);
  }
  f.click('ask-again');assert.match(read('今朝條圍巾係藍色。')[0],/換個講法/);
  f.click('ask-again');const blank=read('');assert.match(blank[0],/夫妻宮/);assert.doesNotMatch(blank.join(''),/你哋最近|你另一半|你男朋友|你女朋友/);
  f.click('ask-again');f.field('question').value='草稿：想復合';f.submit('career-question-form',{value:'skip-question'});f.endRitual();assert.deepEqual(f.lines(),blank);
  f.close();f.start('官祿');assert.equal(f.field('alias').value,'');f.alias();assert.equal(f.field('date').value,'');f.born();f.ask('點問升職？');f.endRitual();assert.match(f.lines()[0],/下一級/);assert.match(f.html,/對返官祿宮/);
 }finally{f.restore();}
});
