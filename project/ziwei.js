import { WELCOME, getBirthDateError } from './content.js?v=0.6.2';

const READING_TOPICS = {
  命宮: { label: '自己', lead: '先借命宮，整理你習慣點樣行事。' },
  官祿: { label: '工作', lead: '官祿宮係傳統觀察處事取向嘅入口，唔係職業或升遷預測。' },
  夫妻: { label: '關係', lead: '夫妻宮係傳統觀察親密相處觀念嘅入口，唔判斷婚期或對方性格。' }
};

// Cultural keywords only; questions are our prompts, not claims made by the source.
const STAR_PROMPTS = {
  紫微: ['統籌與方向', '呢件事要由邊個定方向？你想負責到邊一部分？'],
  天機: ['想法與變通', '有幾多個做法可揀？你仲差邊項資料先肯開始？'],
  太陽: ['對外付出', '你想貢獻啲乜？對方有冇需要你而家呢種幫法？'],
  武曲: ['動手落實', '如果先做一件可完成嘅事，你會揀乜？'],
  天同: ['相處的舒服感', '你想維持舒服，定願意為一件重要嘅事講清楚？'],
  廉貞: ['原則與界線', '邊條界線對你重要？有冇已經講清楚？'],
  天府: ['維持與管理', '有邊啲安排值得保留？邊啲只係慣咗？'],
  太陰: ['細膩的感受', '你真正嘅感受係乜？你想點樣表達？'],
  貪狼: ['探索與興趣', '你最想探索乜？有冇一樣值得先集中？'],
  巨門: ['表達與疑問', '你心入面嘅疑問係乜？邊句說話未講清楚？'],
  天相: ['協調與分工', '各人應該負責邊部分？你想點樣協調？'],
  天梁: ['照顧與承擔', '你想照顧邊個？有邊啲責任唔需要一個人扛？'],
  七殺: ['堅持與決斷', '你想堅持嘅係目標，定只係目前呢個做法？'],
  破軍: ['改變既有做法', '你想改變邊一部分？有乜值得先保留？']
};

export function getPalaceReading(chart, name) {
  if (chart?.status !== 'ready' || !Object.hasOwn(READING_TOPICS, name) || !Array.isArray(chart.palaces)) return null;
  const palace = chart.palaces.find(p => p?.name === name);
  if (!palace || ![...'子丑寅卯辰巳午未申酉戌亥'].includes(palace.earthlyBranch) || !Array.isArray(palace.majorStars) || palace.majorStars.some(star => !star || typeof star !== 'object')) return null;
  const stars = palace.majorStars.filter(star => star.type === 'major');
  if (stars.length > 2 || new Set(stars.map(star => star.name)).size !== stars.length || stars.some(star => !Object.hasOwn(STAR_PROMPTS, star.name))) return null;
  return {
    label: READING_TOPICS[name].label, lead: READING_TOPICS[name].lead,
    palace: name, branch: palace.earthlyBranch,
    stars: stars.map(star => ({ name: star.name, theme: STAR_PROMPTS[star.name][0], question: STAR_PROMPTS[star.name][1] })),
    sources: [
      { title: '紫微研習社：宮位', url: 'https://docs.iztro.com/learn/palace' },
      { title: '紫微研習社：十四主星', url: 'https://docs.iztro.com/learn/major-star' }
    ]
  };
}


export const ZIWEI_RULES = Object.freeze({ yearDivide: 'normal', horoscopeDivide: 'normal', ageDivide: 'normal', dayDivide: 'forward', algorithm: 'default' });

export function getZiweiError(input, today = new Date()) {
  if (!input || typeof input !== 'object') return { field: 'year', message: '請填寫出生資料。' };
  const dateError = getBirthDateError(input, today);
  if (dateError) return dateError;
  if (Number(input.year) < 1900 || Number(input.year) > 2099) return { field: 'year', message: '呢個版本只支援1900至2099年的西曆出生日期。' };
  if (!['exact', 'unknown'].includes(input.precision)) return { field: 'precision', message: '請選擇已知時間或不知道。' };
  if (input.precision === 'exact' && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.time)) return { field: 'time', message: '請填有效出生時間，或選不知道。' };
  if (input.precision === 'unknown' && input.time !== '') return { field: 'time', message: '未知時辰不能同時填入時間。' };
  if (!['male', 'female', 'withheld'].includes(input.gender)) return { field: 'gender', message: '請選擇排盤參數，或暫不提供。' };
  if (typeof input.place !== 'string' || input.place.length > 80) return { field: 'place', message: '出生地最多80字，唔需要詳細地址。' };
  return null;
}

