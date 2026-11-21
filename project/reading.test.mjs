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

test('focused readings retain the original house and native stars even when a reading borrows', () => {
  const chart = calculateZiwei(input, engine);
  for (const [name, branch, stars] of [['命宮', '午', ['紫微']], ['官祿', '戌', ['廉貞', '天府']], ['夫妻', '辰', ['七殺']], ['田宅', '酉', []], ['財帛', '寅', ['武曲', '天相']]]) {
    const reading = getPalaceReading(chart, name);
    assert.equal(reading.palace, name); assert.equal(reading.branch, branch);
    assert.deepEqual(plain(reading.stars.map(star => star.name)), stars);
    assert.ok(reading.lead && reading.stars.every(star => star.theme && star.behaviour && reading.question.endsWith('？')));
  }
});

test('13 real clock periods × 5 topics retain exact engine evidence without mutating a chart', () => {
  for (const time of ['00:30', '01:30', '03:30', '05:30', '07:30', '09:30', '11:30', '13:30', '15:30', '17:30', '19:30', '21:30', '23:30']) {
    const chart = calculateZiwei({ ...input, time }, engine), before = JSON.stringify(chart);
    for (const name of ['官祿', '夫妻', '田宅', '財帛', '命宮']) {
      const reading = getPalaceReading(chart, name), palace = chart.palaces.find(p => p.name === name);
      assert.equal(reading.branch, palace.earthlyBranch);
      assert.deepEqual(plain(reading.stars.map(star => star.name)), plain(palace.majorStars.filter(star => star.type === 'major').map(star => star.name)));
    }
    assert.equal(JSON.stringify(chart), before);
  }
});

// External star-layout references, independent of the bundled chart engine:
// https://ziweihome.com/zh-hant/blog/zi-wei-zai-si and /zi-wei-zai-wu
const road = { ...input, year:'1995', month:'08', day:'15', time:'09:30', gender:'male' };
test('roadmap example: two opposite pairs are traced by branch, not by array order', () => {
  const chart = calculateZiwei(road, engine), shuffled = { ...chart, palaces:[...chart.palaces].reverse() };
  for (const [house,branch,source,opBranch,names] of [
    ['官祿','未','夫妻','丑',['武曲','貪狼']], ['田宅','午','子女','子',['天同','太陰']]
  ]) {
    const r = getPalaceReading(shuffled, house);
    assert.deepEqual(plain(r.stars), []);
    assert.equal(r.branch,branch); assert.equal(r.opposite.palace, source); assert.equal(r.opposite.branch,opBranch);
    assert.deepEqual(plain(r.opposite.stars.map(s=>s.name)), names);
    assert.ok(r.opposite.stars.every(s=>s.behaviour.length>12));
  }
  const direct=getPalaceReading(calculateZiwei(input,engine),'官祿');
  assert.equal(direct.opposite,null); assert.deepEqual(plain(direct.stars.map(s=>s.name)),['廉貞','天府']);
});
test('do not borrow from the wrong palace or unreadable or ambiguous opposite', () => {
  const chart=calculateZiwei(road, engine), donor=chart.palaces.find(p=>p.name==='夫妻');
  for(const bad of [ {...donor,name:'子女'}, {...donor,earthlyBranch:'酉'}, {...donor,majorStars:[]}, {...donor,majorStars:[{name:'天馬',type:'tianma'}]}, {...donor,majorStars:[{name:'假星',type:'major'}]} ]) {
    assert.equal(getPalaceReading({...chart,palaces:chart.palaces.map(p=>p===donor?bad:p)},'官祿'),null);
  }
  assert.equal(getPalaceReading({...chart,palaces:[...chart.palaces,donor]},'官祿'),null);
});
test('two stars remain separate cultural prompts, not a made-up combined fortune', () => {
  const reading = getPalaceReading(calculateZiwei({ ...input, time: '11:30' }, engine), '命宮');
  assert.deepEqual(plain(reading.stars.map(star => star.name)), ['紫微', '天府']);
  assert.notEqual(reading.stars[0].theme, reading.stars[1].theme);
  assert.notEqual(reading.stars[0].behaviour, reading.stars[1].behaviour);
});

test('changing date or time changes evidence and reflection prompts instead of retaining old text', () => {
  const reading = patch => getPalaceReading(calculateZiwei({ ...input, ...patch }, engine), '命宮');
  assert.deepEqual(plain(reading({}).stars.map(star => star.name)), ['紫微']);
  assert.deepEqual(plain(reading({ day: '17' }).stars.map(star => star.name)), ['天機']);
  assert.notDeepEqual(reading({}), reading({ day: '17' }));
  assert.notDeepEqual(reading({}), reading({ time: '23:30' }));
});

test('each of 14 stars has distinct everyday readings for all five topic contexts', () => {
  const chart = calculateZiwei(input, engine);
  for (const name of ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍']) {
    const lines=new Set();
    for(const topic of ['命宮','官祿','夫妻','田宅','財帛']){
      const fixture = { ...chart, palaces: chart.palaces.map(p => p.name === topic ? { ...p, majorStars: [{ name, type: 'major' }] } : p) };
      const r = getPalaceReading(fixture, topic);
      assert.equal(r.stars[0].name,name); assert.ok(r.stars[0].theme && r.question.endsWith('？')); assert.equal(r.opposite,null);
      assert.ok(r.stars[0].behaviour.length>=20); lines.add(r.stars[0].behaviour);
      assert.doesNotMatch(r.stars[0].behaviour+r.question,/心理學|心理学|診斷|人格障礙|專業評估|你一定|你注定|內部|流程|模型|測試|推算出你/);
    }
    assert.equal(lines.size,5);
  }
});

test('missing chart, unsupported topic and malformed evidence fail closed', () => {
  const chart = calculateZiwei(input, engine);
  for (const value of [null, {}, { status: 'needs-input', palaces: chart.palaces }, { status: 'ready', palaces: [] }]) assert.equal(getPalaceReading(value, '命宮'), null);
  for (const topic of ['health', '未知宮', '__proto__', 'constructor', undefined]) assert.equal(getPalaceReading(chart, topic), null);
  for (const patch of [{ earthlyBranch: '' }, { earthlyBranch: '<img>' }, { majorStars: null }, { majorStars: [null] }, { majorStars: [{ name: '<script>', type: 'major' }] }, { majorStars: [{ name: '紫微', type: 'major' }, { name: '紫微', type: 'major' }] }]) {
    const malformed = { ...chart, palaces: chart.palaces.map(p => p.name === '命宮' ? { ...p, ...patch } : p) };
    assert.equal(getPalaceReading(malformed, '命宮'), null);
  }
});

test('reading stays local, uses safe text and disclosures, and makes no prediction or confidence score', () => {
  const source = ['./ziwei.js','./scroll/chart.mjs'].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie|confidence|probability/);
  assert.match(source, /note\.replaceChildren\(\)/);
  assert.match(source, /node\.textContent = value/);
  assert.doesNotMatch(source,/心理學|心理学|心理師|心理師傅|診斷|先唔替呢個宮寫|本版未做|反思題為本頁提問/);
  assert.match(source,/借對宮/);
  assert.match(source, /<details class="ziwei-chart-details"><summary>打開十二宮命盤/);
  assert.match(source, /aria-live="polite" aria-atomic="true"/);
  assert.doesNotMatch(source, /https?:\/\/|紫微研習社|解盤步驟/);
});
