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
    constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.style={};this.attributes={};this.handlers={};this.textContent='';this.open=false;}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=nodes;this.textContent='';}
    addEventListener(name,fn){this.handlers[name]=fn;}
    setAttribute(k,v){this.attributes[k]=v;}getAttribute(k){return this.attributes[k];}
    showModal(){this.open=true;}close(){this.open=false;}
    focus(){}removeAttribute(k){delete this.attributes[k];}
    querySelectorAll(selector){return this.children.filter(c=>c.tagName===selector);}
    get innerHTML(){throw new Error('result must use text nodes');}set innerHTML(_){throw new Error('unsafe HTML write');}
  }
  const names=Array.from({length:3},()=>new Node('span')),nodes=new Map();
  const find=id=>{if(!nodes.has(id))nodes.set(id,new Node('div'));return nodes.get(id);};
  const report={querySelector:s=>['#topic-menu','#topic-select'].includes(s)?null:find(s.slice(1)),querySelectorAll:()=>names};
  return {Node,names,find,report};
}

test('result safely renders a hostile alias, inspects palaces without replacing the chart or entry topic, and clears personal DOM/state',()=>{
  const f=fixture(),old=globalThis.document;
  globalThis.document={createElement:tag=>new f.Node(tag)};
  try{
    const result=attachResult(f.report),native=chart('19:30'),before=JSON.stringify(native);
    const alias='<img src=x onerror=alert(1)>';
    result.show({chart:native,alias,subject:'財運',offer:true});
    assert.equal(f.find('share-signature').value,'');
    assert.equal(f.names[0].textContent,alias);assert.ok(f.find('empathy-headline').textContent.startsWith(alias));
    const grid=f.find('result-grid').children;
    assert.equal(grid.length,13);assert.equal(grid.filter(n=>n.tagName==='button').length,12);
    assert.match(f.find('pattern-badge').textContent,/財帛宮.*午位.*天同、太陰/);
    grid.find(n=>n.dataset.palace==='田宅').handlers.click();
    assert.equal(f.find('palace-detail').children[0].textContent,'玄 · 田宅宮');
    assert.match(f.find('empathy-headline').textContent,/財運/);
    assert.equal(f.find('result-grid').children,grid);
    for(const button of grid.filter(n=>n.tagName==='button')){button.handlers.click();assert.ok(f.find('palace-detail').children.length>=4);}
    assert.equal(JSON.stringify(native),before);
    f.find('resonance').handlers.click();assert.equal(f.find('resonance').getAttribute('aria-pressed'),'true');
    result.clear();assert.equal(f.names[0].textContent,'');assert.equal(f.find('result-grid').children.length,0);
    assert.equal(f.find('empathy-headline').textContent,'');assert.equal(f.find('resonance').getAttribute('aria-pressed'),'false');
    f.find('resonance').handlers.click();assert.equal(f.find('resonance').getAttribute('aria-pressed'),'false');
    result.show({chart:chart('09:30'),alias:'第二盤',subject:'財運',offer:true});
    assert.match(f.find('pattern-badge').textContent,/亥位.*天府/);assert.doesNotMatch(f.find('empathy-headline').textContent,/onerror/);
  }finally{globalThis.document=old;}
});

