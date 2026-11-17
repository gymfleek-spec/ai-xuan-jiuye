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
  for (const [, id] of app.matchAll(/getElementById\('([^']+)'\)/g)) assert.ok((html + app).includes(`id="${id}"`) || DETAIL_STEPS.some(step => step.fields.some(field => `profile-${field.key}` === id)), id);
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
  for (const action of ['direct', 'skip-welcome', 'edit-visit', 'back-question', 'back-goal', 'start-story']) assert.ok((html + app).includes(`data-action="${action}"`) || app.includes(`'${action}'`));
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
  const embedMedia = source => source.replace(/assets\/[\w.-]+\.(mp4|webp)/g, (name, type) => `data:${type === 'mp4' ? 'video/mp4' : 'image/webp'};base64,${readFileSync(new URL(name, import.meta.url)).toString('base64')}`);
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
  const dialog = { open: true, dataset: {}, classList: classes(), addEventListener() {}, showModal() { this.open = true; }, close() { this.open = false; } };
  const control = () => ({ addEventListener(name, fn) { this[name] = fn; }, setAttribute(name, value) { this[name] = value; }, hidden: true });
  const video = { dataset: {}, src: null, error: null, ended: false, loads: 0, removeAttribute() { this.src = null; }, load() { ++this.loads; } };
  const slot = () => ({ append(node) { node.parentNode = this; } });
  Object.assign(fields, { 'story-dialog': dialog, 'story-content': content, 'account-control': control(), 'scene-video': video, 'scene-poster': {}, 'home-scene': slot(), 'dialog-scene': slot(), 'home-controls': slot(), 'dialog-controls': slot(), 'scene-motion': { hidden: false, dataset: {} }, 'scene-motion-controls': { hidden: false }, 'scene-skip': control(), 'scene-status': { textContent: '' }, 'save-consent': { checked: true }, 'save-error': { textContent: '' } });
  const document = { body: { classList: classes() }, documentElement: { dataset: { mode } }, getElementById: id => fields[id], querySelectorAll: () => [], addEventListener(name, fn, capture) { if (!capture) events[name] = fn; }, contains: () => true };
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
  const context = { document, window: { addEventListener() {} }, matchMedia: () => preferences, api: apiStub, STORIES, WELCOME, GOALS, DETAIL_STEPS, emptyDetails, getDetailsError, getBirthDateError, getStory, getChoice, attachZiwei: () => () => {}, attachSceneSequence, preferences, players, events, content, fields };
  runInNewContext(readFileSync(new URL('./app.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, ''), context);
  runInNewContext("birth = {year:'0001',month:'01',day:'01'}; topic='work'; goal='clarity'; sessionState={authenticated:true,username:'fixture'};", context);
  return context;
}

test('one shared stage starts still, then loads a single entrance movie on explicit entry', () => {
  const c=controllerContext(undefined,'public-preview',false);
  assert.equal(c.players.length,1);assert.equal(c.players[0].plays,0);
  runInNewContext("paint('door','entrance'); paint('door update','entrance');",c);
  assert.equal(c.players[0].scenes.length,2);assert.equal(c.players[0].plays,1);
  assert.equal(c.fields['scene-video'].src,'assets/journey-door.mp4');
  assert.equal(c.fields['scene-motion'].parentNode,c.fields['dialog-scene']);
});
test('date/options/review stay still without restarting media during input', () => {
  const c=controllerContext(undefined,'public-preview',false);
  runInNewContext("paint('date','ziwei-date'); paint('time','ziwei-options'); paint('review','ziwei-review');",c);
  assert.equal(c.players[0].scenes.length,2);assert.equal(c.players[0].scene.id,'quiet');assert.equal(c.players[0].scene.src,undefined);
  assert.equal(c.fields['scene-video'].src,null);
});
test('close stops and unloads, moves the stage home and never auto-restarts it', () => {
  const c=controllerContext(undefined,'public-preview',false);
  runInNewContext("paint('response','response'); closeVisit();",c);
  assert.equal(c.players[0].destroys,1);assert.equal(c.players[1].plays,0);assert.equal(c.fields['scene-video'].src,null);
  assert.equal(c.fields['scene-motion'].parentNode,c.fields['home-scene']);
});
test('direct and legacy forms do not load decorative media', () => {
  const c=controllerContext(undefined,'public-preview',false);
  runInNewContext("directVisit=true; paint('date','ziwei-date'); paint('legacy','questions');",c);
  assert.equal(c.fields['scene-video'].src,null);assert.equal(c.players[0].plays,0);
});
test('one Skip stops media and persists across phases and close/reentry without changing answers', () => {
  const c=controllerContext(undefined,'public-preview',false);
  runInNewContext("paint('response','response');",c);
  c.fields['scene-skip'].click();assert.equal(c.fields['scene-video'].src,null);assert.equal(c.fields['scene-skip'].hidden,true);
  runInNewContext("paint('entrance','entrance'); closeVisit(); paint('again','entrance');",c);
  assert.equal(c.fields['scene-video'].src,null);assert.equal(c.players[1].plays,0);
});
test('reduced motion keeps the source absent; clearing the preference alone cannot play', () => {
  const c=controllerContext(undefined,'public-preview',true);
  runInNewContext("paint('door','entrance');",c);
  assert.equal(c.fields['scene-video'].src,null);assert.equal(c.fields['scene-skip'].hidden,true);
  c.preferences.matches=false;assert.equal(c.players[0].plays,0);
});
test('completion never advances, submits, selects or calculates', () => {
  const c=controllerContext(undefined,'public-preview',false);
  runInNewContext("paint('explicit choice','entrance');",c);c.players[0].finish();
  assert.equal(c.content.innerHTML,'<div class="flow-copy">explicit choice</div>');
  assert.equal(c.fields['story-dialog'].dataset.phase,'entrance');assert.equal(c.fields['scene-video'].dataset.state,'ended');
});
test('failed scenes retain next controls and the same single Skip exit', () => {
  const c=controllerContext(undefined,'public-preview',false);
  runInNewContext("paint('continue or skip','response'); showSceneState({id:'response',state:'error'});",c);
  assert.match(c.fields['scene-status'].textContent,/可以繼續/);c.fields['scene-skip'].click();
  assert.equal(c.fields['scene-video'].src,null);assert.equal(c.content.innerHTML,'<div class="flow-copy">continue or skip</div>');
});

test('media packaging binds all four local videos exactly and has no default autoplay attribute', () => {
  const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');
  const html = read('index.html'), portable = read('玄與九爺-網頁初稿.html');
  assert.match(html, /media-src 'self' data:/);
  assert.equal([...html.matchAll(/<video /g)].length, 1);
  assert.match(html.match(/<video[^>]+>/)[0], /muted playsinline preload="none"/);
  assert.doesNotMatch(html.match(/<video[^>]+>/)[0], /\sautoplay|\sloop/);
  assert.match(read('motion/motion.css'), /object-fit:contain/);
  const encoded = [...portable.matchAll(/data:video\/mp4;base64,([A-Za-z0-9+/=]+)/g)].map(m => Buffer.from(m[1], 'base64'));
  assert.equal(encoded.length, 4);
  for (const name of ['door','idle','response','reveal']) assert.ok(encoded.some(data => data.equals(readFileSync(new URL(`assets/journey-${name}.mp4`, import.meta.url)))));
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
