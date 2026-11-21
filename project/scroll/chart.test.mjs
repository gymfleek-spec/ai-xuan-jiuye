import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { calculateZiwei, natalMutagens, chartTiming, periodTempo, ZIWEI_RULES } from './chart.mjs';
import { bookFromChart, EXAMPLE } from './book.mjs';
import { STAR_COPY, HUA_COPY, RELATING_COPY, TOPIC_COPY } from './empathy-copy.mjs';
const box={self:{}};runInNewContext(readFileSync(new URL('../vendor/iztro-v2.6.5.min.js',import.meta.url),'utf8'),box);
const engine=box.self.iztro, asOf='2026-11-21';
const input=(date,gender='female',time='09:30')=>{const [year,month,day]=date.split('-');return {...EXAMPLE,year,month,day,gender,time};};
const cast=i=>calculateZiwei(i,engine,{asOf});
const native=i=>{engine.astro.resetConfig();return engine.astro.withOptions({type:'solar',dateStr:[i.year,i.month,i.day].join('-'),timeIndex:Number(i.time.slice(0,2))===23?12:Math.floor((Number(i.time.slice(0,2))+1)/2),gender:i.gender==='male'?'男':'女',fixLeap:true,language:'zh-TW',config:ZIWEI_RULES});};
const all=p=>[...p.majorStars,...p.minorStars,...p.adjectiveStars];
const plain=v=>JSON.parse(JSON.stringify(v));

test('all four natal transformations include auxiliary stars and keep the real house when another house borrows',()=>{
  const chart=cast(input('1991-08-15'));
  assert.deepEqual(chart.mutagens.map(r=>[r.hua,r.star]),[['祿','巨門'],['權','太陽'],['科','文曲'],['忌','文昌']]);
  assert.equal(chart.mutagens.find(r=>r.hua==='忌').palace,'福德');
  assert.equal(chart.mutagens.find(r=>r.hua==='科').palace,'遷移');
  const a=cast(input('1995-08-15','male'));
  assert.equal(a.mutagens.find(r=>r.hua==='忌').star,'太陰');assert.equal(a.mutagens.find(r=>r.hua==='忌').palace,'子女');
  const chapter=bookFromChart(a).chapters[0];assert.equal(chapter.borrow,true);assert.match(chapter.source,/借夫妻宮.*武曲、貪狼/);
  assert.match(chapter.other,/太陰化忌落喺子女宮/);assert.doesNotMatch(chapter.lens+chapter.people,/本宮無|借對宮|搬入本宮/);
  assert.throws(()=>natalMutagens(a.palaces.map(p=>({...p,majorStars:[],minorStars:[],adjectiveStars:[]}))));
});

test('2026–2028 scopes, all activations and twelve quarterly queries match native horoscope(date,0)',()=>{
  for(const i of [input('1995-08-15','male'),input('2000-08-16','female','03:30'),input('1988-03-12','female','19:30')]) {
    const c=cast(i), raw=native(i), before=JSON.stringify(raw.palaces);
    assert.deepEqual(c.timing.annual.map(p=>p.yearly.stem+p.yearly.branch),['丙午','丁未','戊申']);
    assert.equal(c.timing.quarters.length,12);assert.equal(new Set(c.timing.quarters.map(p=>p.date)).size,12);
    for(const period of [c.timing.current,...c.timing.annual,...c.timing.quarters]) {
      const h=raw.horoscope(period.date,0);
      for(const scope of ['decadal','yearly','monthly']) {
        assert.equal(period[scope].index,h[scope].index);assert.deepEqual(period[scope].palaceNames,plain(h[scope].palaceNames));
        assert.deepEqual(period[scope].activations.map(r=>r.star),plain(h[scope].mutagen));
        for(const r of period[scope].activations){assert.ok(all(raw.palaces[r.index]).some(s=>s.name===r.star));assert.equal(r.palace,raw.palaces[r.index].name);assert.equal(r.flowPalace,h[scope].palaceNames[r.index]);}
      }
    }
    assert.equal(JSON.stringify(raw.palaces),before);
    const y=c.timing.annual[0].yearly, flowCareer=y.palaceNames.indexOf('官祿');
    assert.equal(raw.horoscope('2026-07-01',0).palace('官祿','yearly').name,raw.palaces[flowCareer].name);
    assert.doesNotMatch(JSON.stringify(c.timing),/undefined|NaN/);
  }
});

