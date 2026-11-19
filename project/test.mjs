import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { STORIES, WELCOME, GOALS, DETAIL_STEPS, emptyDetails, getDetailsError, getBirthDateError, getStory, getChoice } from './content.js';

test('only three explicit topics; unknown or inherited keys are rejected', () => {
  assert.deepEqual(Object.keys(STORIES), ['work', 'love', 'self']);
  for (const id of ['missing', '__proto__', 'constructor', undefined, null]) assert.equal(getStory(id), null);
  assert.equal(getChoice('work', '__proto__'), null);
  assert.equal(getChoice('missing', 'talk'), null);
});

for (const [id, story] of Object.entries(STORIES)) {
  test(`${id}: introduction and choices have complete text`, () => {
    assert.equal(story.intro.length, 2);
    assert.equal(story.choices.length, 2);
    assert.equal(new Set(story.choices.map(choice => choice.id)).size, 2);
    for (const beat of story.intro) assert.ok(beat.text.length > 12 && beat.speaker);
    assert.ok(story.title && story.topic && story.question);
  });
  for (const choice of story.choices) {
    test(`${id}/${choice.id}: complete, distinct ending, reflection and action`, () => {
      assert.equal(getChoice(id, choice.id), choice);
      for (const key of ['label', 'outcome', 'line', 'reflection', 'action']) assert.ok(choice[key].length > 5, key);
      assert.notEqual(choice.outcome, story.choices.find(other => other !== choice).outcome);
      assert.notEqual(choice.action, story.choices.find(other => other !== choice).action);
    });
  }
}

