import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {calculateZiwei} from './chart.mjs';
import {EXAMPLE} from './book.mjs';
import {resultFromChart, attachResult} from './result.mjs';

const box={self:{}};runInNewContext(readFileSync(new URL('../vendor/iztro-v2.6.5.min.js',import.meta.url),'utf8'),box);
const chart=time=>calculateZiwei({...EXAMPLE,time},box.self.iztro);

test('new result uses the same five natal topics and all twelve real palaces, including opposite-star evidence',()=>{
  const a=resultFromChart(chart('19:30'),'家庭'), b=resultFromChart(chart('09:30'),'財運');
  assert.equal(a.selected,'田宅');assert.equal(b.selected,'財帛');
  assert.equal(a.readings.length,12);assert.equal(new Set(a.readings.map(r=>r.palace)).size,12);
  const wealth=a.readings.find(r=>r.palace==='財帛');
  assert.equal(wealth.branch,'午');assert.equal(wealth.opposite.palace,'福德');
  assert.deepEqual(Array.from(wealth.opposite.stars,s=>s.name),['天同','太陰']);
  assert.deepEqual(Array.from(b.readings.find(r=>r.palace==='財帛').stars,s=>s.name),['天府']);
  assert.throws(()=>resultFromChart({status:'needs-input'},'財運'));
});

function fixture(){
  class Node{
    constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.style={};this.attributes={};this.handlers={};this.textContent='';}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=nodes;this.textContent='';}
    addEventListener(name,fn){this.handlers[name]=fn;}
    setAttribute(k,v){this.attributes[k]=v;}getAttribute(k){return this.attributes[k];}
    showModal(){this.open=true;}close(){this.open=false;}
    querySelectorAll(selector){return this.children.filter(c=>c.tagName===selector);}
    get innerHTML(){throw new Error('result must use text nodes');}set innerHTML(_){throw new Error('unsafe HTML write');}
  }
  const names=Array.from({length:3},()=>new Node('span')),nodes=new Map();
  const find=id=>{if(!nodes.has(id))nodes.set(id,new Node('div'));return nodes.get(id);};
  const report={querySelector:s=>find(s.slice(1)),querySelectorAll:()=>names};
  return {Node,names,find,report};
}

test('result safely renders a hostile alias, switches without replacing the chart, and clears personal DOM/state',()=>{
  const f=fixture(),old=globalThis.document;
  globalThis.document={createElement:tag=>new f.Node(tag)};
  try{
    const result=attachResult(f.report),native=chart('19:30'),before=JSON.stringify(native);
    const alias='<img src=x onerror=alert(1)>';
    result.show({chart:native,alias,subject:'財運'});
    assert.equal(f.names[0].textContent,alias);assert.ok(f.find('empathy-headline').textContent.startsWith(alias));
    const grid=f.find('result-grid').children;
    assert.equal(grid.length,13);assert.equal(grid.filter(n=>n.tagName==='button').length,12);
    assert.match(f.find('pattern-badge').textContent,/財帛宮.*午位.*天同、太陰/);
    f.find('topic-select').handlers.change({target:{value:'田宅'}});
    assert.match(f.find('empathy-headline').textContent,/家庭/);assert.equal(f.find('result-grid').children,grid);
    assert.equal(f.find('palace-detail').children[0].textContent,'玄 · 田宅宮');
    f.find('topic-select').handlers.change({target:{value:'__proto__'}});
    assert.match(f.find('empathy-headline').textContent,/家庭/);
    for(const button of grid.filter(n=>n.tagName==='button')){button.handlers.click();assert.ok(f.find('palace-detail').children.length>=4);}
    assert.equal(JSON.stringify(native),before);
    f.find('resonance').handlers.click();assert.equal(f.find('resonance').getAttribute('aria-pressed'),'false');
    f.find('topic-select').handlers.change({target:{value:'財帛'}});
    f.find('resonance').handlers.click();assert.equal(f.find('resonance').getAttribute('aria-pressed'),'true');
    result.clear();assert.equal(f.names[0].textContent,'');assert.equal(f.find('result-grid').children.length,0);
    assert.equal(f.find('empathy-headline').textContent,'');assert.equal(f.find('resonance').getAttribute('aria-pressed'),'false');
    f.find('resonance').handlers.click();assert.equal(f.find('resonance').getAttribute('aria-pressed'),'false');
    result.show({chart:chart('09:30'),alias:'第二盤',subject:'財運'});
    assert.match(f.find('pattern-badge').textContent,/亥位.*天府/);assert.doesNotMatch(f.find('empathy-headline').textContent,/onerror/);
  }finally{globalThis.document=old;}
});

