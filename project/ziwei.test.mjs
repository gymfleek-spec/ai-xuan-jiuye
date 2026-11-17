import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { calculateZiwei, getZiweiError, ZIWEI_RULES, attachZiwei } from './ziwei.js';

const code = readFileSync(new URL('./vendor/iztro-v2.6.5.min.js', import.meta.url), 'utf8');
const context = { self: {}, console };
runInNewContext(code, context);
const engine = context.self.iztro;
const sample = { year: '2000', month: '8', day: '16', precision: 'exact', time: '03:30', gender: 'female', place: '虛構測試城市' };
const plain = value => JSON.parse(JSON.stringify(value));
const structure = chart => plain(chart.palaces.map(p => ({ name: p.name, branch: p.earthlyBranch, stars: p.majorStars, minor: p.minorStars, body: p.isBodyPalace })));

test('engine is pinned, self-contained and has retained license notices', () => {
  assert.equal(engine.version, '2.6.5');
  assert.equal(createHash('sha256').update(code).digest('hex'), '6d7993c30d76b4720ccd6c981893738e1c5d3d8c925115ea910c1a161c41882b');
  assert.match(readFileSync(new URL('./vendor/THIRD_PARTY_NOTICES.txt', import.meta.url), 'utf8'), /MIT License/);
  assert.ok(readFileSync(new URL('./玄與九爺-網頁初稿.html', import.meta.url), 'utf8').includes(readFileSync(new URL('./vendor/THIRD_PARTY_NOTICES.txt', import.meta.url), 'utf8')));
});

test('published iztro example has the documented lunar date, five-element class, soul/body and main stars', () => {
  // Source: https://docs.iztro.com/quick-start, 2000-8-16, timeIndex 2, female.
  const chart = calculateZiwei(sample, engine);
  assert.equal(chart.status, 'ready');
  assert.equal(chart.timeIndex, 2);
  assert.equal(chart.lunarDate, '二〇〇〇年七月十七');
  assert.equal(chart.fiveElementsClass, '木三局');
  assert.equal(chart.palaces.find(p => p.name === '命宮').earthlyBranch, '午');
  assert.equal(chart.palaces.find(p => p.isBodyPalace).earthlyBranch, '戌');
  assert.deepEqual(plain(chart.palaces.find(p => p.name === '命宮').majorStars.map(s => s.name)), ['紫微']);
  assert.deepEqual(plain(chart.palaces.find(p => p.name === '財帛').majorStars.filter(s => s.type === 'major').map(s => s.name)), ['武曲', '天相']);
  assert.equal(chart.palaces.reduce((n, p) => n + p.majorStars.filter(s => s.type === 'major').length, 0), 14);
  assert.equal(new Set(chart.palaces.map(p => p.earthlyBranch)).size, 12);
});

test('unknown time and withheld gender never invoke the engine or fabricate a chart', () => {
  const denied = { get version() { throw new Error('engine must not be read'); } };
  for (const input of [{ ...sample, precision: 'unknown', time: '' }, { ...sample, gender: 'withheld' }]) {
    assert.deepEqual(calculateZiwei(input, denied), { status: 'needs-input' });
  }
});

test('date, time and parameter trust boundaries reject bad values without a default gender/hour', () => {
  for (const patch of [{ year: '' }, { year: '10000' }, { year: '1899' }, { year: '1900', month: '2', day: '29' }, { month: '13' }, { day: '99' }, { year: '<img>' }, { time: '24:00' }, { time: '1:00' }, { precision: 'approximate' }, { precision: 'unknown', time: '00:00' }, { gender: '' }, { gender: '__proto__' }, { place: 'x'.repeat(81) }]) {
    assert.ok(getZiweiError({ ...sample, ...patch }), JSON.stringify(patch));
    assert.throws(() => calculateZiwei({ ...sample, ...patch }, engine));
  }
  assert.ok(getZiweiError(null));
  assert.equal(getZiweiError({ ...sample, year: '2000', month: '2', day: '29' }), null);
});

test('all 13 hour indices have exact clock boundaries, including early and late Zi', () => {
  const expected = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12];
  for (const [hour, index] of expected.entries()) {
    for (const minutes of ['00', '59']) {
      const time = `${String(hour).padStart(2, '0')}:${minutes}`;
      assert.equal(calculateZiwei({ ...sample, time }, engine).timeIndex, index, time);
    }
  }
});

