import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
const read = name => readFileSync(new URL(name,import.meta.url),'utf8');
const app=read('app.js'), html=read('index.html');
function soundFixture(options={}) {
  const events=[], contexts=[], nodes=[], resumes=[], flags={hidden:false}, reduced={matches:false};
  const context={mediaSkipped:false,reduceMotion:reduced,document:flags,window:{},sceneVideo:{dataset:{}},sceneButton:{},sceneConfig:{src:'fixture.mp4'},sceneStatus:{},scenePlayer:{destroy(){events.push('destroy');}},sceneKey:null};
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
test('one visible performance button is 略過, not pause/replay or a no-sound label',()=>{
  assert.equal((html.match(/id="scene-skip"/g)||[]).length,1);
  assert.match(html,/id="scene-skip"[^>]*>略過<\/button>/);
  assert.doesNotMatch(html,/id="scene-play"|播放動效|暫停動畫|無聲動效/);
  assert.match(html,/id="scene-status" class="sr-only"/);
});
test('Skip stops the shared player and sound and persists; it cannot fill or submit',()=>{
  const handler=app.slice(app.indexOf("sceneButton.addEventListener('click'"),app.indexOf('// Sound is optional'));
  assert.match(handler,/mediaSkipped = true/);assert.match(handler,/sceneSound.stop\(\)/);assert.match(handler,/scenePlayer\?\.skip\(\)/);
  assert.doesNotMatch(handler,/submit|calculateZiwei|openZiwei|showResult|\.click\(/);
  assert.match(app,/reduceMotion.matches \|\| mediaSkipped\) return/);
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
test('sound remains optional for missing support, rejection, hidden, reduction and Skip',async()=>{
  for(const variant of ['missing','reject','hidden','reduced','skip']){
    const f=soundFixture({missing:variant==='missing',reject:variant==='reject'});
    if(variant==='hidden')f.flags.hidden=true;if(variant==='reduced')f.reduced.matches=true;if(variant==='skip')f.context.mediaSkipped=true;
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
test('Skip, hidden and reduced cancel pending cues even if the flag clears before resume',async()=>{
  for(const flag of ['skip','hidden','reduced']){
    const f=soundFixture({pending:true});f.sound.unlock({isTrusted:true});f.state('reveal','playing');
    if(flag==='skip')f.context.mediaSkipped=true;if(flag==='hidden')f.flags.hidden=true;if(flag==='reduced')f.reduced.matches=true;
    f.sound.stop();f.context.mediaSkipped=false;f.flags.hidden=false;f.reduced.matches=false;
    f.resolve();await flush();assert.equal(f.nodes.length,0,flag);
  }
});
test('slow rejected unlock stays silent and cannot enter a microtask retry loop',async()=>{
  const f=soundFixture({pending:true});f.sound.unlock({isTrusted:true});f.state('entrance','playing');
  f.reject();await flush();assert.equal(f.nodes.length,0);assert.equal(f.context.sceneVideo.dataset.state,'playing');
});
test('the fixed entrance exposes the altar before the original characters',()=>{
  const source=read('ziwei.js');
  assert.match(source,/name === 'look-altar'\) showAltar\(\)/);assert.match(source,/先睇吓左邊/);
  assert.match(app,/arrival: \{ poster: 'assets\/journey-door.webp'/);
  assert.match(app,/altar: \{ poster: 'assets\/journey-altar.webp'/);
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
test('all dialogue buttons share a transparent, legible native control style',()=>{
  const css=read('styles.css');
  assert.match(css,/\.journey-site \.button,\.journey-site \.option,\.journey-site \.text-link,\.journey-site \.dialog-back,\.scene-skip/);
  assert.match(css,/prefers-reduced-transparency:reduce/);assert.match(css,/min-height:48px/);
  assert.match(css,/:focus-visible/);assert.doesNotMatch(css,/\.home-stage:before/);
});

test('glass text retains contrast even over a white scene pixel',()=>{
  const linear=x=>(x/=255)<=.04045?x/12.92:((x+.055)/1.055)**2.4;
  const luminance=c=>c.map(linear).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
  const background=[13,19,10].map(c=>c*(184/255)+255*(1-184/255));
  assert.ok((luminance([221,213,196])+.05)/(luminance(background)+.05)>=4.5);
});

test('the whole viewport uses cover with scene-specific wide-screen focal points',()=>{
  const css=read('styles.css');
  assert.match(css,/height:100svh/);assert.match(css,/object-fit:cover/);assert.doesNotMatch(css,/blur\(20px\)/);
  assert.match(css,/\.home-stage \.scene-slot\{width:100%;height:100%;aspect-ratio:auto/);
  assert.match(css,/--scene-focus:50% 26%/);assert.match(css,/--scene-focus:50% 29%/);
  assert.match(app,/sceneFigure\.dataset\.scene = key/);
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
