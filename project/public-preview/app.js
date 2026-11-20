import { attachZiwei } from './ziwei.js?v=0.11.0';
import { attachSceneSequence } from './motion/motion.mjs?v=0.11.0';
import { STORIES, WELCOME, GOALS, DETAIL_STEPS, emptyDetails, getDetailsError, getBirthDateError, getStory, getChoice } from './content.js?v=0.11.0';
import { api } from './customer.js?v=0.11.0';

const dialog = document.getElementById('story-dialog');
const content = document.getElementById('story-content');
const accountControl = document.getElementById('account-control');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const sceneVideo = document.getElementById('scene-video');
const sceneFigure = document.getElementById('scene-motion');
const sceneStatus = document.getElementById('scene-status');
const scenePoster = document.getElementById('scene-poster');
const homeScene = document.getElementById('home-scene');
const dialogScene = document.getElementById('dialog-scene');
let scenePlayer = null, sceneKey = null, sceneConfig = null, directVisit = false;
const sceneSound = createSceneSound();
const room = 'assets/office-desk-chair-v12.jpg';
const scenes = {
  arrival: { src: 'assets/arrival-loop-1080.mp4', poster: 'assets/arrival-loop-1080.webp', loop: true },
  entrance: { src: 'assets/office-entry-chair-v12.mp4', poster: 'assets/office-door-a4.jpg', still: room },
  welcome: { poster: room },
  interaction: { poster: room },
  response: { poster: room },
  quiet: { poster: room },
  reveal: { src: 'assets/journey-reveal.mp4', poster: 'assets/journey-reveal.webp' },
  still: { poster: room }
};
const publicPreview = document.documentElement?.dataset.mode === 'public-preview';
let currentStory = null, currentChoice = null, introIndex = 0, welcomeIndex = 0;
let birth = { year: '', month: '', day: '' }, details = emptyDetails(), topic = null, goal = null;
let detailIndex = 0, sessionState = null, profileRow = null, visitID = 0, sessionGeneration = 0, accountBusy = false;
let reviewedPreview = null;
const POLICY = 'local-test-v1';
const openZiwei = attachZiwei(dialog, content, paint);

function button(label, action, kind = 'primary') {
  return `<button class="button ${kind}" type="button" data-action="${action}">${label}</button>`;
}

function paint(html, phase = 'story') {
  dialog.dataset.phase = phase;
  content.innerHTML = `<div class="flow-copy">${html}</div>`;
  dialog.scrollTop = 0;
  content.parentElement?.scrollTo(0, 0);
  syncSceneMotion(phase);
  setTravelState(sceneVideo.dataset.state);
  (content.inert ? dialog : content).focus({ preventScroll: true });
}

function showSceneState({ id, state }) {
  sceneVideo.dataset.state = state;
  sceneVideo.dataset.scene = id;
  const failed = ['error', 'blocked'].includes(state);
  sceneStatus.textContent = failed ? '影片暫時播唔到，可以繼續。' : '';
  sceneStatus.className = failed ? 'media-error' : 'sr-only';
  if (sceneConfig?.still && ['ended', 'reduced', 'error', 'blocked'].includes(state)) {
    const line = document.getElementById('desk-question');
    if (line) line.textContent = state === 'ended' ? '坐低先，慢慢講。' : '係咪有問題想問我？';
    scenePoster.src = sceneConfig.still;
    scenePoster.alt = '玄收好把扇，同九爺坐喺枱前等你開口';
  }
  setTravelState(state);
  if (state === 'playing') sceneSound.play(id);
  else sceneSound.stop();
}

function setTravelState(state) {
  const interrupted = state === 'paused' && !!sceneVideo.getAttribute('src') && !sceneVideo.ended;
  const moving = dialog.open && dialog.dataset.phase === 'entrance' &&
    (['loading', 'playing'].includes(state) || interrupted) && !reduceMotion.matches;
  const wasMoving = dialog.dataset.travel === 'moving';
  dialog.dataset.travel = moving ? 'moving' : 'ready';
  content.inert = moving;
  if (!moving && wasMoving && dialog.open) content.focus({ preventScroll: true });
}

function playSceneMotion() {
  if (!scenePlayer || !sceneConfig?.src || reduceMotion.matches) return;
  if (sceneVideo.dataset.state === 'ended') void scenePlayer.replay();
  else void scenePlayer.play();
}

function stopSceneMotion() {
  sceneSound.stop();
  scenePlayer?.destroy();
  scenePlayer = sceneKey = sceneConfig = null;
}

