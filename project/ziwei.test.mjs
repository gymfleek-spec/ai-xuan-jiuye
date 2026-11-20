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

// Fortel 1.3.4 (independent of iztro): https://github.com/airicyu/fortel-ziweidoushu
// Civil clock, 天盤, leap month switches after day 15. For our 23:00 policy compare next civil day at 00:00.
// The two schools differ on 庚干化科; transformations are not an input to the career comic.
test('five independent natal chart cases including the three civil times at New Year', () => {
  const cases = [
    ['1995-08-15','09:30','male','一九九五年七月二十','土五局',
     '戊子/子女/天同太陰 己丑/夫妻身/武曲貪狼 戊寅/兄弟/太陽巨門 己卯/命宮/天相 庚辰/父母/天梁天機 辛巳/福德/七殺紫微 壬午/田宅/ 癸未/官祿/ 甲申/僕役/ 乙酉/遷移/廉貞破軍 丙戌/疾厄/ 丁亥/財帛/天府'],
    ['2000-08-16','03:30','female','二〇〇〇年七月十七','木三局',
     '戊子/遷移/貪狼 己丑/疾厄/天同巨門 戊寅/財帛/天相武曲 己卯/子女/天梁太陽 庚辰/夫妻/七殺 辛巳/兄弟/天機 壬午/命宮/紫微 癸未/父母/ 甲申/福德/破軍 乙酉/田宅/ 丙戌/官祿身/天府廉貞 丁亥/僕役/太陰'],
    ['2023-04-05','12:00','male','二〇二三年閏二月十五','木三局',
     '甲子/田宅/貪狼 乙丑/官祿/天同巨門 甲寅/僕役/天相武曲 乙卯/遷移/天梁太陽 丙辰/疾厄/七殺 丁巳/財帛/天機 戊午/子女/紫微 己未/夫妻/ 庚申/兄弟/破軍 辛酉/命宮身/ 壬戌/父母/天府廉貞 癸亥/福德/太陰'],
    ['2023-04-06','12:00','male','二〇二三年閏二月十六','水二局',
     '甲子/福德/天梁 乙丑/田宅/七殺廉貞 甲寅/官祿/ 乙卯/僕役/ 丙辰/遷移/天同 丁巳/疾厄/武曲破軍 戊午/財帛/太陽 己未/子女/天府 庚申/夫妻/天機太陰 辛酉/兄弟/紫微貪狼 壬戌/命宮身/巨門 癸亥/父母/天相'],
    ['2024-02-09','22:59','female','二〇二三年十二月三十','水二局',
     '甲子/夫妻身/天府武曲 乙丑/兄弟/太陰太陽 甲寅/命宮/貪狼 乙卯/父母/天機巨門 丙辰/福德/天相紫微 丁巳/田宅/天梁 戊午/官祿/七殺 己未/僕役/ 庚申/遷移/廉貞 辛酉/疾厄/ 壬戌/財帛/破軍 癸亥/子女/天同'],
    ['2024-02-09','23:00','female','二〇二四年正月初一','火六局',
     '丙子/夫妻/天梁 丁丑/兄弟/七殺廉貞 丙寅/命宮身/ 丁卯/父母/ 戊辰/福德/天同 己巳/田宅/武曲破軍 庚午/官祿/太陽 辛未/僕役/天府 壬申/遷移/天機太陰 癸酉/疾厄/紫微貪狼 甲戌/財帛/巨門 乙亥/子女/天相'],
    ['2024-02-10','00:00','female','二〇二四年正月初一','火六局',
     '丙子/夫妻/天梁 丁丑/兄弟/七殺廉貞 丙寅/命宮身/ 丁卯/父母/ 戊辰/福德/天同 己巳/田宅/武曲破軍 庚午/官祿/太陽 辛未/僕役/天府 壬申/遷移/天機太陰 癸酉/疾厄/紫微貪狼 甲戌/財帛/巨門 乙亥/子女/天相'],

  ];
  const branches='子丑寅卯辰巳午未申酉戌亥';
  for(const [date,time,gender,lunar,element,layout] of cases) {
    const [year,month,day]=date.split('-');
    const chart=calculateZiwei({year,month,day,time,gender,place:'',precision:'exact'},engine);
    assert.equal(chart.lunarDate.replace('闰','閏').replace(/[臘腊]月/,'十二月'),lunar);
    assert.equal(chart.fiveElementsClass,element);
    const cells=Array.from(chart.palaces).sort((a,b)=>branches.indexOf(a.earthlyBranch)-branches.indexOf(b.earthlyBranch));
    assert.equal(cells.map(p=>[p.heavenlyStem+p.earthlyBranch,p.name.replace('仆役','僕役')+(p.isBodyPalace?'身':''),p.majorStars.filter(s=>s.type==='major').map(s=>s.name).sort().join('')].join('/')).join(' '),layout,date+' '+time);
  }
});
