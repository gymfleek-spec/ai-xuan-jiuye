import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { calculateZiwei, getPalaceReading } from './ziwei.js';

const context = { self: {} };
runInNewContext(readFileSync(new URL('./vendor/iztro-v2.6.5.min.js', import.meta.url), 'utf8'), context);
const engine = context.self.iztro;
const input = { year: '2000', month: '8', day: '16', time: '03:30', precision: 'exact', gender: 'female', place: '' };
const plain = value => JSON.parse(JSON.stringify(value));

test('three focus readings use the selected real palace and only its major stars', () => {
  const chart = calculateZiwei(input, engine);
  for (const [name, branch, stars] of [['命宮', '午', ['紫微']], ['官祿', '戌', ['廉貞', '天府']], ['夫妻', '辰', ['七殺']]]) {
    const reading = getPalaceReading(chart, name);
    assert.equal(reading.palace, name); assert.equal(reading.branch, branch);
    assert.deepEqual(plain(reading.stars.map(star => star.name)), stars);
    assert.ok(reading.lead && reading.stars.every(star => star.theme && star.question.endsWith('？')));
  }
});

test('13 real clock periods × 3 topics retain exact engine evidence without mutating a chart', () => {
  for (const time of ['00:30', '01:30', '03:30', '05:30', '07:30', '09:30', '11:30', '13:30', '15:30', '17:30', '19:30', '21:30', '23:30']) {
    const chart = calculateZiwei({ ...input, time }, engine), before = JSON.stringify(chart);
    for (const name of ['命宮', '官祿', '夫妻']) {
      const reading = getPalaceReading(chart, name), palace = chart.palaces.find(p => p.name === name);
      assert.equal(reading.branch, palace.earthlyBranch);
      assert.deepEqual(plain(reading.stars.map(star => star.name)), plain(palace.majorStars.filter(star => star.type === 'major').map(star => star.name)));
    }
    assert.equal(JSON.stringify(chart), before);
  }
});

test('empty main palace has no invented star, question or borrowed opposite-palace reading', () => {
  const reading = getPalaceReading(calculateZiwei({ ...input, time: '01:30' }, engine), '命宮');
  assert.equal(reading.branch, '未'); assert.deepEqual(plain(reading.stars), []);
});

test('two stars remain separate cultural prompts, not a made-up combined fortune', () => {
  const reading = getPalaceReading(calculateZiwei({ ...input, time: '11:30' }, engine), '命宮');
  assert.deepEqual(plain(reading.stars.map(star => star.name)), ['紫微', '天府']);
  assert.notEqual(reading.stars[0].theme, reading.stars[1].theme);
  assert.notEqual(reading.stars[0].question, reading.stars[1].question);
});

test('changing date or time changes evidence and reflection prompts instead of retaining old text', () => {
  const reading = patch => getPalaceReading(calculateZiwei({ ...input, ...patch }, engine), '命宮');
  assert.deepEqual(plain(reading({}).stars.map(star => star.name)), ['紫微']);
  assert.deepEqual(plain(reading({ day: '17' }).stars.map(star => star.name)), ['天機']);
  assert.notDeepEqual(reading({}), reading({ day: '17' }));
  assert.notDeepEqual(reading({}), reading({ time: '23:30' }));
});

test('all 14 named main stars have a bounded prompt and fixed public source links', () => {
  const chart = calculateZiwei(input, engine);
  for (const name of ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍']) {
    const fixture = { ...chart, palaces: chart.palaces.map(p => p.name === '命宮' ? { ...p, majorStars: [{ name, type: 'major' }] } : p) };
    const reading = getPalaceReading(fixture, '命宮');
    assert.equal(reading.stars[0].name, name); assert.ok(reading.stars[0].theme && reading.stars[0].question);
    assert.deepEqual(reading.sources.map(s => s.url), ['https://docs.iztro.com/learn/palace', 'https://docs.iztro.com/learn/major-star']);
    assert.ok(reading.sources.every(s => new URL(s.url).search === ''));
  }
});

test('missing chart, unsupported topic and malformed evidence fail closed', () => {
  const chart = calculateZiwei(input, engine);
  for (const value of [null, {}, { status: 'needs-input', palaces: chart.palaces }, { status: 'ready', palaces: [] }]) assert.equal(getPalaceReading(value, '命宮'), null);
  for (const topic of ['health', '財帛', '__proto__', 'constructor', undefined]) assert.equal(getPalaceReading(chart, topic), null);
  for (const patch of [{ earthlyBranch: '' }, { earthlyBranch: '<img>' }, { majorStars: null }, { majorStars: [null] }, { majorStars: [{ name: '<script>', type: 'major' }] }, { majorStars: [{ name: '紫微', type: 'major' }, { name: '紫微', type: 'major' }] }]) {
    const malformed = { ...chart, palaces: chart.palaces.map(p => p.name === '命宮' ? { ...p, ...patch } : p) };
    assert.equal(getPalaceReading(malformed, '命宮'), null);
  }
});

test('reading stays local, uses safe text and disclosures, and makes no prediction or confidence score', () => {
  const source = readFileSync(new URL('./ziwei.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie|confidence|probability/);
  assert.match(source, /note\.replaceChildren\(\)/);
  assert.match(source, /node\.textContent = value/);
  assert.match(source, /同宮有兩粒主星，亦唔等於簡單相加/);
  assert.match(source, /無主星唔代表好或壞/);
  assert.match(source, /未合看輔星、四化、三方四正、借星或流年/);
  assert.match(source, /<details class="ziwei-chart-details"><summary>打開十二宮命盤/);
  assert.match(source, /aria-live="polite" aria-atomic="true"/);
  assert.match(source, /link\.rel = 'noopener noreferrer'/);
});