function syncSceneMotion(phase) {
  const atHome = phase === 'arrival';
  if (!atHome && !dialog.open) { stopSceneMotion(); return; }
  const slot = atHome ? homeScene : dialogScene;
  if (sceneFigure.parentNode !== slot) slot.append(sceneFigure);
  const key = ['ziwei-date', 'ziwei-options', 'ziwei-review'].includes(phase)
    ? directVisit ? 'still' : 'quiet'
    : scenes[phase] ? phase : 'still';
  if (sceneKey === key && scenePlayer) return;
  sceneSound.stop();
  sceneKey = key;
  sceneConfig = scenes[key];
  sceneFigure.dataset.scene = key;
  scenePoster.alt = ({arrival:'玄與九爺輕扇收扇，迎接你入座',entrance:'開門見佛龕，再向右望見玄同九爺',welcome:'玄與九爺在會客室等你',interaction:'玄與九爺在會客室等你',response:'玄收好把扇，九爺坐喺佢身邊',reveal:'手轉桌上發光圓盤，這是演出道具'})[key] || '玄與九爺的會客室';
  sceneFigure.hidden = false;
  sceneFigure.dataset.complete = '';
  if (!scenePlayer) scenePlayer = attachSceneSequence(sceneVideo, scenePoster, {
    onState: showSceneState,
    onComplete({ reason }) { sceneFigure.dataset.complete = reason; }
  });
  const poster = reduceMotion.matches && sceneConfig.still || sceneConfig.poster;
  scenePlayer.setScene({ id: key, ...sceneConfig, poster });
  playSceneMotion();
}

function openOffice(skipIntro = false) {
  ensureDialog();
  directVisit = skipIntro;
  openZiwei(skipIntro);
}

function showArrival() { syncSceneMotion('arrival'); }

function formData() {
  return { birth: { ...birth }, calendar: 'gregorian', ...details, topic, goal };
}

function canStartStory() {
  if (publicPreview) return !getBirthDateError(birth) && !getDetailsError(details) && getStory(topic) && Object.hasOwn(GOALS, goal) && reviewedPreview === JSON.stringify(formData());
  return sessionState?.authenticated && !getBirthDateError(birth) && !getDetailsError(details) && getStory(topic) && Object.hasOwn(GOALS, goal) && profileRow && JSON.stringify(profileRow.data) === JSON.stringify(formData());
}

function applyProfile() {
  if (!profileRow) return;
  birth = { ...profileRow.data.birth };
  for (const key of Object.keys(details)) details[key] = profileRow.data[key];
  topic = profileRow.data.topic;
  goal = profileRow.data.goal;
}

function ensureDialog() {
  if (!dialog.open) {
    resetVisit();
    applyProfile();
    dialog.showModal();
  }
}

function updateAccountLabel() {
  accountControl.textContent = publicPreview ? '使用說明' : sessionState?.authenticated ? '我的資料' : '登入／我的資料';
}

async function syncSession() {
  if (publicPreview) { updateAccountLabel(); return; }
  const generation = ++sessionGeneration;
  const info = await api('session');
  if (generation !== sessionGeneration) return;
  if (info.mode !== 'local-test') throw new Error('保存服務版本不相符，請稍後再試。');
  if (sessionState?.authenticated && (!info.authenticated || sessionState.username !== info.username)) {
    profileRow = null; resetVisit();
    if (dialog.open) showAuth();
  }
  sessionState = info;
  const result = info.authenticated ? await api('profile') : { profile: null };
  if (generation !== sessionGeneration) return;
  profileRow = result.profile;
  updateAccountLabel();
}

function showWelcome() {
  const beat = WELCOME[welcomeIndex];
  paint(`<p class="dialog-label">玄與九爺 / 入嚟坐</p><h2 id="dialog-title">${beat.speaker}</h2><p class="speech">${beat.text}</p><div class="dialog-actions">${button(welcomeIndex === WELCOME.length - 1 ? '填寫資料' : '繼續', 'welcome-next')}</div>`, 'welcome');
}