test('decade changes are queried per year; lunar year boundaries are not Gregorian January 1',()=>{
  const a=cast(input('1986-08-15'));
  assert.deepEqual(a.timing.annual.map(p=>p.decadal.range),[[33,42],[33,42],[43,52]]);
  const raw=native(input('1995-08-15','male'));
  const january=chartTiming(raw,'1995-08-15','2026-01-01');assert.equal(january.current.yearly.stem+january.current.yearly.branch,'乙巳');
  assert.equal(january.annual[0].yearly.stem+january.annual[0].yearly.branch,'丙午');
  for(const bad of ['2026-02-30','2026-13-01','2026-1-1','1994-01-01','bad'])assert.throws(()=>chartTiming(raw,'1995-08-15',bad));
});

test('child periods, dates before birth and engine decade limits cannot fabricate a ten-year forecast',()=>{
  const child=cast(input('2026-10-01'));assert.equal(child.timing.current.decadal.active,false);
  assert.equal(child.timing.annual[0].status,'before-birth');assert.equal(child.timing.quarters[0].status,'before-birth');
  assert.equal(periodTempo(child.timing.annual[0],child.palaces,'財帛').score,null);
  const old=cast(input('1900-01-01'));assert.equal(old.timing.current.status,'out-of-range');assert.ok(old.timing.annual.every(p=>p.status==='out-of-range'));
  assert.equal(bookFromChart(old).chapters.length,5,'natal reading remains available');
});

test('curve index is a deterministic sum of documented native placements, not an engine score',()=>{
  const c=cast(input('1995-08-15','male'));
  assert.deepEqual(c.timing.annual.map(p=>periodTempo(p,c.palaces,'財帛').score),[2,0,0]);
  assert.deepEqual(c.timing.annual.map(p=>periodTempo(p,c.palaces,'官祿').score),[3,3,7]);
  for(const p of c.timing.quarters) {
    const result=periodTempo(p,c.palaces,'財帛',true);
    assert.equal(result.score,result.evidence.reduce((n,r)=>n+r.points,0));
    const focus=c.palaces.findIndex(p=>p.name==='財帛'), weights={祿:2,權:1,科:1,忌:-2};
    const expected=p.monthly.activations.reduce((sum,r)=>{const offset=(r.index-focus+12)%12;return sum+weights[r.hua]*(offset===0?2:[4,6,8].includes(offset)?1:0);},0);
    assert.equal(result.score-periodTempo(p,c.palaces,'財帛').score,expected);
  }
  assert.throws(()=>periodTempo(c.timing.current,c.palaces,'bad'));
});

test('four-layer copy covers all fourteen stars and five topics, with actual transformation text including auxiliary stars',()=>{
  assert.equal(Object.keys(STAR_COPY).length,14);
  for(const copy of Object.values(STAR_COPY))for(const key of Object.keys(TOPIC_COPY)) {
    const c=copy[key];for(const part of ['receive','release','question','line'])assert.equal(typeof c[part],'string');
    assert.ok(c.receive.length>25);assert.ok(c.release.length>15);assert.ok(c.question.endsWith('？'));
  }
  assert.deepEqual(Object.keys(RELATING_COPY).sort(),Object.keys(STAR_COPY).sort());
  for(const prompts of Object.values(RELATING_COPY)) {
    assert.equal(prompts.length,2);assert.ok(prompts.every(text=>text.endsWith('？')));
  }
  for(const {strain,resource,space,evening} of Object.values(HUA_COPY)) {
    assert.ok(strain.length>12 && resource.length>12 && space.length>12 && evening.length>12);
  }
});
