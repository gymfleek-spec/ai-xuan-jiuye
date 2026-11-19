import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { calculateZiwei } from './project/ziwei.js';

const ctx = { self: {} };
runInNewContext(readFileSync(new URL('./project/vendor/iztro-v2.6.5.min.js', import.meta.url), 'utf8'), ctx);
function chart(date, time, gender) {
  const [year, month, day] = date.split('-');
  return calculateZiwei({ year, month, day, time, gender, precision: 'exact', place: '' }, ctx.self.iztro);
}
const palace = (c, name) => c.palaces.find(p => p.name === name);
const majors = p => Array.from(p.majorStars).filter(s => s.type === 'major').map(s => s.name);
const lunar = c => c.lunarDate.replace('闰','閏').replace(/[臘腊]月/,'十二月');

// Synthetic civil-clock inputs. HKO verifies calendar dates, not stars or predictions.
// https://www.hko.gov.hk/tc/gts/time/conversion1_text.htm (1995, 2000, 2023, 2024)
test('01: roadmap empty-career example keeps the native and opposite stars distinct', () => {
  const c = chart('1995-08-15', '09:30', 'male');
  assert.equal(lunar(c),'一九九五年七月二十');
  // The documented natal Yi-stem rule; this says nothing about annual transformations.
  // https://docs.iztro.com/zh_TW/learn/setup
  const transformed = c.palaces.flatMap(p => [...p.majorStars,...p.minorStars].filter(s => s.mutagen));
  assert.equal(transformed.length,4);
  assert.deepEqual(Object.fromEntries(transformed.map(s => [s.mutagen,s.name])),
    {祿:'天機',權:'天梁',科:'紫微',忌:'太陰'});
  // Regression anchors observed on v0.6.12, NOT an independent whole-chart reference.
  for (const [name,branch,stars] of [['官祿','未',[]], ['夫妻','丑',['武曲','貪狼']], ['命宮','卯',['天相']], ['財帛','亥',['天府']]]) {
    const p = palace(c,name);
    assert.equal(p.earthlyBranch,branch);
    assert.deepEqual(majors(p),stars);
  }
});
test('02: published example returns the documented soul, body and wealth stars', () => {
  // Same-library reference, not a second chart engine: https://docs.iztro.com/quick-start
  const c = chart('2000-08-16','03:30','female');
  assert.equal(lunar(c),'二〇〇〇年七月十七');
  assert.equal(c.fiveElementsClass,'木三局');
  assert.equal(palace(c,'命宮').earthlyBranch,'午');
  assert.equal(c.palaces.find(p => p.isBodyPalace).earthlyBranch,'戌');
  assert.deepEqual(majors(palace(c,'財帛')),['武曲','天相']);
});
// With fixLeap enabled, days 15 and 16 of the same leap month use different chart months.
for (const [id, day, dateText, soulBranch] of [['03','05','十五','酉'], ['04','06','十六','戌']]) {
  test(id+': leap second month, '+dateText, () => {
    const c=chart('2023-04-'+day,'12:00','male');
    assert.equal(lunar(c),'二〇二三年閏二月'+dateText);
    assert.equal(palace(c,'命宮').earthlyBranch,soulBranch);
  });
}
test('05: from 22:59 to 23:00 at lunar New Year the configured chart day advances', () => {
  const before=chart('2024-02-09','22:59','female');
  const late=chart('2024-02-09','23:00','female');
  const next=chart('2024-02-10','00:00','female');
  assert.deepEqual([before.timeIndex,late.timeIndex,next.timeIndex],[11,12,0]);
  assert.equal(lunar(before),'二〇二三年十二月三十');
  assert.equal(lunar(late),'二〇二四年正月初一');
  assert.equal(lunar(late),lunar(next));
  const layout=c=>c.palaces.map(p=>[p.name,p.earthlyBranch,majors(p),p.isBodyPalace]);
  assert.deepEqual(layout(late),layout(next));
});