function showBirth() {
  paint(`<p class="dialog-label">01 / 必須填寫</p><h2 id="dialog-title">你嘅出生日期係？</h2><p class="dialog-lead">請填西曆年、月、日。呢題必須填寫。</p><form id="birth-form" autocomplete="off" novalidate><fieldset class="birth-fields" aria-describedby="birth-hint birth-error"><legend class="sr-only">西曆出生日期</legend><label for="birth-year">年<input id="birth-year" type="text" inputmode="numeric" autocomplete="off" placeholder="YYYY" required aria-describedby="birth-error"></label><label for="birth-month">月<input id="birth-month" type="text" inputmode="numeric" autocomplete="off" placeholder="MM" required aria-describedby="birth-error"></label><label for="birth-day">日<input id="birth-day" type="text" inputmode="numeric" autocomplete="off" placeholder="DD" required aria-describedby="birth-error"></label></fieldset><p id="birth-hint" class="privacy-note">${publicPreview ? '公開預覽只用虛構資料。不設登入、不保存；關閉或重新整理會清除本頁填寫。' : '只供虛構資料測試。核對並明確同意後，先保存到本機測試帳戶。'}</p><p class="form-error" id="birth-error" role="alert"></p><div class="dialog-actions"><button class="button primary" type="submit">下一步</button></div></form><button class="dialog-back" type="button" data-action="back-welcome">返回對白</button>`, 'questions');
  for (const field of Object.keys(birth)) document.getElementById(`birth-${field}`).value = birth[field];
}

function showDetail(index) {
  detailIndex = index;
  const step = DETAIL_STEPS[index];
  const controls = step.fields.map(field => {
    let control;
    if (field.options) control = `<select id="profile-${field.key}">${Object.entries(field.options).map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select>`;
    else if (field.type === 'textarea') control = `<textarea id="profile-${field.key}" maxlength="500" rows="4"></textarea>`;
    else control = `<input id="profile-${field.key}" type="${field.type || 'text'}" maxlength="80" autocomplete="off">`;
    return `<label for="profile-${field.key}">${field.label}${control}</label>`;
  }).join('');
  paint(`<p class="dialog-label">${index === 4 ? '07' : String(index + 2).padStart(2, '0')} / 逐樣填</p><h2 id="dialog-title">${step.title}</h2><p class="dialog-lead">${step.hint}</p><form id="detail-form" novalidate><div class="profile-fields">${controls}</div><p class="form-error" id="detail-error" role="alert"></p><div class="dialog-actions"><button class="button primary" type="submit">下一步</button></div></form><button class="dialog-back" type="button" data-action="detail-back">返回</button>`, 'questions');
  for (const field of step.fields) document.getElementById(`profile-${field.key}`).value = details[field.key];
  updateTimeField();
}

function updateTimeField() {
  const field = document.getElementById('profile-birth_time');
  if (field) {
    field.disabled = !['exact', 'approximate'].includes(details.time_precision);
    if (field.disabled) field.value = '';
  }
}

function showTopic() {
  if (getBirthDateError(birth)) return showBirth();
  paint(`<p class="dialog-label">06 / 九爺</p><h2 id="dialog-title">你而家最想傾邊方面？</h2><p class="dialog-lead">工作、感情，定係你自己？今次先揀一樣。</p><div class="story-options" role="group" aria-labelledby="dialog-title">${Object.entries(STORIES).map(([id, story]) => `<button class="option" type="button" data-action="topic" data-topic="${id}" aria-pressed="${topic === id}">${story.topic}<span class="selected-mark">✓ 已選</span></button>`).join('')}</div><p id="selection-error" class="form-error" role="alert"></p><div class="dialog-actions">${button('下一步', 'topic-next')}</div><button class="dialog-back" type="button" data-action="back-relationship">返回感情狀況</button>`, 'questions');
}

function showGoal() {
  paint(`<p class="dialog-label">08 / 玄</p><h2 id="dialog-title">今次最想帶走啲乜？</h2><p class="dialog-lead">唔使一下解決所有事。先揀一樣你在意嘅。</p><div class="story-options" role="group" aria-labelledby="dialog-title">${Object.entries(GOALS).map(([id, label]) => `<button class="option" type="button" data-action="goal" data-goal="${id}" aria-pressed="${goal === id}">${label}<span class="selected-mark">✓ 已選</span></button>`).join('')}</div><p id="selection-error" class="form-error" role="alert"></p><div class="dialog-actions">${button('核對資料', 'goal-next')}</div><button class="dialog-back" type="button" data-action="back-question">返回問題</button>`, 'questions');
}