export function calculateZiwei(input, engine = globalThis.iztro) {
  const error = getZiweiError(input);
  if (error) throw new Error(error.message);
  if (input.precision === 'unknown' || input.gender === 'withheld') return { status: 'needs-input' };
  if (engine?.version !== '2.6.5' || typeof engine.astro?.withOptions !== 'function') throw new Error('排盤暫時未能使用，請重新載入後再試。');
  const hour = Number(input.time.slice(0, 2));
  const timeIndex = hour === 23 ? 12 : Math.floor((hour + 1) / 2);
  engine.astro.resetConfig();
  const chart = engine.astro.withOptions({
    type: 'solar', dateStr: `${Number(input.year)}-${Number(input.month)}-${Number(input.day)}`,
    timeIndex, gender: input.gender === 'male' ? '男' : '女', fixLeap: true, language: 'zh-TW', config: ZIWEI_RULES
  });
  if (typeof chart.lunarDate !== 'string' || typeof chart.fiveElementsClass !== 'string' || !Array.isArray(chart.palaces) || chart.palaces.length !== 12 || new Set(chart.palaces.map(p => p.earthlyBranch)).size !== 12 || !chart.palaces.every(p => '子丑寅卯辰巳午未申酉戌亥'.includes(p.earthlyBranch) && typeof p.name === 'string' && ['majorStars', 'minorStars', 'adjectiveStars'].every(key => Array.isArray(p[key]))) || !chart.palaces.some(p => p.name === '命宮') || chart.palaces.filter(p => p.isBodyPalace).length !== 1) throw new Error('未能核對命盤，請稍後再試。');
  return { status: 'ready', timeIndex, lunarDate: chart.lunarDate, fiveElementsClass: chart.fiveElementsClass, palaces: chart.palaces };
}