test('client resources stay local, with no browser storage, telemetry or payment code', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
  for (const [, path] of html.matchAll(/(?:src|href)="(assets\/[^"#]+|styles\.css[^"#]*|app\.js[^"#]*)"/g)) assert.ok(existsSync(new URL(path, import.meta.url)), path);
  for (const [, id] of app.matchAll(/getElementById\('([^']+)'\)/g)) assert.ok((html + app).includes(`id="${id}"`) || readFileSync(new URL('./ziwei.js', import.meta.url), 'utf8').includes(`id="${id}"`) || DETAIL_STEPS.some(step => step.fields.some(field => `profile-${field.key}` === id)), id);
  assert.doesNotMatch(html + app + css, /https?:\/\/|\bfetch\s*\(|localStorage|sessionStorage|XMLHttpRequest|sendBeacon|WebSocket|indexedDB|document\.cookie|console\.|history\.|location\s*[.=]|Stripe|checkout/i);
  assert.match(app, /addEventListener\('submit', async event => \{\s*event\.preventDefault\(\)/);
  assert.match(html, /connect-src 'self'; form-action 'none'/);
  assert.doesNotMatch(app, /birth[^;\n]*innerHTML/);
  assert.doesNotMatch(html + JSON.stringify(STORIES), /[—–]/);
});

test('motion can be paused and reduced-motion is supported', () => {
  const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
  const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /\.motion-paused/);
  assert.match(app, /'aria-pressed'/);
  assert.match(css, /\.motion-paused \*[^}]*animation:none!important/);
  assert.doesNotMatch(css, /animation:[^;}]*infinite|animation-play-state:paused/);
});

test('welcome has explicit speakers; only three non-personal goals', () => {
  assert.deepEqual(WELCOME.map(beat => beat.speaker), ['玄', '九爺', '玄']);
  assert.ok(WELCOME.every(beat => beat.text.length > 8));
  assert.deepEqual(Object.keys(GOALS), ['clarity', 'understand', 'action']);
});

const today = new Date(2026, 10, 16);
const checkDate = (year, month, day) => getBirthDateError({ year, month, day }, today);
test('birth date accepts real leap dates, today, and ancient dates without an age rule', () => {
  for (const [y, m, d] of [['2000','2','29'], ['2024','2','29'], ['2026','11','16'], ['0001','01','01'], ['1900','2','28']]) assert.equal(checkDate(y, m, d), null);
});
test('birth date rejects non-leap centuries and impossible month lengths', () => {
  for (const [y, m, d] of [['1900','2','29'], ['2025','2','29'], ['2026','4','31'], ['2026','6','31'], ['2026','2','30']]) assert.equal(checkDate(y, m, d).field, 'day');
});
test('birth date rejects missing, non-digit, zero and out-of-range fields', () => {
  for (const [y, m, d] of [['','2','2'], ['2000','','2'], ['2000','2',''], ['1e3','2','2'], [' 2000','2','2'], ['2000','2','-1'], ['0','1','1'], ['10000','1','1'], ['2000','0','1'], ['2000','13','1'], ['2000','1','0'], ['2000','1','32'], ['<img>','1','1']]) assert.ok(checkDate(y, m, d));
});
test('birth date rejects tomorrow and future years', () => {
  for (const [y, m, d] of [['2026','11','17'], ['2026','12','1'], ['2027','1','1']]) assert.ok(checkDate(y, m, d));
});
test('date validation covers every month and year/century transitions', () => {
  for (const year of [1899, 1900, 1999, 2000, 2001, 2024, 2026]) {
    for (let month = 1; month <= 12; month++) {
      const last = new Date(year, month, 0).getDate();
      const farFuture = new Date(9999, 11, 31);
      assert.equal(getBirthDateError({ year: String(year), month: String(month), day: String(last) }, farFuture), null);
      assert.ok(getBirthDateError({ year: String(year), month: String(month), day: String(last + 1) }, farFuture));
    }
  }
});
test('required birth form is labelled, stays out of the URL and clears unsaved data on close', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /唔使生日|唔需要出生資料/);
  for (const field of ['year', 'month', 'day']) assert.ok(app.includes(`for="birth-${field}"`));
  for (const action of ['direct', 'welcome-next', 'edit-visit', 'back-question', 'back-goal', 'start-story']) assert.ok((html + app).includes(`data-action="${action}"`) || app.includes(`'${action}'`));
  assert.match(app, /form id="birth-form" autocomplete="off" novalidate/);
  assert.match(app, /'close', \(\) => \{ if \(!dialog\.open\)/);
  assert.match(app, /content\.replaceChildren\(\)/);
  assert.match(app, /function closeVisit\(\) \{\s*resetVisit\(\);\s*dialog\.close\(\)/);
});

test('versioned source and portable delivery have the same CSS, JS and embedded assets', () => {
  const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
  const { version } = JSON.parse(read('package.json'));
  const html = read('index.html');
  const portable = read('玄與九爺-網頁初稿.html');
  const app = read('app.js');
  assert.ok(html.includes(`prototype-version" content="${version}"`));
  assert.ok(portable.includes(`prototype-version" content="${version}"`));
  assert.ok(html.includes(`styles.css?v=${version}`) && html.includes(`app.js?v=${version}`));
  assert.ok(app.includes(`content.js?v=${version}`));
  const embedMedia = source => source.replace(/assets\/[\w.-]+\.(mp4|webp|jpg)/g, (name, type) => `data:${type === 'mp4' ? 'video/mp4' : `image/${type === 'jpg' ? 'jpeg' : type}`};base64,${readFileSync(new URL(name, import.meta.url)).toString('base64')}`);
  assert.ok(portable.includes(`<style>${embedMedia(read('styles.css'))}</style>`));
  assert.ok(portable.includes(read('content.js').replace(/^export /gm, '')));
  assert.ok(portable.includes(read('customer.js').replace(/^export /gm, '')));
  assert.ok(portable.includes(read('motion/motion.mjs').replace(/^export /gm, '')));
  assert.ok(portable.includes(`<style>${read('motion/motion.css')}</style>`));
  assert.ok(portable.includes(read('ziwei.js').replace(/^import .*;\n/gm, '').replace(/^export /gm, '')));
  assert.ok(portable.includes(read('vendor/iztro-v2.6.5.min.js')));
  const inlineApp = embedMedia(app.replace(/^import .*;\n/gm, ''));
  assert.ok(portable.includes(inlineApp));
  assert.doesNotMatch(portable, /(?:src|href)="(?:assets\/|styles\.css|app\.js)/);
  const images = [...portable.matchAll(/<img[^>]+src="data:image\/webp;base64,([^"]+)"/g)];
  assert.equal(images.length, 1);
  for (const [, data] of images) assert.ok(Buffer.from(data, 'base64').subarray(0, 4).equals(Buffer.from('RIFF')));
});

test('dialog scroll locking follows native open state, not asynchronous close events', () => {
  const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
  const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  assert.ok(css.includes('body:has(dialog[open]){overflow:hidden}'));
  assert.doesNotMatch(app, /document\.body\.style\.overflow/);
});


test('date fields preserve complete input and reject overlong digit strings', () => {
  const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  const valid = { year: '0001', month: '01', day: '01' };
  for (const field of ['year', 'month', 'day']) {
    const input = app.match(new RegExp(`<input id="birth-${field}"[^>]*>`))[0];
    assert.doesNotMatch(input, /maxlength=/, field);
    for (const value of (field === 'year' ? ['10000', '00001'] : ['001', '100'])) {
      assert.equal(getBirthDateError({ ...valid, [field]: value }, today)?.field, field);
    }
  }
  assert.equal(getBirthDateError(valid, today), null);
});

test('all story entrances require valid birth and a matching saved record', () => {
  const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  const source = app.slice(app.indexOf('function openStory('), app.indexOf("content.addEventListener('input'"));
  const calls = [];
  const context = { getStory, getBirthDateError, birth: { year: '', month: '', day: '' }, canStartStory: () => false, ensureDialog() {}, showBirth: () => calls.push('birth'), showReview: () => calls.push('review'), showPicker: () => calls.push('picker'), showIntro: () => calls.push('intro') };
  runInNewContext(source + '; openStory(null); openStory("work");', context);
  assert.deepEqual(calls, ['birth', 'birth']);
  context.birth = { year: '0001', month: '01', day: '01' };
  runInNewContext('openStory("love");', context);
  assert.equal(calls.at(-1), 'review');
  context.canStartStory = () => true;
  runInNewContext('openStory("self");', context);
  assert.equal(calls.at(-1), 'intro');
  assert.equal(context.currentStory, 'self');
  assert.doesNotMatch(app, /skip-birth/);
  assert.doesNotMatch(readFileSync(new URL('./index.html', import.meta.url), 'utf8') + app, /生日可以跳過|唔填資料|唔使登記/);
});

test('optional answer states remain explicit, separate and bounded', () => {
  const answers = emptyDetails();
  assert.equal(getDetailsError(answers), null);
  answers.time_precision = 'unknown';
  assert.equal(getDetailsError(answers), null);
  answers.birth_time = '12:00';
  assert.equal(getDetailsError(answers).field, 'birth_time');
  answers.time_precision = 'exact';
  assert.equal(getDetailsError(answers), null);
  answers.birth_time = '25:61';
  assert.equal(getDetailsError(answers).field, 'birth_time');
  answers.birth_time = '23:59'; answers.relationship = 'private';
  answers.birth_city = '甲城'; answers.residence_city = '乙城';
  assert.equal(getDetailsError(answers), null);
  assert.notEqual(answers.birth_city, answers.residence_city);
  answers.question = '字'.repeat(501);
  assert.equal(getDetailsError(answers).field, 'question');
});

test('review uses safe text nodes and saving requires explicit server confirmation', () => {
  const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  assert.match(app, /answer\.textContent = value/);
  assert.doesNotMatch(app, /\$\{details\[/);
  assert.match(app, /save-consent.*checked/);
  assert.match(app, /result\.profile\.data.*JSON\.stringify\(data\)/);
  assert.match(app, /profileRow = null; sessionState = null; resetVisit/);
  assert.match(app, /accountBusy/);
});

test('account transport uses same-origin CSRF and never pretends network errors succeeded', async () => {
  const priorFetch = globalThis.fetch, priorLocation = globalThis.location;
  const calls = [];
  globalThis.location = { protocol: 'http:' };
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return { ok: true, json: async () => path.endsWith('session') ? { csrf: 'synthetic-csrf-fixture' } : { profile: null } };
  };
  try {
    const { api } = await import('./customer.js?transport-test');
    await api('session');
    await api('profile', { consent: true });
    assert.equal(calls[1].path, '/api/profile');
    assert.equal(calls[1].options.credentials, 'same-origin');
    assert.equal(calls[1].options.headers['X-CSRFToken'], 'synthetic-csrf-fixture');
    assert.equal(calls[1].options.cache, 'no-store');
    globalThis.fetch = async () => { throw new Error('fixture offline'); };
    await assert.rejects(api('profile', {}), /未確認保存/);
  } finally {
    globalThis.fetch = priorFetch; globalThis.location = priorLocation;
  }
});

function controllerContext(apiStub = async () => { throw new Error('fixture unavailable'); }, mode = 'local-test', reducedMotion = true) {
  const events = {}, fields = {};
  const classes = () => {
    const values = new Set();
    return { add(name) { values.add(name); }, remove(name) { values.delete(name); }, contains: name => values.has(name), toggle(name, force = !values.has(name)) { if (force) values.add(name); else values.delete(name); return force; } };
  };
  const content = { innerHTML: '', focus() {}, replaceChildren() { this.innerHTML = ''; }, addEventListener(name, fn) { events[name] = fn; } };
  const dialog = { open: true, focus() {}, dataset: {}, classList: classes(), addEventListener() {}, showModal() { this.open = true; }, close() { this.open = false; } };
  const control = () => ({ focus() {}, addEventListener(name, fn) { this[name] = fn; }, setAttribute(name, value) { this[name] = value; }, hidden: true });
  const video = { ...control(), dataset: {}, src: null, error: null, ended: false, loads: 0, getAttribute(name) { return name === 'src' ? this.src : null; }, removeAttribute() { this.src = null; }, load() { ++this.loads; } };
  const slot = () => ({ append(node) { node.parentNode = this; } });
  Object.assign(fields, { 'story-dialog': dialog, 'story-content': content, 'account-control': control(), 'scene-video': video, 'desk-question': control(), 'scene-poster': {}, 'home-scene': slot(), 'dialog-scene': slot(), 'scene-motion': { hidden: false, dataset: {} }, 'scene-status': { textContent: '' }, 'save-consent': { checked: true }, 'save-error': { textContent: '' } });
  const document = { body: { classList: classes() }, documentElement: { dataset: { mode } }, getElementById: id => fields[id], querySelectorAll: () => [], addEventListener(name, fn, capture) { if (!capture) {const last = events[name]; events[name] = last ? event => {last(event); fn(event);} : fn;} }, contains: () => true };
  const preferences = { matches: reducedMotion, addEventListener() {} }, players = [];
  const attachSceneSequence = (video, poster, callbacks) => {
    const player = { plays: 0, pauses: 0, replays: 0, destroys: 0, scenes: [],
      setScene(scene) { this.scene = scene; this.scenes.push(scene); video.src = null; callbacks.onState({ id: scene.id, state: preferences.matches ? 'reduced' : 'paused' }); },
      play() { ++this.plays; video.src = this.scene.src || null; callbacks.onState({ id: this.scene.id, state: 'playing' }); return Promise.resolve(true); },
      replay() { ++this.replays; return this.play(); }, pause() { ++this.pauses; callbacks.onState({ id: this.scene.id, state: preferences.matches ? 'reduced' : 'paused' }); },
      skip() { video.src = null; callbacks.onState({id:this.scene.id,state:'skipped'}); callbacks.onComplete({id:this.scene.id,reason:'skipped'}); },
      finish() { callbacks.onState({id:this.scene.id,state:'ended'}); callbacks.onComplete({id:this.scene.id,reason:'ended'}); },
      destroy() { ++this.destroys; video.src = null; }, callbacks };
    players.push(player); return player;
  };
  const context = { document, window: { addEventListener() {} }, matchMedia: () => preferences, api: apiStub, STORIES, WELCOME, GOALS, DETAIL_STEPS, emptyDetails, getDetailsError, getBirthDateError, getStory, getChoice, attachZiwei: (_dialog, _content, paint) => start => paint(start ? 'date fixture' : 'entrance choices fixture', start ? 'ziwei-date' : 'entrance'), attachSceneSequence, preferences, players, events, content, fields };
  runInNewContext(readFileSync(new URL('./app.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, ''), context);
  runInNewContext("birth = {year:'0001',month:'01',day:'01'}; topic='work'; goal='clarity'; sessionState={authenticated:true,username:'fixture'};", context);
  return context;
}

test('the accepted looping arrival uses the shared player; entry replaces it only on click', () => {
  const c=controllerContext(undefined,'public-preview',false);
  assert.equal(c.players.length,1);assert.equal(c.players[0].plays,1);
  assert.equal(c.players[0].scene.src,'assets/arrival-loop-1080.mp4');
  assert.equal(c.players[0].scene.poster,'assets/arrival-loop-1080.webp');
  assert.equal(c.players[0].scene.loop,true);
  runInNewContext('showArrival();',c);assert.equal(c.players[0].plays,1);
  runInNewContext("paint('door','entrance'); paint('door update','entrance');",c);
  assert.equal(c.players[0].scenes.length,2);assert.equal(c.players[0].plays,2);
  assert.equal(c.fields['scene-video'].src,'assets/office-entry-chair-v12.mp4');
  assert.equal(c.fields['scene-motion'].parentNode,c.fields['dialog-scene']);
});
test('arrival end and failure never advance the visit; the original native entry is always available', () => {
  const c=controllerContext(undefined,'public-preview',false),before=c.content.innerHTML;
  c.players[0].finish();assert.equal(c.content.innerHTML,before);
  assert.equal(c.fields['scene-motion'].dataset.complete,'ended');
  runInNewContext("showSceneState({id:'arrival',state:'blocked'});",c);
  assert.match(c.fields['scene-status'].textContent,/可以繼續/);
  const html=readFileSync(new URL('index.html',import.meta.url),'utf8');
  assert.match(html,/<button class="button primary entry-plaque" data-action="enter" type="button"><span>立即進入了解你的人生<\/span><\/button>/);
  assert.doesNotMatch(html,/data-action="enter"[^>]*(?:disabled|hidden)/);
});
test('date/options/review stay still without restarting media during input', () => {
  const c=controllerContext(undefined,'public-preview',false);
  runInNewContext("paint('date','ziwei-date'); paint('time','ziwei-options'); paint('review','ziwei-review');",c);
  assert.equal(c.players[0].scenes.length,2);assert.equal(c.players[0].scene.id,'quiet');assert.equal(c.players[0].scene.src,undefined);
  assert.equal(c.fields['scene-video'].src,null);
});
test('close stops and unloads, moves the stage home and restarts only the home loop', () => {
  const c=controllerContext(undefined,'public-preview',false);
  runInNewContext("paint('response','response'); closeVisit();",c);
  assert.equal(c.players[0].destroys,1);assert.equal(c.players[1].plays,1);assert.equal(c.fields['scene-video'].src,'assets/arrival-loop-1080.mp4');
  assert.equal(c.fields['scene-motion'].parentNode,c.fields['home-scene']);
});
test('direct and legacy forms do not load decorative media', () => {
  const c=controllerContext(undefined,'public-preview',false);
  runInNewContext("directVisit=true; paint('date','ziwei-date'); paint('legacy','questions');",c);
  assert.equal(c.fields['scene-video'].src,null);assert.equal(c.players[0].plays,1);
});
test('Start interrupts the home loop immediately; returning loads the home only once',()=>{
  const c=controllerContext(undefined,'public-preview',false);c.fields['story-dialog'].open=false;
  runInNewContext('openOffice()',c);assert.equal(c.fields['story-dialog'].dataset.phase,'entrance');assert.equal(c.content.inert,true);
  assert.notEqual(c.players.at(-1).scene.loop,true);runInNewContext('closeVisit()',c);
  assert.equal(c.players.at(-1).plays,1);assert.equal(c.fields['scene-video'].src,'assets/arrival-loop-1080.mp4');
});
test('reduced motion keeps the source absent; clearing the preference alone cannot play', () => {
  const c=controllerContext(undefined,'public-preview',true);
  runInNewContext("paint('door','entrance');",c);
  assert.equal(c.fields['scene-video'].src,null);
  c.preferences.matches=false;assert.equal(c.players[0].plays,0);
});
test('completion never advances, submits, selects or calculates', () => {
  const c=controllerContext(undefined,'public-preview',false);
  runInNewContext("paint('explicit choice','entrance');",c);c.players[0].finish();
  assert.equal(c.content.innerHTML,'<div class="flow-copy">explicit choice</div>');
  assert.equal(c.fields['story-dialog'].dataset.phase,'entrance');assert.equal(c.fields['scene-video'].dataset.state,'ended');
});
test('the full A4 plays to its own end, with no midfilm hold or second click', () => {
  const c=controllerContext(undefined,'public-preview',false),run=js=>runInNewContext(js,c);
  run("paint('desk choices','entrance');");const clip=c.players[0].scene;
  assert.equal(clip.src,'assets/office-entry-chair-v12.mp4');assert.equal(clip.holdAt,undefined);
  assert.equal(c.content.inert,true);
  c.players[0].finish();assert.equal(c.content.inert,false);assert.equal(c.fields['desk-question'].textContent,'坐低先，慢慢講。');
  assert.equal(c.fields['scene-poster'].src,'assets/office-desk-chair-v12.jpg');assert.equal(c.fields['story-dialog'].dataset.phase,'entrance');
  run("paint('topics','interaction');");assert.equal(c.players[0].scene.poster,clip.still);assert.equal(c.fields['scene-video'].src,null);
});
test('returning from a background pause resumes the current entrance at the same position',()=>{
  const c=controllerContext(undefined,'public-preview',false);
  runInNewContext("paint('door','entrance');",c);
  const player=c.players[0],v=c.fields['scene-video'],n=player.scenes.length,plays=player.plays;
  v.currentTime=4.25;c.document.hidden=true;player.pause();c.events.visibilitychange();
  assert.equal(player.plays,plays);assert.equal(c.content.inert,true);c.document.hidden=false;c.events.visibilitychange();
  assert.equal(player.plays,plays+1);assert.equal(player.scenes.length,n);assert.equal(v.currentTime,4.25);
  player.finish();assert.equal(c.content.inert,false);
});
test('travel failure and reduction expose a stable destination and usable text path', () => {
  for (const state of ['error','blocked','reduced']) {
    const c=controllerContext(undefined,'public-preview',false);
    runInNewContext(`paint('entry choices','entrance'); showSceneState({id:'entrance',state:'${state}'});`,c);
    assert.equal(c.content.inert,false,state);assert.equal(c.fields['story-dialog'].dataset.travel,'ready',state);
    assert.equal(c.fields['scene-poster'].src,'assets/office-desk-chair-v12.jpg',state);
    assert.equal(c.content.innerHTML,'<div class="flow-copy">entry choices</div>');
  }
  const reduced=controllerContext(undefined,'public-preview',true);
  runInNewContext("paint('entry choices','entrance'); paint('hosts','interaction');",reduced);
  assert.equal(reduced.fields['scene-video'].src,null);assert.equal(reduced.content.inert,false);
  assert.equal(reduced.players[0].scene.poster,'assets/office-desk-chair-v12.jpg');
});
test('a reduced-motion visit is not stranded when the device preference changes',()=>{
  const c=controllerContext(undefined,'public-preview',true);runInNewContext("paint('static','entrance');",c);
  c.preferences.matches=false;runInNewContext("showSceneState({id:'entrance',state:'paused'});",c);
  assert.equal(c.content.inert,false);assert.equal(c.players[0].plays,0);
});
test('failed optional scenes keep their next control and do not answer for the user',()=>{
  const c=controllerContext(undefined,'public-preview',false);
  runInNewContext("paint('continue manually','response');showSceneState({id:'response',state:'error'});",c);
  assert.match(c.fields['scene-status'].textContent,/可以繼續/);
  assert.equal(c.content.innerHTML,'<div class="flow-copy">continue manually</div>');assert.equal(c.content.inert,false);
});
test('media packaging binds the three runtime videos exactly and has no default autoplay attribute', () => {
  const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');
  const html = read('index.html'), portable = read('玄與九爺-網頁初稿.html');
  assert.match(html, /media-src 'self' data:/);
  assert.equal([...html.matchAll(/<video /g)].length, 1);
  assert.match(html.match(/<video[^>]+>/)[0], /muted playsinline[^>]* preload="none"/);
  assert.doesNotMatch(html.match(/<video[^>]+>/)[0], /\sautoplay|\sloop/);
  assert.match(read('motion/motion.css'), /object-fit:contain/);
  const encoded = [...portable.matchAll(/data:video\/mp4;base64,([A-Za-z0-9+/=]+)/g)].map(m => Buffer.from(m[1], 'base64'));
  assert.equal(encoded.length, 3);
  assert.ok(encoded.some(data => data.equals(readFileSync(new URL('assets/arrival-loop-1080.mp4', import.meta.url)))));
  for (const name of ['office-entry-chair-v12','journey-reveal']) assert.ok(encoded.some(data => data.equals(readFileSync(new URL(`assets/${name}.mp4`, import.meta.url)))));
  assert.doesNotMatch(portable, /(?:src|href)="motion\//);
});

test('saved-profile controller still completes all six original story routes', async () => {
  const context = controllerContext();
  runInNewContext('profileRow={data:formData(),revision:1};', context);
  for (const [storyId, story] of Object.entries(STORIES)) for (const choice of story.choices) {
    const click = dataset => context.events.click({ target: { closest: () => ({ dataset }) } });
    await click({ action: 'story', story: storyId });
    assert.ok(context.content.innerHTML.includes(story.intro[0].text));
    await click({ action: 'next' }); await click({ action: 'next' });
    await click({ action: 'choose', choice: choice.id });
    assert.ok(context.content.innerHTML.includes(choice.outcome));
    await click({ action: 'reflect' });
    assert.ok(context.content.innerHTML.includes(choice.reflection));
    assert.ok(context.content.innerHTML.includes(choice.action));
  }
});

test('public preview gates all six stories on valid, reviewed in-memory answers without an account', async () => {
  let requests = 0;
  const context = controllerContext(async () => { requests++; throw new Error('public preview must not use API'); }, 'public-preview');
  assert.equal(requests, 0);
  assert.equal(context.fields['account-control'].textContent, '使用說明');
  assert.equal(runInNewContext('Boolean(canStartStory())', context), false);
  runInNewContext('reviewedPreview=JSON.stringify(formData()); sessionState=null; profileRow=null;', context);
  for (const [storyId, story] of Object.entries(STORIES)) for (const choice of story.choices) {
    const click = dataset => context.events.click({ target: { closest: () => ({ dataset }) } });
    await click({ action: 'story', story: storyId });
    assert.ok(context.content.innerHTML.includes(story.intro[0].text));
    await click({ action: 'next' }); await click({ action: 'next' });
    await click({ action: 'choose', choice: choice.id }); await click({ action: 'reflect' });
    assert.ok(context.content.innerHTML.includes(choice.reflection));
    assert.ok(context.content.innerHTML.includes(choice.action));
  }
  runInNewContext("details.question='changed draft';", context);
  assert.equal(runInNewContext('Boolean(canStartStory())', context), false);
  runInNewContext("reviewedPreview=JSON.stringify(formData()); birth.year='10000';", context);
  assert.equal(runInNewContext('Boolean(canStartStory())', context), false);
  runInNewContext('clearAnswers();', context);
  assert.equal(runInNewContext('reviewedPreview', context), null);
  assert.equal(runInNewContext('birth.year', context), '');
  assert.equal(requests, 0);
});

test('public preview cannot expose login, save forms or call account transport', async () => {
  let requests = 0;
  const context = controllerContext(async () => { requests++; }, 'public-preview');
  for (const fn of ['showAuth()', 'showAccount()', 'showSaved()', 'showPolicy()']) {
    runInNewContext(fn, context);
    assert.match(context.content.innerHTML, /不設登入及保存/);
    assert.doesNotMatch(context.content.innerHTML, /id="(?:auth|save|delete)-form"|資料已保存。/);
  }
  await context.events.submit({ preventDefault() {}, target: { id: 'save-form' } });
  assert.equal(requests, 0);
  const priorDocument = globalThis.document, priorFetch = globalThis.fetch;
  globalThis.document = { documentElement: { dataset: { mode: 'public-preview' } } };
  globalThis.fetch = async () => { requests++; };
  try {
    const { api } = await import('./customer.js?public-test');
    await assert.rejects(api('profile', {}), /公開預覽/);
    assert.equal(requests, 0);
  } finally { globalThis.document = priorDocument; globalThis.fetch = priorFetch; }
});

test('static public output is same-version, account-free, no-connect and allowlisted', () => {
  const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
  const html = read('public-preview/index.html'), { version } = JSON.parse(read('package.json'));
  assert.match(html, /data-mode="public-preview"/);
  assert.ok(html.includes(`prototype-version" content="${version}"`));
  assert.match(html, /connect-src 'none'; form-action 'none'/);
  assert.match(html, /只用虛構資料。資料只留本頁，關閉即清/);
  assert.doesNotMatch(html, /登入／我的資料|核對後保存|私人帳戶保存|核對並保存後|\.png/);
  for (const name of ['app.js', 'styles.css', 'content.js', 'customer.js']) assert.equal(read(`public-preview/${name}`), read(name));
});

test('save controller confirms returned data; failure preserves draft and never shows success', async () => {
  let fail = false;
  const context = controllerContext(async (path, body) => {
    if (path === 'session') throw new Error('fixture unavailable');
    if (fail) throw new Error('synthetic save failure');
    assert.equal(body.consent, true);
    assert.equal(body.policy_version, 'local-test-v1');
    return { profile: { data: body.data, revision: 1 } };
  });
  const form = { id: 'save-form', querySelector: () => ({ disabled: false }) };
  await context.events.submit({ preventDefault() {}, target: form });
  assert.ok(context.content.innerHTML.includes('資料已保存。'));
  runInNewContext("details.question='unsaved synthetic question';", context);
  fail = true;
  context.content.innerHTML = 'review fixture';
  await context.events.submit({ preventDefault() {}, target: form });
  assert.equal(context.fields['save-error'].textContent, 'synthetic save failure');
  assert.doesNotMatch(context.content.innerHTML, /資料已保存/);
  assert.equal(runInNewContext('details.question', context), 'unsaved synthetic question');
});


test('public media budget reserves capacity without allowing large code or extra files', () => {
  const build = readFileSync(new URL('build.mjs', import.meta.url), 'utf8');
  const checks = build.slice(build.indexOf('assert.ok(publicFiles.length'), build.indexOf('const actualPublicFiles'));
  assert.ok(checks.includes("name.endsWith('.mp4')"));
  const check = (publicFiles, publicSizes) => runInNewContext(checks, { assert, publicFiles, publicSizes });
  assert.doesNotThrow(() => check(['assets/clip.mp4','app.js'], [5_000_000,1_000_000]));
  assert.doesNotThrow(() => check(Array(20).fill('assets/clip.mp4'), Array(20).fill(2_500_000)));
  assert.throws(() => check(['assets/clip.mp4'], [5_000_001]));
  assert.throws(() => check(['app.js'], [1_000_001]));
  assert.throws(() => check(Array(11).fill('assets/clip.mp4'), Array(11).fill(5_000_000)));
  assert.doesNotThrow(() => check(Array(23).fill('app.js'), Array(23).fill(1)));
  assert.throws(() => check(Array(24).fill('app.js'), Array(24).fill(1)));
});

test('public home keeps separate scene files and a high-priority native poster', () => {
  const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
  const html = read('public-preview/index.html'), app = read('public-preview/app.js');
  assert.doesNotMatch(html + app, /data:video\/mp4|rel="preload"[^>]+\.mp4/);
  assert.match(html, /arrival-loop-1080.webp"[^>]+width="1080" height="1920" fetchpriority="high"/);
  assert.match(html, /<video[^>]+preload="none"[^>]+hidden/);
  assert.match(app, /arrival: \{ src: 'assets\/arrival-loop-1080.mp4', poster: 'assets\/arrival-loop-1080.webp', loop: true \}/);
  assert.doesNotMatch(html + app, /assets\/arrival-hosts\.(mp4|webp)/);
});