function showReview() {
  if (getBirthDateError(birth)) return showBirth();
  if (!getStory(topic)) return showTopic();
  if (!Object.hasOwn(GOALS, goal)) return showGoal();
  const error = getDetailsError(details);
  if (error) return showDetail(DETAIL_STEPS.findIndex(step => step.fields.some(field => field.key === error.field)));
  const reviewActions = publicPreview
    ? `<p class="privacy-note">公開預覽不保存資料，紫微排盤只用本頁核對資料，固定故事唔係個人分析。只用虛構資料；關閉或重新整理會清除本頁填寫。</p><div class="dialog-actions">${button('核對完成，試故事', 'preview-start')}${button('更改資料', 'edit-visit', 'secondary')}</div>`
    : `<p class="privacy-note">資料未保存。${profileRow ? '保存會更新帳戶現有資料。' : ''}保存的問答未接到紫微排盤，固定故事唔係個人命盤。</p><button class="dialog-back" type="button" data-action="policy">閱讀本機測試資料保存安排</button><form id="save-form"><label class="consent"><input id="save-consent" type="checkbox">我已閱讀保存安排，同意將以上虛構資料保存到本機測試帳戶。</label><p class="form-error" id="save-error" role="alert"></p><div class="dialog-actions"><button class="button primary" type="submit">同意並保存</button>${button('更改資料', 'edit-visit', 'secondary')}</div></form>`;
  paint(`<p class="dialog-label">09 / 再核對一次</p><h2 id="dialog-title">${publicPreview ? '核對資料' : '核對及保存'}</h2><dl class="visit-review" id="review-values"></dl>${reviewActions}<button class="dialog-back" type="button" data-action="back-goal">返回目標</button>`, 'questions');
  const rows = [['出生日期（西曆）', `${Number(birth.year)} 年 ${Number(birth.month)} 月 ${Number(birth.day)} 日`]];
  for (const step of DETAIL_STEPS) for (const field of step.fields) rows.push([field.label, field.options ? field.options[details[field.key]] : details[field.key] || '未提供']);
  rows.push(['主題', getStory(topic).topic], ['想帶走嘅一樣', GOALS[goal]]);
  for (const [label, value] of rows) {
    const row = document.createElement('div'), term = document.createElement('dt'), answer = document.createElement('dd');
    term.textContent = label; answer.textContent = value; row.append(term, answer);
    document.getElementById('review-values').append(row);
  }
}

function showPolicy() {
  if (publicPreview) return showPreviewInfo();
  paint(`<p class="dialog-label">只供虛構資料測試</p><h2 id="dialog-title">本機測試資料保存安排</h2><p class="dialog-lead">你明確同意保存後，問答會與本機測試帳戶連結，保留至你主動刪除，用於測試日後查看及分析的流程。本機保存的舊問答未接到紫微排盤；新排盤只留本頁。</p><p class="dialog-lead">只有登入同一帳戶先可取回、修改或刪除。正式跨裝置服務、保存期限及備份安排尚未開放；請勿輸入真人資料。帳戶不收電郵，亦不發送郵件。</p><div class="dialog-actions">${button('返回核對', 'review')}</div>`, 'questions');
}

function showSaved() {
  if (publicPreview) return showPreviewInfo();
  paint(`<p class="dialog-label">私人帳戶</p><h2 id="dialog-title">資料已保存。</h2><p class="dialog-lead">已寫入本機測試帳戶，可登入讀回、更改或刪除。呢份保存問答未接到紫微排盤。</p><div class="dialog-actions">${button('開始故事', 'start-story')}${button('更改資料', 'edit-visit', 'secondary')}</div>`, 'questions');
}

function showAuth(mode = 'login') {
  if (publicPreview) return showPreviewInfo();
  const signup = mode === 'signup';
  paint(`<p class="dialog-label">本機測試帳戶</p><h2 id="dialog-title">${signup ? '建立私人帳戶' : '登入私人帳戶'}</h2><p class="dialog-lead">只用測試名稱及測試密碼，請勿填入其他網站的真實登入資料。</p><form id="auth-form" data-mode="${mode}"><div class="profile-fields"><label for="account-name">帳戶名稱<input id="account-name" autocomplete="username" required maxlength="150"></label><label for="account-password">密碼<input id="account-password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" required maxlength="256" ${signup ? 'minlength="12"' : ''}></label>${signup ? '<label for="account-password2">再輸入密碼<input id="account-password2" type="password" autocomplete="new-password" required minlength="12" maxlength="256"></label>' : ''}</div><p class="privacy-note">新密碼至少12字元，唔可以係純數字、常見密碼或與帳戶名稱相近。</p><p class="form-error" id="account-error" role="alert"></p><div class="dialog-actions"><button class="button primary" type="submit">${signup ? '建立帳戶' : '登入'}</button>${button(signup ? '已有帳戶，登入' : '建立帳戶', signup ? 'login' : 'signup', 'secondary')}</div></form><button class="dialog-back" type="button" data-action="review">返回資料</button>`, 'questions');
}