test('result uses half-visible clues, an accessible teaser tail and a single cultural footer, with no payment collection',()=>{
  const html=readFileSync(new URL('./page.html',import.meta.url),'utf8'),js=readFileSync(new URL('./result.mjs',import.meta.url),'utf8');
  assert.match(html,/<option value="田宅">家庭/);
  assert.match(html,/<details id="chart-details">/);assert.match(html,/<select id="topic-select">/);
  assert.match(html,/id="chapter-previews"/);assert.match(html,/id="quarter-previews"/);
  assert.match(html,/青玉鏡・想靠近嘅相處/);
  assert.doesNotMatch(html,/氣質線索|fate-years/);
  assert.doesNotMatch(html,/唔係今次命盤推算|未提供流年|未提供大限|只留喺今次頁面/);
  assert.equal((html.match(/class="lock-blur" aria-hidden="true"/g)||[]).length,7);
  assert.equal((html.match(/玄與九爺陪你睇清選擇，唔替你決定。/g)||[]).length,1);
  assert.match(js,/tail.setAttribute\('aria-hidden','true'\)/);assert.match(js,/tail.setAttribute\('inert',''\)/);
  assert.match(html,/id="purchase-cta"/);assert.match(html,/id="purchase-dialog"/);
  assert.doesNotMatch(html,/<input[^>]+type="email"|1,284|真實讀者回饋|三萬字|未解鎖|預覽版|已解鎖|模擬解鎖|切換：|https?:\/\//);
  assert.doesNotMatch(js,/innerHTML|localStorage|sessionStorage|fetch\(|sendBeacon|XMLHttpRequest/);
  const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
  assert.match(css,/max-width:440px/);assert.match(css,/prefers-reduced-motion:no-preference/);
  assert.match(css,/filter:blur\(5\.5px\)/);assert.doesNotMatch(css,/body\.unlocked/);
});

test('original full/single prices stay synchronized, cannot grant access, and reset without overriding no-contact offers',()=>{
  const f=fixture(),old=globalThis.document;
  globalThis.document={createElement:tag=>new f.Node(tag)};
  try{
    const result=attachResult(f.report);
    result.show({chart:chart('19:30'),alias:'甲',subject:'財運',offer:true});
    const check=(original,discount,total)=>{
      assert.equal(original-discount,total);
      assert.equal(f.find('price-original').textContent,'HK$'+original);
      assert.equal(f.find('price-discount').textContent,'-HK$'+discount);
      for(const id of ['price-final','cta-price','purchase-price'])assert.equal(f.find(id).textContent,'HK$'+total);
    };
    check(388,240,148);assert.equal(f.find('sku-full').getAttribute('aria-pressed'),'true');
    f.find('sku-single').handlers.click();check(228,140,88);
    assert.equal(f.find('sku-single').getAttribute('aria-pressed'),'true');
    assert.equal(f.find('sku-full').getAttribute('aria-pressed'),'false');
    f.find('purchase-cta').handlers.click();assert.equal(f.find('purchase-dialog').open,true);
    f.find('close-purchase').handlers.click();assert.equal(f.find('purchase-dialog').open,false);
    f.find('purchase-cta').handlers.click();result.clear();
    assert.equal(f.find('purchase-dialog').open,false);assert.equal(f.find('purchase-cta').hidden,true);check(388,240,148);
    result.show({chart:chart('09:30'),alias:'乙',subject:'愛情',offer:false});
    assert.equal(f.find('purchase-cta').hidden,true);
    f.find('purchase-cta').handlers.click();assert.equal(f.find('purchase-dialog').open,false);
    f.find('sku-single').handlers.click();check(388,240,148);
    result.clear();result.show({chart:chart('09:30'),alias:'丙',subject:'家庭',offer:true});
    assert.equal(f.find('purchase-cta').hidden,false);check(388,240,148);
    assert.match(f.find('empathy-headline').textContent,/家庭/);
    assert.equal(f.find('result-grid').children.length,13);
  }finally{globalThis.document=old;}
});

const descendants = root => [root,...root.children.flatMap(descendants)];
const allText = root => descendants(root).map(n=>n.textContent).join('');
test('the entry topic stays free across selectors, twelve palaces, chapter previews and purchase buttons',()=>{
  const f=fixture(), old=globalThis.document;globalThis.document={createElement:tag=>new f.Node(tag)};
  try {
    const result=attachResult(f.report), native=chart('09:30');result.show({chart:native,alias:'一題',subject:'事業'});
    const model=resultFromChart(native,'事業'), career=model.book.chapters[0], love=model.book.chapters[1];
    assert.ok(allText(f.find('empathy-body')).includes(career.other));
    assert.ok(f.find('jiuye-quote').textContent.includes(career.line));
    assert.equal(f.find('chapter-previews').children.length,5);assert.equal(f.find('quarter-previews').children.length,12);assert.equal(f.find('action-previews').children.length,2);
    f.find('topic-select').handlers.change({target:{value:'夫妻'}});
    assert.equal(f.find('resonance').hidden,true);
    for(const id of ['empathy-body','chapter-previews','action-previews','quarter-previews']) {
      assert.ok(!allText(f.find(id)).includes(love.people),'locked prose is not in the DOM');
      assert.ok(!allText(f.find(id)).includes(love.other));
    }
    assert.ok(allText(f.find('empathy-body')).includes(love.teaser[0]));
    for(const button of f.find('result-grid').children.filter(n=>n.tagName==='button')) {
      button.handlers.click();assert.ok(!allText(f.find('palace-detail')).includes(love.people));
    }
    const tails=descendants(f.find('chapter-previews')).filter(n=>n.className==='teaser-fade');
    assert.equal(tails.length,5);for(const t of tails){assert.equal(t.getAttribute('aria-hidden'),'true');assert.equal(t.getAttribute('inert'),'');assert.ok(descendants(t).every(n=>n.tagName!=='button'));}
    const cta=descendants(f.find('chapter-previews')).find(n=>n.tagName==='button');cta.handlers.click();
    assert.equal(f.find('purchase-price').textContent,'HK$88');assert.equal(f.find('purchase-plan').textContent,'事業・單題拆局書');f.find('close-purchase').handlers.click();
    f.find('purchase-cta').handlers.click();assert.equal(f.find('purchase-plan').textContent,'事業・單題拆局書','sticky CTA keeps the chapter selected from a teaser');f.find('close-purchase').handlers.click();
    assert.equal(f.find('empathy-body').children[0].className,'teaser-card','a price selection never grants access');
    f.find('topic-select').handlers.change({target:{value:'官祿'}});
    assert.ok(allText(f.find('empathy-body')).includes(career.other));
    const shape=f.find('wealth-line').getAttribute('d');assert.match(shape,/^M12 /);assert.match(shape,/L308 /);
    assert.ok(allText(f.find('basis-detail')).includes('太陰化忌在子女宮'));
    result.clear();for(const id of ['chapter-previews','quarter-previews','action-previews'])assert.equal(f.find(id).children.length,0);
    result.show({chart:native,alias:'界線',subject:'愛情',offer:false,reply:'唔靠張盤催你再聯絡。'});
    assert.equal(f.find('jiuye-quote').textContent,'唔靠張盤催你再聯絡。');
    for(const id of ['chapter-previews','quarter-previews','action-previews'])assert.equal(descendants(f.find(id)).filter(n=>n.tagName==='button').length,0);
    assert.ok(allText(f.find('empathy-body')).includes(love.other));
  } finally {globalThis.document=old;}
});

test('the three delivery charts get distinct chart-led relationship rows and free endings',()=>{
  const f=fixture(), old=globalThis.document;
  globalThis.document={createElement:tag=>new f.Node(tag)};
  const samples=[
    ['1995-08-15','09:30','male','事業','武曲、貪狼','太陰化忌落喺子女宮','天機化祿喺父母宮','未去過嘅小店','聽你講完','一個靜位','未行過嘅街','接一接手'],
    ['2000-08-16','03:30','female','愛情','七殺','天同化忌落喺疾厄宮','太陽化祿喺子女宮','直講今日想見面','返嚟講埋下半句','講一次自己想點','行埋去陪一陣','唔使一晚追晒答案'],
    ['1988-03-12','19:30','female','財運','武曲、天相','天機化忌落喺父母宮','貪狼化祿喺財帛宮','輪流話事','有變就早講','唔使喺心入面估幾輪','喺夜市','唔只係今晚想鬆一口氣'],
  ];
  try {
    const result=attachResult(f.report);
    const rows=()=>Array.from({length:5},(_,i)=>f.find('fate-'+i).textContent);
    const rendered=samples.map(([date,time,gender,subject,spouse,ji,lu,...phrases])=>{
      const [year,month,day]=date.split('-');
      const native=calculateZiwei({...EXAMPLE,year,month,day,time,gender},box.self.iztro,{asOf:'2026-11-21'});
      result.show({chart:native,alias:'同一個名',subject});
      const free=f.find('empathy-body').children.map(p=>p.textContent);
      const closing=f.find('jiuye-quote').textContent, clues=rows();
      assert.equal(free.length,4);assert.ok(free[2].includes(ji));assert.ok(free[3].includes(lu));
      assert.doesNotMatch(free.join('')+closing,/呢份用心唔係缺點|如果你認得呢一幕|留一個你負擔到嘅範圍/);
      assert.ok(clues[0].startsWith(spouse));
      for(let i=0;i<4;i++)assert.ok(clues[i+1].includes(phrases[i]) && clues[i+1].endsWith('？'));
      assert.ok(closing.includes(phrases[4]));
      f.find('topic-select').handlers.change({target:{value:'田宅'}});
      assert.deepEqual(rows(),clues,'changing topic cannot swap out the chart’s relationship clues');
      result.clear();assert.deepEqual(rows(),['','','','','']);
      return {clues,ending:[...free.slice(1),closing]};
    });
    for(let i=1;i<5;i++)assert.equal(new Set(rendered.map(r=>r.clues[i])).size,3);
    for(let i=0;i<4;i++)assert.equal(new Set(rendered.map(r=>r.ending[i])).size,3);
  } finally {globalThis.document=old;}
});
