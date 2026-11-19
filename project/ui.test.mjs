import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
const read = name => readFileSync(new URL(name,import.meta.url),'utf8');
const app=read('app.js'), html=read('index.html');
function soundFixture(options={}) {
  const events=[], contexts=[], nodes=[], resumes=[], flags={hidden:false}, reduced={matches:false};
  const context={updateEntryCaption(){},reduceMotion:reduced,document:flags,window:{},dialog:{open:true,dataset:{}},content:{focus(){}},scenePoster:{},sceneVideo:{dataset:{},getAttribute(){return null;}},sceneConfig:{src:'fixture.mp4'},sceneStatus:{},scenePlayer:{destroy(){events.push('destroy');}},sceneKey:null};
  class Audio {
    constructor(){this.state='suspended';this.currentTime=0;this.destination={};contexts.push(this);events.push('create');}
    resume(){events.push('resume');if(options.pending)return new Promise((resolve,reject)=>resumes.push({resolve,reject}));this.state=options.reject?'suspended':'running';return options.reject?Promise.reject(new Error('blocked')):Promise.resolve();}
    suspend(){events.push('suspend');this.state='suspended';return Promise.resolve();}
    createOscillator(){events.push('oscillator');const node={frequency:{setValueAtTime(v){node.from=v;},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(t){events.push(['start',t]);},stop(t){events.push(['stop',t]);if(t===undefined)node.stopped=true;}};nodes.push(node);return node;}
    createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(v,t){events.push(['gain',v,t]);}},connect(){},disconnect(){}};}
  }
  if(!options.missing) context.window.AudioContext=Audio;
  runInNewContext(app.slice(app.indexOf('function createSceneSound()'),app.indexOf("\ndocument.addEventListener('click', event =>",app.indexOf('function createSceneSound()')))+'\nthis.sound=createSceneSound();',context);
  context.sceneSound=context.sound;
  runInNewContext(app.slice(app.indexOf('function showSceneState('),app.indexOf('function playSceneMotion('))+app.slice(app.indexOf('function stopSceneMotion('),app.indexOf('function syncSceneMotion(')),context);
  return {sound:context.sound,events,contexts,nodes,flags,reduced,context,state:(id,state)=>context.showSceneState({id,state}),resolve(index=0){contexts[0].state='running';resumes[index].resolve();},reject(){resumes[0].reject(new Error('blocked'));}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('the film has no transport or dismiss overlay; navigation remains accessible',()=>{
  assert.doesNotMatch(html+app,/scene-toggle|scene-skip|visit-close|略過|暫停動畫|繼續播放|>×</);
  assert.doesNotMatch(html.match(/<video[^>]*>/)[0],/\scontrols(?=[\s>])/);
  assert.match(html,/跳到主要內容/);assert.match(html,/class="visit-home"[^>]*data-action="close">返回首頁/);
  assert.match(app,/addEventListener\('cancel'/);assert.match(html,/id="scene-status" class="sr-only"/);
});
test('starting motion gates replies, finishing exposes them without navigating',()=>{
  const f=soundFixture();f.context.dialog.dataset.phase='entrance';
  f.state('entrance','playing');assert.equal(f.context.content.inert,true);
  f.state('entrance','ended');assert.equal(f.context.content.inert,false);assert.equal(f.context.dialog.dataset.phase,'entrance');
});
test('optional sound constructs nothing on arrival or untrusted interaction',async()=>{
  const f=soundFixture(); f.sound.play('entrance');f.sound.unlock({isTrusted:false});await Promise.resolve();assert.deepEqual(f.events,[]);
});
test('trusted gesture permits bounded short sounds and repeated playing is not duplicated',async()=>{
  const f=soundFixture();f.sound.unlock({isTrusted:true});await Promise.resolve();f.sound.play('reveal');f.sound.play('reveal');
  assert.equal(f.events.filter(e=>e==='oscillator').length,1);
  assert.ok(f.events.filter(Array.isArray).filter(e=>e[0]==='stop').every(e=>e[1]<3));
  assert.ok(f.events.filter(Array.isArray).filter(e=>e[0]==='gain').every(e=>e[1]<=.035));
  f.sound.stop();assert.ok(f.events.some(e=>Array.isArray(e)&&e[0]==='stop'&&e[1]===undefined));
});
test('sound remains optional for missing support, rejection, hidden and reduction',async()=>{
  for(const variant of ['missing','reject','hidden','reduced']){
    const f=soundFixture({missing:variant==='missing',reject:variant==='reject'});
    if(variant==='hidden')f.flags.hidden=true;if(variant==='reduced')f.reduced.matches=true;
    assert.doesNotThrow(()=>f.sound.unlock({isTrusted:true}));await Promise.resolve();f.sound.play('entrance');
    assert.equal(f.events.filter(e=>e==='oscillator').length,0);
  }
});
test('UI060-A01: buffering stops sound immediately; actual playing may cue once again',async()=>{
  const f=soundFixture();f.sound.unlock({isTrusted:true});await flush();
  f.state('reveal','playing');assert.equal(f.nodes.length,1);
  f.state('reveal','loading');assert.equal(f.nodes[0].stopped,true);
  f.state('reveal','playing');f.state('reveal','playing');assert.equal(f.nodes.length,2);
  f.sound.stop();assert.ok(f.nodes.every(n=>n.stopped));
});
test('UI060-A02: successful slow unlock cues the still-playing scene once',async()=>{
  const f=soundFixture({pending:true});f.sound.unlock({isTrusted:true});
  f.state('entrance','playing');f.state('entrance','playing');assert.equal(f.nodes.length,0);
  f.resolve();await flush();assert.equal(f.nodes.length,1);assert.equal(f.nodes[0].from,90);
  f.state('entrance','playing');assert.equal(f.nodes.length,1);f.sound.stop();
});
test('pending sound is cancelled by every non-playing renderer state',async()=>{
  for(const state of ['loading','paused','error','blocked','ended','skipped','reduced']){
    const f=soundFixture({pending:true});f.sound.unlock({isTrusted:true});f.state('reveal','playing');
    f.state('reveal',state);f.resolve();await flush();assert.equal(f.nodes.length,0,state);
  }
});
test('pending sound cannot survive the actual close cleanup',async()=>{
  const f=soundFixture({pending:true});f.sound.unlock({isTrusted:true});f.state('entrance','playing');
  f.context.stopSceneMotion();f.resolve();await flush();
  assert.equal(f.context.scenePlayer,null);assert.equal(f.nodes.length,0);assert.ok(f.events.includes('destroy'));
});
test('old pending cue cannot speak for a replacement scene or same-kind reentry',async()=>{
  for(const next of ['quiet','response','entrance']){
    const f=soundFixture({pending:true});f.sound.unlock({isTrusted:true});f.state('entrance','playing');
    f.sound.stop();f.state(next,'paused');f.state(next,'playing');f.resolve();await flush();
    assert.equal(f.nodes.length,next==='quiet'?0:1,next);
    if(f.nodes.length)assert.equal(f.nodes[0].from,next==='response'?390:90);f.sound.stop();
  }
});
test('Hidden and reduced cancel pending cues even if the flag clears before resume',async()=>{
  for(const flag of ['hidden','reduced']){
    const f=soundFixture({pending:true});f.sound.unlock({isTrusted:true});f.state('reveal','playing');
    if(flag==='hidden')f.flags.hidden=true;if(flag==='reduced')f.reduced.matches=true;
    f.sound.stop();f.flags.hidden=false;f.reduced.matches=false;
    f.resolve();await flush();assert.equal(f.nodes.length,0,flag);
  }
});
test('slow rejected unlock stays silent and cannot enter a microtask retry loop',async()=>{
  const f=soundFixture({pending:true});f.sound.unlock({isTrusted:true});f.state('entrance','playing');
  f.reject();await flush();assert.equal(f.nodes.length,0);assert.equal(f.context.sceneVideo.dataset.state,'playing');
});
test('the same-room continuous entrance exposes a desk greeting, not a mid-film stop',()=>{
  const source=read('ziwei.js');
  assert.doesNotMatch(source,/look-altar|望吓周圍先/);assert.match(source,/id="desk-question"/);
  assert.match(app,/arrival: \{ src: 'assets\/arrival-loop-1080.mp4', poster: 'assets\/arrival-loop-1080.webp', loop: true \}/);
  assert.match(app,/entrance: \{ src: 'assets\/office-entry-chair-v12.mp4'/);assert.match(source,/你係邊位/);
  assert.match(app,/quiet: \{ poster: room \}/);
});
test('the fixed starburst reveal and unlit reduced-motion poster occupy the existing media slots',()=>{
  const expected={
    'assets/journey-reveal.mp4':'e9ab14366ae09928978218454a672a895af7cd0b84610efb260b03c8e46fef4c',
    'assets/journey-reveal.webp':'e2de09c15327a7836ce92c659c153965611c2d4d4be657537a33fdd0df51fced'
  };
  for(const [name,hash] of Object.entries(expected))assert.equal(createHash('sha256').update(readFileSync(new URL(name,import.meta.url))).digest('hex'),hash);
  assert.match(app,/reveal: \{ src: 'assets\/journey-reveal.mp4', poster: 'assets\/journey-reveal.webp' \}/);
});
test('one home entrance explains the free result and fictional data before asking for anything',()=>{
  const start=html.indexOf('<div class="entry-invite">'), button=html.indexOf('data-action="enter"');
  assert.ok(start>0 && button>start);
  assert.match(html.slice(start,button),/免費試排紫微斗數[\s\S]*用虛構資料睇十二宮，唔使登入/);
  assert.equal((html.match(/data-action="enter"/g)||[]).length,1);
});
test('the home and approved A4 video with opening and closing frames are fixed runtime assets',()=>{
  const expected={
    'assets/office-entry-chair-v12.mp4':'c34f97506f4a46b447d20efc0684c8e2e6297ba647d882ca9e3f42cc0f7b2284',
    'assets/arrival-loop-1080.mp4':'fb69f41efb5faafca114a48eb6d6f002d53205f1a05a87c10d8a51038641ba88',
    'assets/arrival-loop-1080.webp':'167c484d199e9c1c9daf78d9c2bc70fda477852c6727d544dfe27231c011ff23',
    'assets/office-door-a4.jpg':'43fea0d16f3856ee775fa5162578e5d893e26eafa6dcde5c9dde6d3412e33f98',
    'assets/office-desk-chair-v12.jpg':'b3cab463f1986e40ad0b512026b65be256703fe2adee6725f6d1b3453ee504d3'
  };
  for(const [name,hash] of Object.entries(expected))assert.equal(createHash('sha256').update(readFileSync(new URL(name,import.meta.url))).digest('hex'),hash);
  assert.match(html,/src="assets\/arrival-loop-1080.webp" alt="玄與九爺輕扇收扇，迎接你入座" width="1080" height="1920"/);
  assert.match(read('styles.css'),/\.desk-topics\{grid-template-columns:repeat\(2/);
  assert.match(read('styles.css'),/--portrait-w:min\(100%,56.25dvh,480px\)/);
});

test('all dialogue buttons share a transparent, legible native control style',()=>{
  const css=read('styles.css');
  assert.match(css,/\.journey-site \.button,\.journey-site \.option,\.journey-site \.text-link,\.journey-site \.dialog-back,\.scene-toggle/);
  assert.match(css,/prefers-reduced-transparency:reduce/);assert.match(css,/min-height:48px/);
  assert.match(css,/:focus-visible/);assert.doesNotMatch(css,/\.home-stage:before/);
});

test('glass text retains contrast even over a white scene pixel',()=>{
  const linear=x=>(x/=255)<=.04045?x/12.92:((x+.055)/1.055)**2.4;
  const luminance=c=>c.map(linear).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
  const background=[13,19,10].map(c=>c*(184/255)+255*(1-184/255));
  assert.ok((luminance([221,213,196])+.05)/(luminance(background)+.05)>=4.5);
});

test('home and interior fit the same bounded portrait without cropping or separate desktop media',()=>{
  const css=read('styles.css');assert.match(css,/--portrait-w:min\(100%,56.25dvh,480px\)/);
  assert.match(css,/\.home-stage \.scene-slot\{width:var\(--portrait-w\);height:auto;aspect-ratio:9\/16/);
  for (const where of ['home-stage','dialog-art']) assert.ok(css.includes('.journey-site .'+where+' .scene-motion>video{object-fit:contain;object-position:50% 50%}'));
  assert.match(css,/\.dialog-art \.scene-motion\{width:var\(--portrait-w\)/);
  assert.doesNotMatch(css,/journey-enter-start-v2/);assert.match(app,/sceneFigure.dataset.scene = key/);
});
test('chart-only arrow keys pan the focusable region, not its child controls or shortcuts',()=>{
  const source=read('ziwei.js');
  const block=source.slice(source.indexOf("    const scroll = grid.parentElement;"),source.indexOf('    const positions ='));
  const moves=[],region={addEventListener(name,fn){this.fn=fn},scrollBy(value){moves.push(value.left)}};
  runInNewContext(block,{grid:{parentElement:region}});
  const event=(key,extra={})=>({target:region,key,preventDefault(){this.prevented=true},...extra});
  const right=event('ArrowRight');region.fn(right);assert.equal(right.prevented,true);
  region.fn(event('ArrowLeft'));region.fn(event('ArrowDown'));region.fn(event('ArrowRight',{target:{}}));region.fn(event('ArrowRight',{ctrlKey:true}));
  assert.deepEqual(moves,[80,-80]);
});


test('approved home plaque has the complete native entry name and no direct shortcut DOM',()=>{
  assert.match(html, /<button class="button primary entry-plaque" data-action="enter" type="button"><span>立即進入了解你的人生<\/span><\/button>/);
  assert.doesNotMatch(html, /data-action="direct"|直接排盤|推門入內/);
  assert.match(app, /if \(action === 'direct'\) openOffice\(true\)/);
  assert.match(app, /if \(action === 'enter'\) openOffice\(\)/);
});

test('approved frame remains a transparent wordless asset behind solid HTML text',()=>{
  const css=read('styles.css');
  const embedded=css.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/);
  assert.ok(embedded);
  assert.equal(createHash('sha256').update(Buffer.from(embedded[1],'base64')).digest('hex'),'0f417eb2e96314b13054a7a93d90040e06d97c58059038058aa6bc4a45a97974');
  assert.match(css, /aspect-ratio:3\/1/);
  assert.match(css, /background:rgb\(11 25 23 \/ \.78\)/);
  assert.match(css, /font:clamp\(14px,5\.5cqw,24px\)\/1\.25 var\(--serif\)/);
  const linear=x=>(x/=255)<=.04045?x/12.92:((x+.055)/1.055)**2.4;
  const lum=c=>c.map(linear).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
  const bg=[11,25,23].map(c=>c*.78+255*.22);
  assert.ok((lum([247,240,221])+.05)/(lum(bg)+.05)>=4.5);
});