function showAccount(message = '') {
  if (publicPreview) return showPreviewInfo();
  if (!sessionState?.authenticated) return showAuth();
  paint(`<p class="dialog-label">私人帳戶</p><h2 id="dialog-title">我的資料</h2><p class="dialog-lead" id="account-name-display"></p><p class="privacy-note" id="account-status"></p><div class="dialog-actions">${button(profileRow ? '讀取已保存資料' : '開始填寫', 'load-profile')}${button('繼續本頁填寫', 'review', 'secondary')}${button('登出', 'logout', 'secondary')}</div>${profileRow ? '<form id="delete-form"><label class="consent"><input id="delete-consent" type="checkbox">確認刪除本機測試帳戶內已保存的問答資料。</label><p class="form-error" id="delete-error" role="alert"></p><div class="dialog-actions"><button class="button secondary" type="submit">刪除已保存資料</button></div></form>' : ''}`, 'questions');
  document.getElementById('account-name-display').textContent = sessionState.username;
  document.getElementById('account-status').textContent = message || (profileRow ? '有一份已保存問答；排盤不讀取這份資料。' : '帳戶未有保存問答。');
}

function showPreviewInfo() {
  paint(`<p class="dialog-label">玄與九爺</p><h2 id="dialog-title">點樣免費睇命盤？</h2><p class="dialog-lead">只用虛構資料。填寫只留本頁，關閉或重新整理會清除；目前不設登入及保存。</p><div class="dialog-actions">${button('重新試紫微排盤', 'direct')}</div>`, 'questions');
}

function selectOption(trigger, action) {
  content.querySelectorAll(`[data-action="${action}"]`).forEach(item => item.setAttribute('aria-pressed', String(item === trigger)));
  document.getElementById('selection-error').textContent = '';
}

function showPicker() {
  currentStory = null; currentChoice = null;
  paint(`<p class="dialog-label">玄與九爺故事館</p><h2 id="dialog-title">先揀一件<br>掛心嘅事。</h2><p class="dialog-lead">${publicPreview ? '已核對本頁虛構資料，可以試一個固定故事；資料不會保存。' : '已核對並保存資料，可以揀一個固定故事。'}</p><div class="story-options">${Object.entries(STORIES).map(([id, story]) => `<button class="option" type="button" data-action="story" data-story="${id}"><span class="option-arrow" aria-hidden="true">↗</span>${story.topic}<small>${story.title}</small></button>`).join('')}</div>`);
}

function showIntro() {
  const story = getStory(currentStory);
  const beat = story.intro[introIndex];
  paint(`<p class="dialog-label">${story.topic} / ${story.title} / ${beat.speaker}</p><h2 id="dialog-title">${beat.speaker === '故事館' ? '門開咗，故事開始。' : `${beat.speaker}望住你，問咗一句。`}</h2><p class="speech">${beat.text}</p><div class="dialog-actions">${button(introIndex === story.intro.length - 1 ? '試揀一次' : '繼續聽', 'next')}</div><button class="dialog-back" type="button" data-action="picker">揀另一個故事</button>`);
}

function showChoices() {
  const story = getStory(currentStory);
  paint(`<p class="dialog-label">${story.topic} / 冇標準答案</p><h2 id="dialog-title">${story.question}</h2><p class="dialog-lead">揀接近你而家想法嗰個就得。</p><div class="story-options">${story.choices.map(choice => `<button class="option" type="button" data-action="choose" data-choice="${choice.id}"><span class="option-arrow" aria-hidden="true">↗</span>${choice.label}</button>`).join('')}</div><button class="dialog-back" type="button" data-action="intro-back">返去聽多次</button>`);
}

function showOutcome() {
  const choice = getChoice(currentStory, currentChoice);
  paint(`<p class="dialog-label">故事行到呢度</p><h2 id="dialog-title">你揀咗一條路。</h2><p class="dialog-lead">${choice.outcome}</p><p class="dialog-label">${choice.speaker}</p><p class="speech">${choice.line}</p><div class="dialog-actions">${button('帶走一個小行動', 'reflect')}</div><button class="dialog-back" type="button" data-action="choices">換條路試下</button>`);
}

