import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { attachSceneSequence } from './motion.mjs';

// Event model only: these fixtures never decode media, request URLs or change a real document.hidden.
class TrackedTarget extends EventTarget {
  handlers = new Map();
  addEventListener(name, fn, options) {
    if (!this.handlers.has(name)) this.handlers.set(name, new Set());
    this.handlers.get(name).add(fn);
    super.addEventListener(name, fn, options);
  }
  removeEventListener(name, fn, options) {
    this.handlers.get(name)?.delete(fn);
    super.removeEventListener(name, fn, options);
  }
  count() { return [...this.handlers.values()].reduce((n, values) => n + values.size, 0); }
  fire(name) { this.dispatchEvent(new Event(name)); }
  capture(name) { return [...(this.handlers.get(name) || [])]; }
}
class FakeVideo extends TrackedTarget {
  tagName = 'VIDEO';
  attributes = new Map();
  currentSrc = '';
  currentTime = 0;
  duration = NaN;
  paused = true;
  ended = false;
  error = null;
  readyState = 0;
  playCalls = 0;
  loadCalls = 0;
  pauseCalls = 0;
  nextPlay = null;
  constructor(document) { super(); this.ownerDocument = document; }
  get src() { return this.attributes.get('src') || ''; }
  set src(value) { this.attributes.set('src', new URL(value, this.ownerDocument.baseURI).href); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  load() {
    ++this.loadCalls;
    this.currentSrc = this.src;
    this.currentTime = 0;
    this.duration = NaN;
    this.paused = true;
    this.ended = false;
    this.error = null;
    this.readyState = this.src ? 1 : 0;
  }
  play() {
    ++this.playCalls;
    this.currentSrc = this.src;
    this.duration = 4;
    this.readyState = 4;
    this.paused = false;
    return this.nextPlay || Promise.resolve();
  }
  pause() { ++this.pauseCalls; this.paused = true; }
}
function fixture(matches = false, hold = false) {
  const reduced = new TrackedTarget(); reduced.matches = matches;
  const document = new TrackedTarget(); document.hidden = false;
  document.baseURI = 'https://fixture.invalid/journey/index.html';
  document.defaultView = { matchMedia(query) { assert.equal(query, '(prefers-reduced-motion: reduce)'); return reduced; } };
  const video = new FakeVideo(document), poster = { tagName: 'IMG', ownerDocument: document, src: '' };
  const states = [], completions = [];
  const frameHold = hold ? { hidden: true, width: 0, height: 0, draws: 0,
    getContext() { return {drawImage:()=>{frameHold.draws++;}}; } } : null;
  video.videoWidth=1080; video.videoHeight=1920;
  let callback;
  video.requestVideoFrameCallback = fn => { callback=fn; return 1; };
  video.cancelVideoFrameCallback = () => { callback=null; };
  video.presentFrame = () => { const fn=callback;callback=null;fn?.(); };
  const player = attachSceneSequence(video, poster, {
    frameHold, onState: value => states.push(value), onComplete: value => completions.push(value)
  });
  return { video, poster, reduced, document, states, completions, player, frameHold };
}
const clip = (id, loop = false) => ({ id, src: `${id}.mp4`, poster: `${id}.png`, loop });
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fireOld(handlers, type) { for (const fn of handlers) fn(new Event(type)); }
function finish(video) {
  video.currentTime = video.duration;
  video.paused = true;
  video.ended = true;
  video.fire('pause'); video.fire('ended');
}

test('fixture: setScene is silent and lazy; a poster-only scene cannot imply completion', async () => {
  const { video, poster, states, completions, player } = fixture();
  player.setScene({ id: 'date', poster: 'room.png' });
  assert.equal(video.autoplay, false);
  assert.equal(video.muted, true);
  assert.equal(video.playsInline, true);
  assert.equal(video.preload, 'none');
  assert.equal(video.src, '');
  assert.equal(poster.src, 'https://fixture.invalid/journey/room.png');
  assert.equal(await player.play(), false);
  assert.equal(video.playCalls, 0);
  assert.deepEqual(states.at(-1), { id: 'date', state: 'paused' });
  assert.deepEqual(completions, []);
  player.destroy();
});

test('fixture: play and pause preserve one resource; completion is a once-only notification', async () => {
  const { video, states, completions, player } = fixture();
  player.setScene(clip('entrance'));
  assert.equal(await player.play(), true);
  const loads = video.loadCalls;
  video.currentTime = 1.5; player.pause();
  assert.equal(video.hidden, false);
  assert.equal(await player.play(), true);
  assert.equal(video.loadCalls, loads);
  assert.equal(video.currentTime, 1.5);
  finish(video); video.fire('ended');
  assert.deepEqual(states.at(-1), { id: 'entrance', state: 'ended' });
  assert.deepEqual(completions, [{ id: 'entrance', reason: 'ended' }]);
  assert.equal(video.hidden, false);
  assert.equal(await player.play(), false);
  assert.equal(player.skip(), false);
  player.destroy();
});

test('fixture: quiet idle loops never emit an ended completion', async () => {
  const { video, completions, player } = fixture();
  player.setScene(clip('arrival', true)); await player.play();
  video.currentTime = 4; video.ended = true; video.fire('ended');
  assert.equal(video.loop, true);
  assert.deepEqual(completions, []);
  assert.equal(player.skip(), true);
  assert.deepEqual(completions, [{ id: 'arrival', reason: 'skipped' }]);
  assert.equal(video.src, '');
  player.destroy();
});

test('fixture: switching invalidates old promises and captured ended/error callbacks', async () => {
  const { video, states, completions, player } = fixture();
  const old = deferred();
  player.setScene(clip('arrival')); video.nextPlay = old.promise;
  const result = player.play(), ended = video.capture('ended'), error = video.capture('error');
  player.setScene(clip('entrance')); video.nextPlay = null; await player.play();
  const pauses = video.pauseCalls, count = states.length;
  old.resolve(); assert.equal(await result, false);
  fireOld(ended, 'ended'); fireOld(error, 'error');
  assert.equal(video.pauseCalls, pauses);
  assert.equal(states.length, count);
  assert.deepEqual(states.at(-1), { id: 'entrance', state: 'playing' });
  assert.deepEqual(completions, []);
  assert.equal(video.count(), 6);
  player.destroy();
});

test('fixture: the same URL in a new scene still gets a new ownership generation', async () => {
  const { video, states, completions, player } = fixture();
  const pending = deferred(), a = clip('first');
  player.setScene(a); video.nextPlay = pending.promise;
  const result = player.play(), oldError = video.capture('error');
  player.setScene({ ...a, id: 'second' }); video.nextPlay = null; await player.play();
  pending.reject(new Error('old request only'));
  assert.equal(await result, false);
  fireOld(oldError, 'error');
  assert.deepEqual(states.at(-1), { id: 'second', state: 'playing' });
  assert.deepEqual(completions, []);
  player.destroy();
});

test('fixture: resource identity rejects old generic events before a new source is selected', async () => {
  const { video, states, completions, player } = fixture();
  player.setScene(clip('first')); await player.play();
  const previous = video.currentSrc;
  player.setScene(clip('second')); await player.play();
  video.currentSrc = previous; video.error = { code: 3 }; video.ended = true;
  const count = states.length;
  video.fire('error'); video.fire('ended');
  assert.equal(states.length, count);
  assert.equal(video.paused, false);
  assert.deepEqual(completions, []);
  player.destroy();
});

test('fixture: pause during a pending play cannot later reveal playing UI', async () => {
  const { video, states, player } = fixture(), pending = deferred();
  player.setScene(clip('entrance')); video.nextPlay = pending.promise;
  const result = player.play(); player.pause(); pending.resolve();
  assert.equal(await result, false);
  assert.equal(states.at(-1).state, 'paused');
  assert.equal(video.paused, true);
  assert.equal(video.hidden, true);
  player.destroy();
});

test('fixture: initial reduced motion never assigns a video source or plays', async () => {
  const { video, reduced, states, player } = fixture(true);
  player.setScene(clip('arrival', true));
  assert.equal(await player.play(), false);
  assert.equal(video.src, ''); assert.equal(video.playCalls, 0);
  assert.equal(states.at(-1).state, 'reduced');
  reduced.matches = false; reduced.fire('change');
  assert.equal(video.src, ''); assert.equal(video.playCalls, 0);
  assert.equal(await player.play(), true);
  player.destroy();
});

test('fixture: dynamic reduced motion unloads, ignores stale handlers and does not auto-resume', async () => {
  const { video, reduced, states, completions, player } = fixture();
  player.setScene(clip('arrival', true)); await player.play();
  const oldEnded = video.capture('ended'), oldError = video.capture('error');
  reduced.matches = true; reduced.fire('change');
  assert.equal(video.src, ''); assert.equal(video.count(), 0);
  player.pause();
  assert.equal(states.at(-1).state, 'reduced');
  reduced.matches = false; reduced.fire('change');
  fireOld(oldEnded, 'ended'); fireOld(oldError, 'error');
  assert.equal(video.playCalls, 1);
  assert.equal(video.hidden, true);
  assert.deepEqual(completions, []);
  assert.equal(await player.play(), true);
  player.destroy();
});

test('fixture: reduced preference discovered after play awaits must also unload the decoder source', async () => {
  const { video, reduced, states, player } = fixture(), pending = deferred();
  player.setScene(clip('entrance')); video.nextPlay = pending.promise;
  const result = player.play(); reduced.matches = true; pending.resolve();
  assert.equal(await result, false);
  assert.equal(states.at(-1).state, 'reduced');
  assert.equal(video.src, '');
  assert.equal(video.count(), 0);
  player.destroy();
});

test('fixture-only document.hidden pauses; visible again never auto-plays', async () => {
  const { video, document, states, player } = fixture();
  player.setScene(clip('arrival', true)); await player.play();
  document.hidden = true; document.fire('visibilitychange');
  assert.equal(video.paused, true);
  assert.equal(states.at(-1).state, 'paused');
  assert.equal(await player.play(), false);
  document.hidden = false; document.fire('visibilitychange');
  assert.equal(video.playCalls, 1);
  assert.equal(await player.play(), true);
  player.destroy();
});

test('fixture: skip cancels a pending play and notifies exactly once without routing', async () => {
  const { video, states, completions, player } = fixture(), pending = deferred();
  player.setScene(clip('reveal')); video.nextPlay = pending.promise;
  const result = player.play();
  assert.equal(player.skip(), true); assert.equal(player.skip(), false);
  pending.resolve(); assert.equal(await result, false);
  assert.equal(video.src, ''); assert.equal(video.count(), 0);
  assert.equal(states.at(-1).state, 'skipped');
  assert.deepEqual(completions, [{ id: 'reveal', reason: 'skipped' }]);
  player.destroy();
});

test('fixture: explicit replay starts a new round and ignores old ended/error events', async () => {
  const { video, states, completions, player } = fixture();
  player.setScene(clip('response')); await player.play();
  const oldEnded = video.capture('ended'), oldError = video.capture('error');
  finish(video);
  assert.equal(await player.replay(), true);
  assert.equal(video.currentTime, 0);
  fireOld(oldEnded, 'ended'); fireOld(oldError, 'error');
  video.fire('ended');
  assert.equal(states.at(-1).state, 'playing');
  assert.equal(completions.length, 1);
  finish(video); assert.equal(completions.length, 2);
  player.destroy();
});

test('fixture: terminal pause before ended flag holds the tail; near-end manual pause does not complete', async () => {
  const { video, states, completions, player } = fixture();
  player.setScene(clip('entrance')); await player.play();
  video.currentTime = 3.9999; video.paused = true; video.fire('pause');
  assert.equal(states.at(-1).state, 'blocked'); assert.equal(video.hidden,true); assert.equal(completions.length, 0);
  await player.play(); video.currentTime = 4; video.paused = true; video.fire('pause');
  assert.equal(states.at(-1).state, 'ended'); assert.equal(video.hidden, false);
  assert.equal(completions.length, 1);
  video.fire('playing');
  assert.equal(states.at(-1).state, 'ended');
  player.destroy();
});

test('fixture: a queued pause event cannot stop a currently playing clip', async () => {
  const { video, states, player } = fixture();
  player.setScene(clip('entrance')); await player.play();
  video.fire('pause');
  assert.equal(video.paused, false); assert.equal(states.at(-1).state, 'playing');
  player.destroy();
});

test('fixture: a media error needs the current native error; explicit retry reloads only once', async () => {
  const { video, states, completions, player } = fixture();
  player.setScene(clip('response')); await player.play();
  video.fire('error'); assert.equal(states.at(-1).state, 'playing');
  video.error = { code: 3 }; video.fire('error');
  assert.equal(states.at(-1).state, 'error'); assert.equal(video.hidden, true);
  assert.equal(completions.length, 0);
  const calls = video.playCalls;
  assert.equal(await player.play(), true);
  assert.equal(video.playCalls, calls + 1); assert.equal(video.error, null);
  player.destroy();
});

test('fixture: a source-selection error with empty currentSrc still has a static fallback', async () => {
  const { video, states, player } = fixture();
  player.setScene(clip('missing')); await player.play();
  video.currentSrc = ''; video.error = { code: 4 }; video.fire('error');
  assert.equal(states.at(-1).state, 'error'); assert.equal(video.paused, true);
  player.destroy();
});

for (const name of ['NotAllowedError', 'NotSupportedError']) {
  test(`fixture: ${name} is handled and permits an explicit retry or skip`, async () => {
    const { video, states, completions, player } = fixture();
    player.setScene(clip('entrance'));
    const pending = deferred(); video.nextPlay = pending.promise;
    const result = player.play(); pending.reject(Object.assign(new Error('fixture'), { name }));
    assert.equal(await result, false);
    assert.equal(states.at(-1).state, name === 'NotAllowedError' ? 'blocked' : 'error');
    assert.equal(video.hidden, true); assert.equal(completions.length, 0);
    video.nextPlay = null; assert.equal(await player.play(), true);
    player.skip(); assert.equal(completions.at(-1).reason, 'skipped');
    player.destroy();
  });
}

test('fixture: buffering holds the decoded frame and can return to playing without completion', async () => {
  const { video, states, completions, player } = fixture();
  player.setScene(clip('reveal')); await player.play();
  video.fire('waiting'); assert.equal(states.at(-1).state, 'loading'); assert.equal(video.hidden, false);
  video.fire('playing'); assert.equal(video.hidden, false);
  assert.equal(completions.length, 0);
  player.destroy();
});

test('fixture: destroy removes all handlers and makes late promises and commands inert', async () => {
  const { video, document, reduced, states, completions, player } = fixture(), pending = deferred();
  player.setScene(clip('arrival')); video.nextPlay = pending.promise;
  const result = player.play(), oldError = video.capture('error');
  player.destroy(); player.destroy();
  const count = states.length;
  pending.resolve(); assert.equal(await result, false); fireOld(oldError, 'error');
  assert.equal(states.length, count); assert.equal(completions.length, 0);
  assert.equal(video.count() + document.count() + reduced.count(), 0);
  assert.equal(video.src, ''); assert.equal(video.paused, true);
  assert.equal(player.setScene(clip('later')), false);
  assert.equal(await player.play(), false); assert.equal(await player.replay(), false);
  assert.equal(player.skip(), false);
});

test('fixture: remount destroys the old sequence but an old promise cannot pause the new owner', async () => {
  const { video, poster, document, reduced, player: old } = fixture(), pending = deferred();
  old.setScene(clip('first')); video.nextPlay = pending.promise;
  const result = old.play(), states = [];
  const next = attachSceneSequence(video, poster, { onState: value => states.push(value), onComplete() {} });
  next.setScene(clip('second')); video.nextPlay = null; await next.play();
  const pauses = video.pauseCalls;
  pending.resolve(); assert.equal(await result, false);
  assert.equal(video.pauseCalls, pauses); assert.equal(states.at(-1).id, 'second');
  assert.equal(document.count(), 1); assert.equal(reduced.count(), 1); assert.equal(video.count(), 6);
  next.destroy();
});

test('fixture: callbacks may close or replace the scene without old follow-up actions', async () => {
  const { video, poster, player: old } = fixture(); old.destroy();
  const completions = [];
  let player = attachSceneSequence(video, poster, {
    onState(value) { if (value.state === 'loading') player.destroy(); }, onComplete: value => completions.push(value)
  });
  player.setScene(clip('entrance')); assert.equal(await player.play(), false);
  assert.equal(video.playCalls, 0);
  player = attachSceneSequence(video, poster, {
    onState(value) { if (value.state === 'ended') player.setScene({ id: 'date', poster: 'room.png' }); },
    onComplete: value => completions.push(value)
  });
  player.setScene(clip('response')); await player.play(); finish(video);
  assert.deepEqual(completions, []);
  assert.equal(video.src, '');
  player.destroy();
});

test('fixture: invalid descriptors fail before disturbing the active clip', async () => {
  const { video, states, player } = fixture();
  player.setScene(clip('arrival')); await player.play();
  const src = video.src, calls = video.loadCalls;
  for (const invalid of [
    { ...clip('bad'), id: '' }, { ...clip('bad'), loop: 'false' },
    { ...clip('bad'), src: 'https://other.invalid/a.mp4' },
    { ...clip('bad'), src: 'javascript:alert(1)' },
    { ...clip('bad'), poster: 'data:image/svg+xml,<svg/>' },
    { ...clip('bad'), src: 'data:text/html;base64,AA==' },
    { ...clip('bad'), src: 'https://name:secret@fixture.invalid/a.mp4' }
  ]) assert.throws(() => player.setScene(invalid), TypeError);
  assert.equal(video.src, src); assert.equal(video.loadCalls, calls);
  assert.equal(states.at(-1).state, 'playing');
  player.destroy();
});

test('fixture: relative and typed inline media work without any URL request by the fixture', async () => {
  const { video, poster, player } = fixture();
  player.setScene({ id: 'inline', src: 'data:video/mp4;base64,AA==', poster: 'data:image/png;base64,AA==' });
  assert.equal(await player.play(), true); assert.equal(video.src, 'data:video/mp4;base64,AA==');
  assert.equal(poster.src, 'data:image/png;base64,AA==');
  player.destroy();
});

test('source boundary: no form, chart, router, storage, polling or separate UI implementation', () => {
  const source = readFileSync(new URL('./motion.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /calculateZiwei|\.submit\s*\(|\.click\s*\(|innerHTML|setInterval|localStorage|sessionStorage|indexedDB|fetch\s*\(|XMLHttpRequest|sendBeacon|history\.|location\s*[.=]/);
  assert.doesNotMatch(source, /createElement|appendChild/);
  assert.equal((source.match(/setTimeout\(/g)||[]).length,1); // Single stalled-load escape; no navigation timer.
});

test('fixture: an already captured preference callback cannot unload a remounted owner', async () => {
  const { video, poster, reduced, player: old } = fixture();
  old.setScene(clip('first')); await old.play();
  const lateChange = reduced.capture('change');
  old.destroy();
  const next = attachSceneSequence(video, poster, { onState() {}, onComplete() {} });
  next.setScene(clip('second')); await next.play();
  const src = video.src, loads = video.loadCalls;
  reduced.matches = true;
  fireOld(lateChange, 'change');
  assert.equal(video.src, src); assert.equal(video.loadCalls, loads);
  next.destroy();
});

test('fixture: reduced toggles preserve an ended or skipped stop-point without a second completion', async () => {
  for (const reason of ['ended', 'skipped']) {
    const { video, reduced, states, completions, player } = fixture();
    player.setScene(clip('response')); await player.play();
    if (reason === 'ended') finish(video); else player.skip();
    reduced.matches = true; reduced.fire('change');
    reduced.matches = false; reduced.fire('change');
    assert.equal(states.at(-1).state, reason);
    assert.equal(video.src, ''); assert.equal(video.hidden, true);
    assert.equal(video.playCalls, 1); assert.equal(completions.length, 1);
    assert.equal(await player.play(), false);
    assert.equal(await player.replay(), true);
    player.destroy();
  }
});


test('TRANS062: identical playing idle across dialogue phases preserves resource, time and play call', async () => {
  const {video,states,player}=fixture();
  const idle={src:'idle.mp4',poster:'room.png',loop:true};
  player.setScene({id:'welcome',...idle}); await player.play();
  video.currentTime=1.25; const loads=video.loadCalls, plays=video.playCalls;
  player.setScene({id:'interaction',...idle}); await player.play();
  assert.equal(video.loadCalls,loads); assert.equal(video.playCalls,plays);
  assert.equal(video.currentTime,1.25); assert.equal(video.hidden,false);
  assert.deepEqual(states.at(-1),{id:'interaction',state:'playing'});
  player.destroy();
});

test('TRANS062: buffer before first play stays on poster; skip and changed scene clear held frame', async () => {
  const {video,states,player}=fixture(); const pending=deferred();
  player.setScene(clip('entrance')); video.nextPlay=pending.promise;
  const first=player.play(); video.fire('waiting'); assert.equal(video.hidden,true);
  pending.resolve(); await first; video.currentTime=1.5; video.fire('waiting');
  assert.equal(video.hidden,false); assert.equal(states.at(-1).state,'loading');
  player.skip(); assert.equal(video.hidden,true); assert.equal(video.src,'');
  player.setScene(clip('response')); assert.equal(video.hidden,true);
  video.nextPlay=null; await player.play(); player.destroy(); assert.equal(video.hidden,true);
});

test('TRANS062: idle preservation never applies to errors, explicit replay, different posters or single shots', async () => {
  const {video,player}=fixture(); const idle={id:'welcome',src:'idle.mp4',poster:'room.png',loop:true};
  player.setScene(idle); await player.play(); let loads=video.loadCalls;
  await player.replay(); assert.ok(video.loadCalls>loads); loads=video.loadCalls;
  player.setScene({...idle,id:'interaction',poster:'new-room.png'}); await player.play(); assert.ok(video.loadCalls>loads);
  video.error={code:3}; loads=video.loadCalls;
  player.setScene({...idle,id:'quiet',poster:'new-room.png'}); await player.play(); assert.ok(video.loadCalls>loads);
  player.destroy();
});

test('the deliberate entrance stop fires once; looking resumes the same resource without a seek', async () => {
  const {video,player,states,completions} = fixture();
  player.setScene({...clip('entry'),holdAt:1.15});
  await player.play(); const loads=video.loadCalls;
  video.currentTime=1.1;video.fire('timeupdate');
  assert.equal(states.at(-1).state,'playing');
  video.currentTime=1.2;video.fire('timeupdate');video.fire('pause');
  assert.equal(states.at(-1).state,'held');assert.equal(video.paused,true);
  assert.deepEqual(completions,[]);
  await player.play();assert.equal(video.loadCalls,loads);assert.equal(video.currentTime,1.2);
  video.currentTime=2.2;video.fire('timeupdate');assert.equal(states.at(-1).state,'playing');
  video.pause();video.fire('pause');assert.equal(states.at(-1).state,'paused');
  await player.play();finish(video);assert.deepEqual(completions,[{id:'entry',reason:'ended'}]);
  player.destroy();
});

test('stalled entry unlocks the destination poster; late play cannot re-lock controls',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const {player,video,states,completions}=fixture(), slow=deferred();video.nextPlay=slow.promise;
  player.setScene(clip('door'));const playing=player.play();
  t.mock.timers.tick(11999);assert.equal(states.at(-1).state,'loading');
  t.mock.timers.tick(1);assert.equal(states.at(-1).state,'error');assert.equal(video.src,'');
  slow.resolve();assert.equal(await playing,false);assert.deepEqual(completions,[]);player.destroy();
});


test('seam: baseline unload exposes poster; opt-in hold survives until presented frame, not playing promise', async()=>{
  const f=fixture(false,true),{player,video,frameHold,states}=f;
  player.setScene(clip('entry'));await player.play();finish(video);
  player.setScene({...clip('desk',true),preserveFrame:true});
  assert.equal(frameHold.hidden,false);assert.equal(frameHold.draws,1);
  assert.equal(video.hidden,true);assert.equal(video.src,'');
  await player.play();
  assert.equal(frameHold.hidden,false);assert.equal(states.at(-1).state,'loading');
  video.presentFrame();assert.equal(frameHold.hidden,true);assert.equal(states.at(-1).state,'playing');
  player.destroy();assert.equal(frameHold.width,0);
});
test('seam: repeated play, pause/resume and stale frame callbacks cannot drop a newer cover',async()=>{
  const {player,video,frameHold}=fixture(false,true);
  player.setScene(clip('entry'));await player.play();
  player.setScene({...clip('desk',true),preserveFrame:true});await player.play();await player.play();
  assert.equal(frameHold.hidden,false);player.pause();video.presentFrame();assert.equal(frameHold.hidden,false);
  await player.play();video.presentFrame();assert.equal(frameHold.hidden,true);
  player.setScene({...clip('next'),preserveFrame:true});await player.play();
  player.setScene(clip('home',true));video.presentFrame();assert.equal(frameHold.hidden,true);
  player.destroy();
});
test('seam: reduced motion, rejected play and media errors release cover to the correct poster',async()=>{
  for(const mode of ['reduced','blocked','error']){
    const {player,video,frameHold,reduced}=fixture(false,true);
    player.setScene(clip('entry'));await player.play();
    player.setScene({...clip('desk',true),preserveFrame:true});
    if(mode==='reduced'){reduced.matches=true;reduced.fire('change');}
    else if(mode==='blocked'){video.nextPlay=Promise.reject({name:'NotAllowedError'});await player.play();}
    else {await player.play();video.error={code:3};video.fire('error');}
    assert.equal(frameHold.hidden,true,mode);assert.equal(video.hidden,true,mode);player.destroy();
  }
});
test('seam: blocked first frame still uses existing 12 second loading timeout',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const {player,video,frameHold,states}=fixture(false,true);
  player.setScene(clip('entry'));await player.play();
  player.setScene({...clip('desk',true),preserveFrame:true});await player.play();
  t.mock.timers.tick(12000);
  assert.equal(states.at(-1).state,'error');assert.equal(frameHold.hidden,true);assert.equal(video.src,'');player.destroy();
});

test('seam: hidden document cancels pending reveal and resumes only on a fresh presentation',async()=>{
 const {player,video,frameHold,document}=fixture(false,true);
 player.setScene(clip('entry'));await player.play();
 player.setScene({...clip('desk',true),preserveFrame:true});await player.play();
 document.hidden=true;document.fire('visibilitychange');video.presentFrame();
 assert.equal(video.paused,true);assert.equal(frameHold.hidden,false);
 document.hidden=false;await player.play();video.presentFrame();assert.equal(frameHold.hidden,true);player.destroy();
});
test('seam: unavailable capture falls back safely, and canvas never uses a data/blob URL',async()=>{
 const {player,video,frameHold}=fixture(false,true);
 player.setScene(clip('entry'));await player.play();
 frameHold.getContext=()=>{throw Error('no context');};
 player.setScene({...clip('desk',true),preserveFrame:true});await player.play();
 assert.equal(frameHold.hidden,true);assert.equal(video.hidden,false);player.destroy();
 const src=readFileSync(new URL('./motion.mjs',import.meta.url),'utf8');assert.doesNotMatch(src,/toDataURL|createObjectURL/);
});
test('seam: no video-frame API keeps cover for two paint turns',async()=>{
 const {player,video,frameHold,document}=fixture(false,true);let pending,id=0;
 video.requestVideoFrameCallback=undefined;
 document.defaultView.requestAnimationFrame=fn=>{pending=fn;return ++id;};
 document.defaultView.cancelAnimationFrame=()=>{pending=null;};
 player.setScene(clip('entry'));await player.play();
 player.setScene({...clip('desk',true),preserveFrame:true});await player.play();
 pending();assert.equal(frameHold.hidden,false);pending();assert.equal(frameHold.hidden,true);player.destroy();
});
