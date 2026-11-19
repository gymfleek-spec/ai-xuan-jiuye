import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { attachZiwei } from './ziwei.js';

const loaded = { self: {} };
runInNewContext(readFileSync(new URL('./vendor/iztro-v2.6.5.min.js', import.meta.url), 'utf8'), loaded);
function fixture() {
  const prior = { document: globalThis.document, engine: globalThis.iztro };
  const nodes = {}, handlers = {}, phases = [];
  class Node {
    constructor() { this.children = []; this.style = {}; this.value = ''; this.parentElement = { addEventListener() {} }; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    setAttribute() {} removeAttribute() {} focus() {}
    get textContent() { return this.text || this.children.map(n => n.textContent).join(''); }
    set textContent(value) { this.text = value; }
  }
  globalThis.document = { createElement: () => new Node(), getElementById: id => nodes[id] ||= new Node() };
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
  const submit = id => handlers.submit({ target: { id }, preventDefault() {}, stopImmediatePropagation() {} });
  const date = () => { type('year','2000'); type('month','8'); type('day','16'); submit('ziwei-date-form'); };
  const options = (precision = 'exact') => { type('precision',precision); if (precision === 'exact') type('time','03:30'); type('gender','female'); submit('ziwei-options-form'); };
  return { nodes, phases, content, open, click, type, submit, date, options, get html() { return html; }, get phase() { return phase; }, restore() { globalThis.document = prior.document; globalThis.iztro = prior.engine; } };
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
      f.click('focus',{palace:'官祿'}); assert.equal(f.phase,'response');assert.match(f.html,/官祿宮/);
      f.click('skip'); f.click('back-intro'); assert.equal(f.phase,'interaction');
    }
    assert.equal(f.phases.filter(v=>v==='entrance').length,2);
  } finally { f.restore(); }
});
test('each topic opens its actual palace and twelve houses from a fictitious chart', () => {
  for(const [palace, label] of [['官祿','事業'],['夫妻','愛情'],['田宅','家庭'],['財帛','財運'],['命宮','未來方向']]) {
    const f=fixture();try{
      f.open(false);f.click('greet',{reply:'yes'});f.click('focus',{palace});assert.ok(f.html.includes(label));assert.match(f.html,/免費試排紫微盤/);
      f.click('skip');f.date();f.options();assert.match(f.html,/免費排盤/);f.click('calculate');f.click('view-result');
      assert.equal(f.phase,'ziwei-result');assert.ok(f.html.includes('先由「'+label+'」睇起'));
      assert.equal(f.nodes['ziwei-grid'].children.length,13);assert.ok(f.nodes['ziwei-palace-note'].textContent.includes('本盤'+palace));
    }finally{f.restore();}
  }
});

test('explicit reviewed calculation creates a real chart before reveal; movie completion cannot open it', () => {
  const f = fixture(); try {
    f.open(false); f.click('greet',{reply:'curious'}); f.click('focus',{palace:'官祿'}); f.click('skip');
    f.date(); assert.equal(f.phase,'ziwei-options'); f.options(); assert.equal(f.phase,'ziwei-review');
    f.click('view-result'); assert.equal(f.phase,'ziwei-review');
    f.click('calculate'); assert.equal(f.phase,'reveal'); assert.match(f.html,/十二宮命盤排好喇/);
    assert.doesNotMatch(f.html,/id="ziwei-grid"/);
    f.click('view-result'); assert.equal(f.phase,'ziwei-result');
    assert.equal(f.nodes['ziwei-grid'].children.length,13);
    assert.match(f.nodes['ziwei-palace-note'].textContent,/官祿喺戌位，廉貞、天府/);
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