function showReflection() {
  const choice = getChoice(currentStory, currentChoice);
  paint(`<p class="dialog-label">今晚，留低呢句。</p><h2 id="dialog-title">故事行完，<br>你嘅選擇仲喺度。</h2><p class="dialog-lead">${choice.reflection}</p><div class="reflection-action"><h3>可以試嘅下一步</h3><p>${choice.action}</p></div><div class="dialog-actions">${button('返回故事館', 'close')}${button('換條路試下', 'choices', 'secondary')}</div><button class="dialog-back" type="button" data-action="picker">揀另一個故事</button><p class="dialog-note">呢個係虛構故事同生活反思，唔係個人命理判斷。</p>`);
}


function openStory(id = null) {
  if (id !== null && !getStory(id)) return;
  ensureDialog();
  if (!canStartStory()) return getBirthDateError(birth) ? showBirth() : showReview();
  if (id === null) showPicker();
  else { currentStory = id; currentChoice = null; introIndex = 0; showIntro(); }
}

content.addEventListener('input', event => {
  const field = event.target.id.replace('birth-', '');
  if (Object.hasOwn(birth, field)) {
    birth[field] = event.target.value;
    event.target.removeAttribute('aria-invalid');
    document.getElementById('birth-error').textContent = '';
  }
  const key = event.target.id.replace('profile-', '');
  if (Object.hasOwn(details, key)) {
    details[key] = event.target.value;
    if (key === 'time_precision' && !['exact', 'approximate'].includes(details[key])) details.birth_time = '';
    updateTimeField();
    document.getElementById('detail-error').textContent = '';
  }
});

content.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target;
  if (form.id === 'birth-form') {
    const error = getBirthDateError(birth);
    if (error) {
      document.getElementById('birth-error').textContent = error.message;
      const field = document.getElementById(`birth-${error.field}`);
      field.setAttribute('aria-invalid', 'true'); field.focus(); return;
    }
    showDetail(0); return;
  }
  if (form.id === 'detail-form') {
    const error = getDetailsError(details);
    if (error && DETAIL_STEPS[detailIndex].fields.some(field => field.key === error.field)) {
      document.getElementById('detail-error').textContent = error.message;
      document.getElementById(`profile-${error.field}`).focus(); return;
    }
    if (detailIndex === 4) showGoal();
    else if (detailIndex === 3) showTopic();
    else showDetail(detailIndex + 1);
    return;
  }
  if (accountBusy) return;
  if (publicPreview) { showPreviewInfo(); return; }
  if (form.id === 'save-form') {
    if (!document.getElementById('save-consent').checked) { document.getElementById('save-error').textContent = '請先閱讀保存安排，再明確同意。'; return; }
    if (!sessionState?.authenticated) { showAuth(); return; }
  }
  if (form.id === 'delete-form' && !document.getElementById('delete-consent').checked) { document.getElementById('delete-error').textContent = '請先確認刪除。'; return; }
  const ticket = visitID, submit = form.querySelector('[type="submit"]');
  const errorID = form.id === 'auth-form' ? 'account-error' : form.id === 'save-form' ? 'save-error' : 'delete-error';
  if (!['auth-form', 'save-form', 'delete-form'].includes(form.id)) return;
  accountBusy = true; submit.disabled = true;
  try {
    if (form.id === 'auth-form') {
      ++sessionGeneration;
      const previousAccount = sessionState?.username;
      const username = document.getElementById('account-name').value;
      const password = document.getElementById('account-password').value;
      sessionState = form.dataset.mode === 'signup'
        ? await api('signup', { username, password1: password, password2: document.getElementById('account-password2').value })
        : await api('login', { username, password });
      if (previousAccount && previousAccount !== sessionState.username) clearAnswers();
      profileRow = null; updateAccountLabel();
      const result = await api('profile'); profileRow = result.profile;
      if (dialog.open && ticket === visitID) showAccount('登入成功。請讀取已保存資料，或繼續核對本頁填寫。');
    } else if (form.id === 'save-form') {
      const data = formData();
      if (getBirthDateError(birth) || getDetailsError(details) || !getStory(topic) || !Object.hasOwn(GOALS, goal)) throw new Error('資料未填妥，請返回核對。');
      const result = await api('profile', { revision: profileRow?.revision || 0, consent: true, policy_version: POLICY, data });
      if (!result.profile || JSON.stringify(result.profile.data) !== JSON.stringify(data)) throw new Error('未能核對保存結果，請重新讀取帳戶資料。');
      profileRow = result.profile;
      if (dialog.open && ticket === visitID) showSaved();
    } else {
      const result = await api('profile', { revision: profileRow.revision, confirmed: true }, 'DELETE');
      if (!result.deleted) throw new Error('未能確認刪除，請重新讀取。');
      profileRow = null; clearAnswers();
      if (dialog.open && ticket === visitID) showAccount('已刪除保存的問答資料；帳戶仍可使用。');
    }
  } catch (error) {
    if (dialog.open && ticket === visitID && document.getElementById(errorID)) document.getElementById(errorID).textContent = error.message;
  } finally {
    accountBusy = false;
    if (document.contains(submit)) submit.disabled = false;
    if (form.id === 'auth-form') form.querySelectorAll('[type="password"]').forEach(field => field.value = '');
  }
});