test('documented forward late-Zi rule uses next-day chart, including lunar month/year boundaries', () => {
  // Source: https://docs.iztro.com/posts/config-n-plugin, late-Zi example.
  for (const [day, next] of [['1996-8-13', '1996-8-14'], ['2024-2-9', '2024-2-10'], ['2023-3-21', '2023-3-22']]) {
    const input = date => { const [year, month, day] = date.split('-'); return { ...sample, year, month, day }; };
    const late = calculateZiwei({ ...input(day), time: '23:30' }, engine);
    const early = calculateZiwei({ ...input(next), time: '00:30' }, engine);
    assert.equal(late.lunarDate, early.lunarDate);
    assert.equal(late.fiveElementsClass, early.fiveElementsClass);
    assert.deepEqual(structure(late), structure(early));
  }
});

test('same inputs repeat, changed dates alter the chart and input objects are not mutated', () => {
  const input = { ...sample }, before = { ...input };
  assert.deepEqual(structure(calculateZiwei(input, engine)), structure(calculateZiwei(input, engine)));
  assert.deepEqual(input, before);
  assert.notDeepEqual(structure(calculateZiwei(input, engine)), structure(calculateZiwei({ ...input, day: '17' }, engine)));
  assert.ok(Object.isFrozen(ZIWEI_RULES));
});

test('missing or wrong engine reports failure instead of returning a story result', () => {
  for (const engine of [null, {}, { version: '2.6.4' }]) assert.throws(() => calculateZiwei(sample, engine), /排盤暫時未能使用/);
});

test('chart UI uses text nodes, captures only its own forms and keeps old queued close events out of a new visit', () => {
  const oldDocument = globalThis.document, handlers = {}, fields = {};
  let html = '';
  globalThis.document = { getElementById: id => fields[id] ||= { value: '', textContent: '', disabled: false, focus() {}, setAttribute() {} } };
  const dialog = { open: true, addEventListener: (name, fn) => handlers[name] = fn };
  const content = { addEventListener: (name, fn) => handlers[name] = fn };
  const type = (key, value) => handlers.input({ target: { dataset: { ziweiField: key }, value, removeAttribute() {} } });
  const click = name => handlers.click({ target: { closest: () => ({ dataset: { ziwei: name } }) } });
  try {
    const open = attachZiwei(dialog, content, value => { html = value; });
    open(true);
    type('year', '2000'); type('month', '8'); type('day', '16');
    handlers.close(); // native close event from an earlier visit; dialog is already open again.
    click('edit-date');
    assert.equal(fields['ziwei-year'].value, '2000');
    let prevented = false;
    handlers.submit({ target: { id: 'ziwei-date-form' }, preventDefault() { prevented = true; }, stopImmediatePropagation() {} });
    assert.ok(prevented); assert.match(html, /ziwei-options-form/);
    dialog.open = false; handlers.close(); dialog.open = true; open(true);
    assert.equal(fields['ziwei-year'].value, '');
  } finally { globalThis.document = oldDocument; }
  const source = readFileSync(new URL('./ziwei.js', import.meta.url), 'utf8');
  assert.match(source, /node\.textContent = value/);
  assert.doesNotMatch(source, /\$\{input\.(?:place|year|time)\}[^\n]*paint\(/);
  assert.doesNotMatch(source, /\bfetch\s*\(|localStorage|sessionStorage|sendBeacon|XMLHttpRequest|document\.cookie/);
});


test('malformed engine output is rejected before the result screen is painted', () => {
  const bad = { version: '2.6.5', astro: { resetConfig() {}, withOptions() { return { lunarDate: 'fixture', fiveElementsClass: 'fixture', palaces: [...'子丑寅卯辰巳午未申酉戌亥'].map((earthlyBranch, i) => ({ earthlyBranch, name: i === 0 ? '命宮' : '其他', isBodyPalace: i === 0 })) }; } } };
  assert.throws(() => calculateZiwei(sample, bad), /未能核對命盤/);
});


test('portable HTML is an offline public preview, not a private account client', () => {
  const html = readFileSync(new URL('./玄與九爺-網頁初稿.html', import.meta.url), 'utf8');
  assert.match(html, /data-mode="public-preview"/);
  assert.match(html, /connect-src 'none'; form-action 'none'/);
  assert.doesNotMatch(html, /<script[^>]+src=/);
  assert.doesNotMatch(html, /^import /m);
});
