import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {makeBook, EXAMPLE, ORDER} from './book.mjs';
import {calculateZiwei} from './chart.mjs';
const box={self:{}};runInNewContext(readFileSync(new URL('../vendor/iztro-v2.6.5.min.js',import.meta.url),'utf8'),box);
const engine=box.self.iztro, fixed=()=>makeBook(EXAMPLE,engine);
test('the five-topic model stays on one chart; the UI decides which entry topic is free',()=>{
  const a=fixed(), b=makeBook({...EXAMPLE,time:'09:30'},engine);
  assert.deepEqual(a.chapters.map(x=>x.key),['官祿','夫妻','田宅','財帛','命宮']);
  assert.match(a.chapters[3].source,/午位.*借福德宮・子位.*天同、太陰/);
  assert.match(b.chapters[3].source,/亥位.*本宮主星.*天府/);
  for(let i=0;i<5;i++){assert.notEqual(a.chapters[i].source,b.chapters[i].source);assert.notEqual(a.chapters[i].people,b.chapters[i].people);assert.notEqual(a.chapters[i].line,b.chapters[i].line);}
  assert.match(a.sample.first,/按太陽/);assert.match(b.sample.first,/按武曲/);assert.notEqual(a.sample.take,b.sample.take);
});
test('chapter content and donor positions agree with the unmodified engine across thirteen time periods, two dates and two sexes',()=>{
  const all=new Set();
  for(const h of [0,1,3,5,7,9,11,13,15,17,19,21,23])for(const day of ['12','17'])for(const gender of ['female','male']){
    const input={...EXAMPLE,day,gender,time:String(h).padStart(2,'0')+':30'};
    const model=makeBook(input,engine), {palaces}=calculateZiwei(input,engine), branches='子丑寅卯辰巳午未申酉戌亥';
    for(const [i,k] of ORDER.entries()){
      const c=model.chapters[i],native=palaces.find(p=>p.name===k);
      let stars=native.majorStars.filter(s=>s.type==='major');const empty=!stars.length;
      if(empty){let b=branches[(branches.indexOf(native.earthlyBranch)+6)%12];let donor=palaces.find(p=>p.earthlyBranch===b);stars=donor.majorStars.filter(s=>s.type==='major');assert.ok(c.source.includes(donor.name));assert.ok(c.source.includes(b+'位'));}
      assert.equal(c.borrow,empty);assert.deepEqual([...c.stars],Array.from(stars,s=>s.name));assert.ok(c.people.includes(c.stars[0]));
      assert.ok(c.line?.startsWith('「')&&c.line.endsWith('」'));assert.ok(c.lens.length+c.people.length+c.line.length>=75);
      assert.ok(c.other.includes(c.ji.star+'化忌'));assert.ok(c.other.includes(c.ji.palace));assert.ok(c.resource.includes(c.lu.star+'化祿'));for(const s of stars)all.add(s.name);
      assert.doesNotMatch(JSON.stringify(c),/undefined|null|NaN/);
    }
  }
  assert.equal(all.size,14);
});
test('a missing or invalid birth field never returns a personal reading; running twice does not change the model',()=>{
  for(const patch of [{time:''},{time:'23:61'},{precision:'unknown',time:''},{gender:'withheld'},{day:'32'},{year:'2099'}])assert.throws(()=>makeBook({...EXAMPLE,...patch},engine));
  assert.throws(()=>makeBook(EXAMPLE,{}));assert.deepEqual(fixed(),fixed());
});

test('book panel keeps the full seat image and groups the quote with the chapter heading',()=>{
  const html=readFileSync(new URL('./page.html',import.meta.url),'utf8');
  const png=readFileSync(new URL('../assets/book-seat.png',import.meta.url));
  const width=png.readUInt32BE(16), height=png.readUInt32BE(20);
  const panel=html.match(/<div class="book-panel">([\s\S]*?)<\/div>/)?.[1] ?? '';
  assert.ok(panel.includes(`<img src="@@BOOK_ART@@" width="${width}" height="${height}"`));
  assert.match(panel,/<header class="book-opening">\s*<p class="book-opening-quote editorial">呢份，留低嘅唔係定論，[\s\S]*?id="edition-label"[\s\S]*?id="book-title"/);
});