function clearAnswers() {
  reviewedPreview = null;
  birth = { year: '', month: '', day: '' }; details = emptyDetails();
  topic = goal = currentStory = currentChoice = null;
}

function resetVisit() {
  stopSceneMotion();
  ++visitID; clearAnswers(); content.replaceChildren(); dialog.classList.remove('office-entering');
}

function closeVisit() { resetVisit(); dialog.close(); showArrival(); }
dialog.addEventListener('cancel', event => { event.preventDefault(); closeVisit(); });
dialog.addEventListener('close', () => { if (!dialog.open) { if (sceneKey !== 'arrival') { resetVisit(); showArrival(); } } });

document.addEventListener('click', async event => {
  const trigger = event.target.closest('button[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;
  if (action === 'enter') openOffice();
  if (action === 'direct') openOffice(true);
  if (action === 'story') openStory(trigger.dataset.story);
  if (action === 'account') {
    if (accountBusy) return;
    ensureDialog(); const ticket = visitID;
    try { await syncSession(); if (dialog.open && ticket === visitID) showAccount(); }
    catch (error) { if (dialog.open && ticket === visitID) { showAuth(); document.getElementById('account-error').textContent = error.message; } }
  }
  if (!dialog.open) return;
  if (action === 'close') closeVisit();
  if (action === 'welcome-next') { if (welcomeIndex < WELCOME.length - 1) { welcomeIndex++; showWelcome(); } else showBirth(); }
  if (['back-birth', 'edit-visit'].includes(action)) showBirth();
  if (action === 'back-welcome') { welcomeIndex = WELCOME.length - 1; showWelcome(); }
  if (action === 'detail-back') { if (detailIndex === 4) showTopic(); else if (detailIndex === 0) showBirth(); else showDetail(detailIndex - 1); }
  if (action === 'back-relationship') showDetail(3);
  if (action === 'back-question') showDetail(4);
  if (action === 'topic' && getStory(trigger.dataset.topic)) { topic = trigger.dataset.topic; selectOption(trigger, action); }
  if (action === 'topic-next') {
    if (getStory(topic)) showDetail(4);
    else { document.getElementById('selection-error').textContent = '先揀一個想傾嘅主題。'; content.querySelector('[data-action="topic"]').focus(); }
  }
  if (action === 'goal' && Object.hasOwn(GOALS, trigger.dataset.goal)) { goal = trigger.dataset.goal; selectOption(trigger, action); }
  if (action === 'back-goal') showGoal();
  if (action === 'goal-next') {
    if (Object.hasOwn(GOALS, goal)) showReview();
    else { document.getElementById('selection-error').textContent = '先揀一樣想帶走嘅嘢。'; content.querySelector('[data-action="goal"]').focus(); }
  }
  if (action === 'review') showReview();
  if (action === 'preview-start' && publicPreview) {
    if (getBirthDateError(birth) || getDetailsError(details) || !getStory(topic) || !Object.hasOwn(GOALS, goal)) { showReview(); return; }
    reviewedPreview = JSON.stringify(formData()); openStory(topic);
  }
  if (action === 'policy') showPolicy();
  if (action === 'signup' || action === 'login') { if (!accountBusy) showAuth(action); }
  if (action === 'load-profile') {
    if (!profileRow) showBirth();
    else paint(`<h2 id="dialog-title">讀取已保存資料？</h2><p class="dialog-lead">會取代本頁尚未保存的填寫內容。</p><div class="dialog-actions">${button('確認讀取', 'confirm-load')}${button('返回本頁資料', 'review', 'secondary')}</div>`, 'questions');
  }
  if (action === 'confirm-load' && profileRow) { applyProfile(); showReview(); }
  if (action === 'logout' && !accountBusy) {
    accountBusy = true; ++sessionGeneration; const ticket = visitID;
    try {
      sessionState = await api('logout'); profileRow = null; resetVisit(); updateAccountLabel();
      if (dialog.open) showAuth();
    } catch (error) {
      profileRow = null; resetVisit();
      if (dialog.open) { showAuth(); document.getElementById('account-error').textContent = '登出未確認。請保持連線後重試，勿在共用裝置離開。'; }
    } finally { accountBusy = false; }
  }
  if (['start-story', 'picker', 'next', 'intro-back', 'choices', 'choose', 'reflect'].includes(action) && !canStartStory()) { getBirthDateError(birth) ? showBirth() : showReview(); return; }
  if (action === 'start-story') openStory(topic);
  if (action === 'picker') showPicker();
  if (!getStory(currentStory)) return;
  if (action === 'next') { if (introIndex < getStory(currentStory).intro.length - 1) { introIndex++; showIntro(); } else showChoices(); }
  if (action === 'intro-back') { introIndex = 0; showIntro(); }
  if (action === 'choices') showChoices();
  if (action === 'choose' && getChoice(currentStory, trigger.dataset.choice)) { currentChoice = trigger.dataset.choice; showOutcome(); }
  if (action === 'reflect' && getChoice(currentStory, currentChoice)) showReflection();
});

// Sound is optional: unavailable or blocked audio never stops the questionnaire.
function createSceneSound() {
  let context = null, enabled = false, played = null, resuming = null, pending = null;
  const active = new Set();
  function stop() {
    played = pending = null;
    for (const node of active) { try { node.stop(); node.disconnect(); } catch {} }
    active.clear();
  }
  const sound = {
    unlock(event) {
      if (!event.isTrusted || reduceMotion.matches || document.hidden) return;
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        context ||= new Audio();
        enabled = true;
        resuming = Promise.resolve(context.resume()).then(() => {
          if (document.hidden || reduceMotion.matches) void context.suspend().catch(() => {});
        }).catch(() => {});
      } catch { enabled = false; }
    },
    play(kind) {
      if (!enabled || document.hidden || reduceMotion.matches || played === kind) return;
      const cues = { entrance: [90, 65, .6], response: [390, 310, .12], reveal: [660, 990, 1.3] };
      if (!Object.hasOwn(cues, kind)) return;
      if (context?.state !== 'running') {
        const cue = pending = {};
        // stop() cancels this playing turn, including a same-scene reentry.
        resuming?.then(() => { if (pending === cue && context.state === 'running') sound.play(kind); });
        return;
      }
      stop(); played = kind;
      try {
        const [from, to, duration] = cues[kind], at = context.currentTime;
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(from, at);
        oscillator.frequency.exponentialRampToValueAtTime(to, at + duration);
        gain.gain.setValueAtTime(.0001, at);
        gain.gain.exponentialRampToValueAtTime(.035, at + .025);
        gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
        oscillator.connect(gain); gain.connect(context.destination);
        active.add(oscillator);
        oscillator.onended = () => { active.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(at); oscillator.stop(at + duration);
      } catch { stop(); }
    },
    stop
  };
  return sound;
}

document.addEventListener('click', event => {
  if (event.target.closest('button')) sceneSound.unlock(event);
}, true);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) sceneSound.stop();
  else if (sceneVideo.dataset.state === 'paused' && sceneVideo.getAttribute('src') &&
      ['entrance', 'arrival'].includes(sceneKey)) playSceneMotion();
});
reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) sceneSound.stop(); });

showArrival();

if ('IntersectionObserver' in window && !reduceMotion.matches) {
  document.documentElement.classList.add('js-motion');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
}

async function recheckPrivateSession() {
  try { await syncSession(); }
  catch {
    if (sessionState?.authenticated) {
      profileRow = null; sessionState = null; resetVisit(); updateAccountLabel();
      if (dialog.open) { showAuth(); document.getElementById('account-error').textContent = '未能核對登入狀態，已隱藏本頁私人資料。請重新登入。'; }
    }
  }
}
syncSession().catch(() => {});
window.addEventListener('pagehide', () => { if (publicPreview && dialog.open) closeVisit(); });
window.addEventListener('pageshow', event => { if (event.persisted) recheckPrivateSession(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && sessionState?.authenticated) recheckPrivateSession(); });