test('result keeps the brand link, half-visible clues and a single cultural footer, with no payment collection',()=>{
  const html=readFileSync(new URL('./page.html',import.meta.url),'utf8'),js=readFileSync(new URL('./result.mjs',import.meta.url),'utf8');
  assert.match(html,/<header class="result-bar"><a class="brand" href="#cover-title">[^\n]+<\/a><\/header>/);
  assert.match(html,/<details id="chart-details">/);
  assert.doesNotMatch(html+js,/topic-(?:menu|drawer|select)|睇其他話題|同一張盤，想睇邊個話題|翻開其他篇章/);
  assert.match(html,/id="chapter-previews"/);
  assert.doesNotMatch(html+js,/other-topics|topic-previews|topic-peeks|其他四個話題/);
  assert.doesNotMatch(html+js,/quarter-previews|action-previews|teaser-cta/);
  assert.match(html,/青玉鏡・想靠近嘅相處/);
  assert.doesNotMatch(html,/氣質線索|fate-years/);
  assert.doesNotMatch(html,/唔係今次命盤推算|未提供流年|未提供大限|只留喺今次頁面/);
  assert.equal((html.match(/class="lock-blur" aria-hidden="true"/g)||[]).length,6);
  assert.equal((html.match(/玄與九爺陪你睇清選擇，唔替你決定。/g)||[]).length,1);
  assert.match(html,/id="purchase-cta"/);assert.match(html,/id="purchase-dialog"/);
  assert.match(html,/<input id="waitlist-email" type="email"[^>]+disabled/);
  assert.match(html,/id="waitlist-closed">早鳥登記暫未開放/);
  assert.match(html,/<footer class="result-footer">[\s\S]*不代替醫療、法律或投資建議。/);
  assert.doesNotMatch(html+readFileSync(new URL('../ziwei.js',import.meta.url),'utf8'),/虛構資料|虛構生辰|虛構例盤|已觸發事件|分頁暫存|只留本頁/);
  assert.match(html,/<select id="share-signature"/);assert.doesNotMatch(html,/<input id="share-signature"/);
  assert.doesNotMatch(html,/<form[^>]+action=|<input[^>]+name=|1,284|真實讀者回饋|三萬字|未解鎖|預覽版|已解鎖|模擬解鎖|Demo|測試|漏斗監察|切換：|https?:\/\//);
  assert.doesNotMatch(js,/innerHTML|localStorage|sessionStorage|fetch\(|sendBeacon|XMLHttpRequest/);
  const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
  assert.match(css,/max-width:440px/);assert.match(css,/prefers-reduced-motion:no-preference/);
  assert.match(css,/filter:blur\(5\.5px\)/);assert.doesNotMatch(css,/body\.unlocked/);
});

test('the love chapter reuses the wealth divider, followed by four unbroken mirror pills and a permanent 2x2 seal grid',()=>{
  const html=readFileSync(new URL('./page.html',import.meta.url),'utf8'),css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
  const heads=[...html.matchAll(/<header class="chapter-heading">([\s\S]*?)<\/header>/g)].map(m=>m[1]);
  assert.equal(heads.length,2);
  for(const [i,title] of ['財運','愛情'].entries()){
    assert.ok(heads[i].includes('<div class="knot-divider" aria-hidden="true">◇</div>'));
    assert.ok(heads[i].includes('data-text="'+title+'">'+title+'</h2>'));
    assert.match(heads[i],/<h2 class="echo-chapter"/);
  }
  assert.match(heads[1],/講到底……<br>你最想睇清嘅，係<span class="gold-copy">邊個人先接得住你<\/span>吧？/);
  assert.match(html,/<\/header>\s*<div class="inset"><section class="fate-card"/);
  const mirror=html.split('aria-labelledby="fate-title"')[1].split('</dl>')[0];
  assert.deepEqual([...mirror.matchAll(/<dt>([^<]+)<\/dt>/g)].map(m=>m[1]),['相處角度','被點對待','在意細節','關鍵節點']);
  assert.match(css,/\.fate-card dt\s*{\s*white-space:nowrap;flex-shrink:0;padding:4px 10px;/);
  const grid=html.split('<ul class="sealed-topics"')[1].split('</ul>')[0];
  assert.deepEqual([...grid.matchAll(/class="sealed-stamp" aria-hidden="true">([^<]+)<\/span>([^<]+)<\/h3>/g)].map(m=>m.slice(1)),[['官','事業'],['財','財運'],['夫','愛情'],['命','抉擇']]);
  assert.equal((grid.match(/<svg class="sealed-lock"/g)||[]).length,4);
  assert.doesNotMatch(grid,/<details|<summary/);
  assert.match(css,/\.sealed-topics\{display:grid;grid-template-columns:repeat\(2,1fr\);gap:10px/);
  assert.match(css,/\.roll\{[^}]*padding-bottom:124px;/);
  assert.doesNotMatch(css,/topic-drawer/);
});

test('both unlock buttons show the selected published price and respect safety gating',()=>{
  const f=fixture(),old=globalThis.document;
  globalThis.document={createElement:tag=>new f.Node(tag)};
  try{
    const result=attachResult(f.report);
    result.show({chart:chart('19:30'),alias:'甲',subject:'財運',offer:true});
    const check=total=>{
      for(const id of ['sealed-cta-price','cta-price','purchase-price'])assert.equal(f.find(id).textContent,'HK$'+total);
    };
    assert.equal(f.find('sealed-unlock').hidden,false);
    check(148);assert.equal(f.find('sku-full').getAttribute('aria-pressed'),'true');
    f.find('sku-single').handlers.click();check(88);
    assert.equal(f.find('sku-single').getAttribute('aria-pressed'),'true');
    assert.equal(f.find('sku-full').getAttribute('aria-pressed'),'false');
    for(const id of ['sealed-purchase-cta','purchase-cta']){
      f.find(id).handlers.click();assert.equal(f.find('purchase-dialog').open,true);
      f.find('close-purchase').handlers.click();assert.equal(f.find('purchase-dialog').open,false);
    }
    f.find('sealed-purchase-cta').handlers.click();result.clear();
    assert.equal(f.find('purchase-dialog').open,false);assert.equal(f.find('sealed-unlock').hidden,true);check(148);
    result.show({chart:chart('09:30'),alias:'乙',subject:'愛情',offer:false});
    assert.equal(f.find('purchase-cta').hidden,true);
    assert.equal(f.find('sealed-unlock').hidden,true);
    for(const id of ['sealed-purchase-cta','purchase-cta']){
      f.find(id).handlers.click();assert.equal(f.find('purchase-dialog').open,false);
    }
    f.find('sku-single').handlers.click();check(148);
    result.clear();result.show({chart:chart('09:30'),alias:'丙',subject:'家庭',offer:true});
    assert.equal(f.find('purchase-cta').hidden,false);check(148);
    assert.match(f.find('empathy-headline').textContent,/家庭/);
    assert.equal(f.find('result-grid').children.length,13);
  }finally{globalThis.document=old;}
});

const descendants = root => [root,...root.children.flatMap(descendants)];
const allText = root => descendants(root).map(n=>n.textContent).join('');
test('the entry topic stays free across twelve palaces, chapter previews and purchase buttons',()=>{
  const f=fixture(), old=globalThis.document;globalThis.document={createElement:tag=>new f.Node(tag)};
  try {
    const result=attachResult(f.report), native=chart('09:30');result.show({chart:native,alias:'一題',subject:'事業',offer:true});
    const model=resultFromChart(native,'事業'), career=model.book.chapters[0], love=model.book.chapters[1];
    assert.deepEqual(f.find('empathy-body').children.map(n=>n.textContent),[career.lens,career.people,career.other,career.resource]);
    assert.ok(f.find('jiuye-quote').textContent.includes(career.line));
    assert.equal(f.find('share-card').hidden,false);
    assert.match(f.find('share-quote').textContent,/總係頂到最後嗰個/);
    assert.equal(f.find('share-signature').value,'');
    f.find('share-signature').value='guest';
    const chapters = f.find('chapter-previews').children;
    assert.deepEqual(chapters.map(c=>c.children[0].textContent),[
      '第一章：本命內耗與天賦','第二章：2026–2028 財運與轉折','第三章：緣分與貴人磁場','第四章：穩陣 vs 破局雙選擇'
    ]);
    assert.match(allText(chapters[1]),/化祿落本命/);
    const freeProse=allText(f.find('empathy-body'));
    for(const id of ['empathy-body','chapter-previews']) {
      assert.ok(!allText(f.find(id)).includes(love.people),'other full prose is not in the DOM');
    }
    for(const button of f.find('result-grid').children.filter(n=>n.tagName==='button')) {
      button.handlers.click();assert.ok(!allText(f.find('palace-detail')).includes(love.people));
    }
    for(const root of ['chapter-previews','empathy-body']) assert.ok(descendants(f.find(root)).every(n=>n.tagName!=='button'));
    f.find('sku-single').handlers.click();
    assert.equal(f.find('purchase-dialog').open,false,'changing plan does not open the dialog');
    f.find('sealed-purchase-cta').handlers.click();
    assert.equal(f.find('purchase-price').textContent,'HK$88');assert.equal(f.find('purchase-plan').textContent,'事業・單題拆局書');f.find('close-purchase').handlers.click();
    assert.equal(allText(f.find('empathy-body')),freeProse,'price and palace inspection never replace the free reading');
    assert.equal(f.find('share-card').hidden,false);
    assert.equal(f.find('share-signature').value,'guest');
    const shape=f.find('wealth-line').getAttribute('d');assert.match(shape,/^M12 /);assert.match(shape,/L308 /);
    assert.ok(allText(f.find('basis-detail')).includes('太陰化忌在子女宮'));
    result.clear();assert.equal(f.find('chapter-previews').children.length,0);
    result.show({chart:native,alias:'界線',subject:'愛情',offer:false,reply:'唔靠張盤催你再聯絡。'});
    assert.equal(f.find('jiuye-quote').textContent,'唔靠張盤催你再聯絡。');
    for (const id of ['book-previews','offer','sealed-unlock','purchase-wrap','share-card','resonance']) assert.equal(f.find(id).hidden,true);
    f.find('purchase-cta').handlers.click();assert.equal(f.find('purchase-dialog').open,false);
    assert.equal(f.find('chapter-previews').children.length,0);
    assert.ok(allText(f.find('empathy-body')).includes(love.other));
  } finally {globalThis.document=old;}
});

test('the three delivery charts get distinct chart-led relationship rows and free endings',()=>{
  const f=fixture(), old=globalThis.document;
  globalThis.document={createElement:tag=>new f.Node(tag)};
  const samples=[
    ['1995-08-15','09:30','male','事業','武曲、貪狼','太陰化忌落喺子女宮','天機化祿喺父母宮','一齊拆掂個局','一齊追','聽朝再對','同拍檔各畫一步','接一接手'],
    ['2000-08-16','03:30','female','愛情','七殺','天同化忌落喺疾厄宮','太陽化祿喺子女宮','直講今日想見面','到咗未','講一次自己想點','行埋去陪一陣','唔使一晚追晒答案'],
    ['1988-03-12','19:30','female','財運','武曲、天相','天機化忌落喺父母宮','貪狼化祿喺財帛宮','輪流話事','墊咗邊筆','唔使自己估幾輪','一人講成本','唔只係今晚想鬆一口氣'],
  ];
  try {
    const result=attachResult(f.report);
    const rows=()=>Array.from({length:4},(_,i)=>f.find('fate-'+i).textContent);
    const rendered=samples.map(([date,time,gender,subject,spouse,ji,lu,...phrases])=>{
      const [year,month,day]=date.split('-');
      const native=calculateZiwei({...EXAMPLE,year,month,day,time,gender},box.self.iztro,{asOf:'2026-11-21'});
      result.show({chart:native,alias:'同一個名',subject,offer:true});
      const free=f.find('empathy-body').children.map(p=>p.textContent);
      const closing=f.find('jiuye-quote').textContent, clues=rows();
      assert.equal(free.length,4);assert.ok(free[2].includes(ji));assert.ok(free[3].includes(lu));
      assert.doesNotMatch(free.join('')+closing,/呢份用心唔係缺點|如果你認得呢一幕|留一個你負擔到嘅範圍/);
      assert.ok(clues[0].startsWith(spouse));
      for(const [i,phrase] of [phrases[0],phrases[1],phrases[3]].entries())assert.ok(clues[i+1].includes(phrase) && clues[i+1].endsWith('？'));
      assert.ok(closing.includes(phrases[4]));
      const otherTopic = subject === '財運' ? '官祿' : '財帛';
      f.find('result-grid').children.find(n=>n.dataset.palace===otherTopic).handlers.click();
      assert.deepEqual(rows(),clues,'viewing another palace retains the original reading');
      assert.equal(f.find('resonance').hidden,false,'the entry topic remains active');
      result.clear();assert.deepEqual(rows(),['','','','']);
      return {clues,ending:[...free.slice(1),closing]};
    });
    for(let i=1;i<4;i++)assert.equal(new Set(rendered.map(r=>r.clues[i])).size,3);
    for(let i=0;i<4;i++)assert.equal(new Set(rendered.map(r=>r.ending[i])).size,3);
  } finally {globalThis.document=old;}
});