export function attachZiwei(dialog, content, paint) {
  const emptyInput = () => ({ year: '', month: '', day: '', precision: 'unknown', time: '', gender: '', place: '' });
  let input = emptyInput(), chart = null, reviewed = null, active = false, focusPalace = '命宮';
  const action = (label, name, kind = 'primary') => `<button class="button ${kind}" type="button" data-ziwei="${name}">${label}</button>`;
  const label = '';
  const privacy = '<p class="privacy-note">只用虛構資料；資料只留本頁，不保存。</p>';
  const rules = '<details class="ziwei-rules"><summary>排盤方式</summary><p>採用西曆及出生地當地鐘錶時間，不校正夏令時間或真太陽時。23:00起按翌日排盤；閏月初一至十五按前月，十六日起按後月。本版只展示本命盤，不作大限、流年或吉凶預言。</p></details>';

  function text(tag, value, className) {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    return node;
  }
  function errorMessage(error) {
    const field = document.getElementById(`ziwei-${error.field}`);
    document.getElementById('ziwei-error').textContent = error.message;
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  }
  function showEntrance() {
    paint(`<h2 id="dialog-title">入嚟先。</h2><div class="story-options">${action('先睇吓左邊', 'look-altar')}${action('去見玄同九爺', 'greet')}</div>`, 'entrance');
  }
  function showAltar() {
    paint(`<h2 id="dialog-title">左邊係神主枱。</h2><p class="speech">玄同九爺喺入面等你。</p><div class="dialog-actions">${action('去見玄同九爺', 'greet')}</div>`, 'altar');
  }
  function showIntro() {
    paint(`<h2 id="dialog-title">玄</h2><p class="speech">坐低先。今晚想睇啲乜？</p><div class="dialog-actions">${action('同九爺講', 'next-intro')}</div>`, 'welcome');
  }
  function showChoice() {
    paint(`<h2 id="dialog-title">想睇邊方面？</h2><div class="story-options">${[['命宮','自己'],['官祿','工作'],['夫妻','關係']].map(([palace,title]) => `<button class="option" type="button" data-ziwei="focus" data-palace="${palace}">${title}</button>`).join('')}</div>`, 'interaction');
  }
  function showResponse() {
    paint(`<h2 id="dialog-title">九爺</h2><p class="speech">好，先由${READING_TOPICS[focusPalace].label}睇起。你幾時出世？</p><div class="dialog-actions">${action('填出生日期', 'skip')}</div><button class="dialog-back" type="button" data-ziwei="choose-focus">返去揀</button>`, 'response');
  }
  function showReveal() {
    paint(`<h2 id="dialog-title">命盤已排好。</h2><div class="dialog-actions">${action('睇命盤', 'view-result')}</div><button class="dialog-back" type="button" data-ziwei="edit-options">修改資料</button>`, 'reveal');
  }
  function showDate() {
    chart = reviewed = null;
    paint(`${label}<h2 id="dialog-title">你邊日出世？</h2><p class="dialog-lead">出生日期（西曆）</p><form id="ziwei-date-form" autocomplete="off" novalidate><div class="birth-fields"><label for="ziwei-year">年<input id="ziwei-year" data-ziwei-field="year" type="text" inputmode="numeric" placeholder="YYYY" required></label><label for="ziwei-month">月<input id="ziwei-month" data-ziwei-field="month" type="text" inputmode="numeric" placeholder="MM" required></label><label for="ziwei-day">日<input id="ziwei-day" data-ziwei-field="day" type="text" inputmode="numeric" placeholder="DD" required></label></div>${privacy}<p id="ziwei-error" class="form-error" role="alert"></p><div class="dialog-actions"><button class="button primary" type="submit">填出生時間</button></div></form><button class="dialog-back" type="button" data-ziwei="back-intro">返去揀主題</button>`, 'ziwei-date');
    for (const key of ['year', 'month', 'day']) document.getElementById(`ziwei-${key}`).value = input[key];
  }
  function showOptions() {
    chart = reviewed = null;
    paint(`${label}<h2 id="dialog-title">幾點出世？</h2><form id="ziwei-options-form" autocomplete="off" novalidate><div class="profile-fields"><label for="ziwei-precision">出生時間<select id="ziwei-precision" data-ziwei-field="precision"><option value="unknown">唔確定</option><option value="exact">知道出生時間</option></select></label><label for="ziwei-time">時間（24小時 HH:mm）<input id="ziwei-time" data-ziwei-field="time" type="text" placeholder="03:30" maxlength="5" autocomplete="off"></label><label for="ziwei-place">出生地（可不填）<input id="ziwei-place" data-ziwei-field="place" type="text" maxlength="80" placeholder="國家／地區、城市"></label><label for="ziwei-gender">排盤採用嘅性別參數<select id="ziwei-gender" data-ziwei-field="gender"><option value="">請選擇</option><option value="male">男</option><option value="female">女</option><option value="withheld">暫不提供</option></select></label></div><p class="privacy-note">時辰唔確定就留白，唔會代填。出生地不作校時。</p>${rules}<p id="ziwei-error" class="form-error" role="alert"></p><div class="dialog-actions"><button class="button primary" type="submit">核對資料</button>${action('返回日期', 'edit-date', 'secondary')}</div></form>`, 'ziwei-options');
    for (const key of ['precision', 'time', 'place', 'gender']) document.getElementById(`ziwei-${key}`).value = input[key];
    document.getElementById('ziwei-time').disabled = input.precision !== 'exact';
  }
  function showReview() {
    chart = null;
    reviewed = JSON.stringify(input);
    paint(`${label}<h2 id="dialog-title">資料啱嗎？</h2><dl class="visit-review" id="ziwei-review"></dl><p id="ziwei-error" class="form-error" role="alert"></p><div class="dialog-actions">${action('啱，排盤', 'calculate')}${action('修改資料', 'edit-options', 'secondary')}</div>`, 'ziwei-review');
    const rows = [['西曆出生日期', `${input.year}年${input.month}月${input.day}日`], ['當地出生時間', input.precision === 'exact' ? input.time : '唔確定'], ['出生地（不作校時）', input.place || '未提供'], ['排盤參數', { male: '男', female: '女', withheld: '暫不提供' }[input.gender]]];
    const list = document.getElementById('ziwei-review');
    for (const [key, value] of rows) { const row = document.createElement('div'); row.append(text('dt', key), text('dd', value)); list.append(row); }
  }
  function starNames(palace) {
    return palace.majorStars.filter(star => star.type === 'major').map(star => star.name).join('、') || '本宮無十四主星';
  }
  function showPalace(name) {
    const reading = getPalaceReading(chart, name);
    const note = document.getElementById('ziwei-palace-note');
    note.replaceChildren();
    if (!reading) { note.append(text('p', '未能核對呢個宮嘅說明，請先查看原始命盤。')); return; }
    note.append(text('h3', `玄 · ${reading.label}`));
    note.append(text('p', `本盤${reading.palace}喺${reading.branch}位，${reading.stars.map(star => star.name).join('、') || '本宮無十四主星'}。`, 'reading-fact'));
    if (!reading.stars.length) {
      note.append(text('p', '無主星唔代表好或壞。本版未做借星同合盤，先唔替呢個宮寫星性說明。'));
    } else {
      for (const star of reading.stars) {
        const section = document.createElement('section'); section.className = 'reading-star';
        section.append(text('h4', `${star.name} · ${star.theme}`), text('p', `九爺：${star.question}`)); note.append(section);
      }
    }
    const evidence = document.createElement('details'); evidence.className = 'reading-evidence';
    evidence.append(text('summary', '解讀依據'), text('p', reading.lead), text('p', '呢啲係單星文化象徵引出嘅反思題，唔係你必然嘅性格；同宮有兩粒主星，亦唔等於簡單相加。'), text('p', `本盤依據：${reading.palace}・${reading.branch}；十四主星：${reading.stars.map(star => star.name).join('、') || '無'}。`));
    evidence.append(text('p', '只用本宮主星作文化閱讀入口；未合看輔星、四化、三方四正、借星或流年，唔作吉凶預言。反思題為本頁提問，詞義參考：'));
    for (const source of reading.sources) { const link = text('a', source.title); link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; evidence.append(link); }
    note.append(evidence);
    content.querySelectorAll('[data-ziwei="palace"]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.palace === name)));
  }
  function showResult() {
    if (chart.status === 'needs-input') {
      paint(`${label}<h2 id="dialog-title">資料未足，先唔落盤。</h2><p class="dialog-lead">出生時間同排盤參數齊咗，再返嚟排盤。</p><div class="dialog-actions">${action('返回資料', 'edit-options')}</div>${privacy}`, 'ziwei');
      return;
    }
    paint(`${label}<h2 id="dialog-title">你嘅本命盤</h2><p id="ziwei-result-context" class="reading-fact"></p><div class="ziwei-reading" id="ziwei-reading"></div><div class="dialog-actions">${[['命宮', '自己'], ['官祿', '工作'], ['夫妻', '關係']].map(([name, title]) => `<button class="button secondary" type="button" data-ziwei="palace" data-palace="${name}" aria-pressed="false">${title}</button>`).join('')}</div><section id="ziwei-palace-note" aria-live="polite" aria-atomic="true"></section><details class="ziwei-chart-details"><summary>打開十二宮命盤</summary><div class="ziwei-scroll" tabindex="0" role="region" aria-label="十二宮命盤，窄螢幕可左右捲動"><div class="ziwei-grid" id="ziwei-grid"></div></div></details>${rules}<p class="privacy-note">只作傳統文化參考，不作健康、投資或人生決定依據。未提供流年、大限或完整論命。</p><div class="dialog-actions">${action('修改資料', 'edit-options')}</div>${privacy}`, 'ziwei-result');
    document.getElementById('ziwei-result-context').textContent = `${input.year}年${input.month}月${input.day}日 ${input.time} · ${chart.fiveElementsClass}`;
    const grid = document.getElementById('ziwei-grid');
    const scroll = grid.parentElement;
    scroll.addEventListener('keydown', event => {
      if (event.target !== scroll || event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      scroll.scrollBy({ left: event.key === 'ArrowRight' ? 80 : -80, behavior: 'auto' });
    });
    const positions = { 寅: [4, 1], 卯: [3, 1], 辰: [2, 1], 巳: [1, 1], 午: [1, 2], 未: [1, 3], 申: [1, 4], 酉: [2, 4], 戌: [3, 4], 亥: [4, 4], 子: [4, 3], 丑: [4, 2] };
    for (const palace of chart.palaces) {
      const cell = document.createElement('section'); cell.className = 'ziwei-palace';
      [cell.style.gridRow, cell.style.gridColumn] = positions[palace.earthlyBranch];
      cell.append(text('h3', `${palace.name}${palace.isBodyPalace ? ' · 身宮' : ''}`), text('p', `${palace.heavenlyStem}${palace.earthlyBranch}`, 'ziwei-branch'));
      for (const star of palace.majorStars) cell.append(text('p', `${star.name}${star.brightness ? ` · ${star.brightness}` : ''}${star.mutagen ? ` · 化${star.mutagen}` : ''}`, star.type === 'major' ? 'ziwei-major' : 'ziwei-minor'));
      if (!palace.majorStars.some(star => star.type === 'major')) cell.append(text('p', '本宮無十四主星', 'ziwei-minor'));
      cell.append(text('p', palace.minorStars.map(star => `${star.name}${star.mutagen ? `（化${star.mutagen}）` : ''}`).join('、'), 'ziwei-minor'));
      const details = document.createElement('details'); details.append(text('summary', '其他星曜'), text('p', palace.adjectiveStars.map(star => star.name).join('、') || '無')); cell.append(details);
      grid.append(cell);
    }
    const centre = document.createElement('div'); centre.className = 'ziwei-centre';
    centre.append(text('h3', '紫微斗數'), text('p', `${input.year}年${input.month}月${input.day}日 ${input.time}`), text('p', `排盤採用農曆：${chart.lunarDate}`), text('p', chart.fiveElementsClass)); grid.append(centre);
    const soul = chart.palaces.find(p => p.name === '命宮'), body = chart.palaces.find(p => p.isBodyPalace);
    const reading = document.getElementById('ziwei-reading');
    reading.append(text('p', `命宮：${soul.earthlyBranch}位・${starNames(soul)}。身宮：${body.name}・${body.earthlyBranch}位。`));
    showPalace(focusPalace);
  }

  content.addEventListener('input', event => {
    const key = event.target.dataset.ziweiField;
    if (!active || !key || !Object.hasOwn(input, key)) return;
    input[key] = event.target.value; chart = reviewed = null;
    event.target.removeAttribute('aria-invalid');
    if (key === 'precision') {
      const time = document.getElementById('ziwei-time'); time.disabled = input.precision !== 'exact';
      if (time.disabled) input.time = time.value = '';
    }
  });
  content.addEventListener('submit', event => {
    if (!active || !['ziwei-date-form', 'ziwei-options-form'].includes(event.target.id)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.target.id === 'ziwei-date-form') {
      const error = getBirthDateError(input) || (Number(input.year) < 1900 || Number(input.year) > 2099 ? { field: 'year', message: '呢個版本只支援1900至2099年的西曆出生日期。' } : null);
      if (error) errorMessage(error); else showOptions();
    } else {
      const error = getZiweiError(input);
      if (error) errorMessage(error); else showReview();
    }
  }, true);
  content.addEventListener('click', event => {
    const trigger = event.target.closest('button[data-ziwei]');
    if (!active || !trigger) return;
    const name = trigger.dataset.ziwei;
    if (name === 'look-altar') showAltar();
    if (name === 'greet') showIntro();
    if (name === 'next-intro' || name === 'choose-focus') showChoice();
    if (name === 'focus' && Object.hasOwn(READING_TOPICS, trigger.dataset.palace)) { focusPalace = trigger.dataset.palace; showResponse(); }
    if (name === 'skip' || name === 'edit-date') showDate();
    if (name === 'back-intro') showChoice();
    if (name === 'edit-options') showOptions();
    if (name === 'palace' && chart?.status === 'ready') showPalace(trigger.dataset.palace);
    if (name === 'view-result' && chart?.status === 'ready' && reviewed === JSON.stringify(input)) showResult();
    if (name === 'calculate') {
      if (reviewed !== JSON.stringify(input)) { showReview(); return; }
      try { chart = calculateZiwei(input); if (chart.status === 'ready') showReveal(); else showResult(); }
      catch { document.getElementById('ziwei-error').textContent = '未能建立命盤。請核對資料或重新載入後再試；未有排盤結果。'; }
    }
  });
  dialog.addEventListener('close', () => { if (!dialog.open) { input = emptyInput(); chart = reviewed = null; active = false; } });
  return skipIntro => { input = emptyInput(); focusPalace = '命宮'; chart = reviewed = null; active = true; if (skipIntro) showDate(); else showEntrance(); };
}
