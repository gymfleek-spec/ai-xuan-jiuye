import { getBirthDateError } from '../content.js';
import { STAR_COPY, TOPIC_COPY } from './empathy-copy.mjs';

export const READING_TOPICS = {
  官祿: { label: '事業', hint: '我點做事', lead: '諗返最近一次有人臨時搵你幫手，你最先答咗邊句？', question: '下次有人話「好趕」，你想即刻接手，定先問邊樣可以遲啲交？' },
  夫妻: { label: '愛情', hint: '我點同人相處', lead: '試諗一幕：如果你想有人聽你講完，會點開口？有冇伴侶都可以睇。', question: '如果可以補返一句，邊句最接近你嗰刻真正想講嘅嘢？' },
  田宅: { label: '家庭', hint: '我想點樣安頓', lead: '由返到屋企嗰一刻諗起：有邊件小事，照自己意思做會自在啲？', question: '今晚返到屋企，有邊件小事你想照自己意思做一次？' },
  財帛: { label: '財運', hint: '我點用手上資源', lead: '試拎最近一筆你有猶豫過嘅開支做例，諗返落決定前你最在意乜。', question: '下次遇到同樣一筆數，你想保留咩預算，又想留幾多畀自己自由用？' },
  命宮: { label: '未來方向', hint: '我下一步想點行', lead: '諗一件你最近未揀定嘅事，對照下自己通常點樣踏出第一步。', question: '如果只試一個星期，邊一小步可以幫你睇清楚仲想唔想繼續？' }
};

for (const [key, copy] of Object.entries(TOPIC_COPY)) Object.assign(READING_TOPICS[key], {lead:copy.lead, question:copy.question});
const STAR_READINGS = Object.fromEntries(Object.entries(STAR_COPY).map(([name, copy]) => [name, {theme:copy.theme, ...Object.fromEntries(Object.keys(READING_TOPICS).map(key => [key, copy[key].receive + copy[key].release]))}]));

export const BRANCHES = [...'子丑寅卯辰巳午未申酉戌亥'];
export const HOUSE_GUIDES = { ...READING_TOPICS,
  兄弟: {label:'同輩往來',lead:'同一輩相處，可以先由彼此點分工睇起，唔一定限於親兄弟姊妹。',question:'如果要夾手做好一件事，你想預先傾清楚邊一步？'},
  父母: {label:'長輩與指引',lead:'可以借呢格諗吓：收到前輩意見，你想留低邊部分畀自己參考？',question:'下次請教人，你最想問清楚邊個細節？'},
  福德: {label:'休息同心力',lead:'可以由一段由你話事嘅空檔，睇吓點樣用時間先覺得回到氣。',question:'如果有十分鐘淨返畀自己，你想點用？'},
  僕役: {label:'朋友與合作',lead:'僕役宮又叫交友宮，可以由同人合作嗰次點樣互相幫手睇起。',question:'下次開工之前，有咩值得先同拍檔夾清楚？'},
  遷移: {label:'出外與新環境',lead:'呢格可以用嚟對照自己去到新地方時，想先觀察定先試做一件事。',question:'如果第一次去一個地方，你想先知道邊樣嘢？'},
  疾厄: {label:'日常節奏',lead:'呢格只借嚟望一望日常作息，唔用星曜判斷身體狀況。',question:'平日行程之間，你想喺邊個位置留少少空檔？'},
  子女: {label:'照顧與傳承',lead:'「子女」係宮名，唔假設有小朋友。亦可以用教人一件小事做例。',question:'如果要教一件自己熟悉嘅事，你想由邊一步開始？'}
};
export const OPPOSITE = { 官祿:'夫妻', 夫妻:'官祿', 田宅:'子女', 子女:'田宅', 財帛:'福德', 福德:'財帛', 命宮:'遷移', 遷移:'命宮', 兄弟:'僕役', 僕役:'兄弟', 父母:'疾厄', 疾厄:'父母' };
export const palaceTitle = name => name.endsWith('宮') ? name : name + '宮';

function readStars(palace, topic) {
  const list = palace?.majorStars;
  if (!Array.isArray(list) || list.some(s => !s || typeof s.name !== 'string' || typeof s.type !== 'string')) return null;
  const stars = list.filter(s => s.type === 'major');
  if (stars.length > 2 || new Set(stars.map(s => s.name)).size !== stars.length || stars.some(s => !Object.hasOwn(STAR_READINGS, s.name))) return null;
  return stars.map(({ name }) => ({ name, theme: STAR_READINGS[name].theme, behaviour: STAR_READINGS[name][topic] || '' }));
}

export function getPalaceReading(chart, name) {
  if (chart?.status !== 'ready' || !Object.hasOwn(HOUSE_GUIDES, name) || !Array.isArray(chart.palaces) || chart.palaces.length !== 12) return null;
  const matches = chart.palaces.filter(p => p?.name === name);
  if (matches.length !== 1) return null;
  const palace = matches[0], i = BRANCHES.indexOf(palace.earthlyBranch);
  const stars = readStars(palace, name);
  if (i < 0 || !stars) return null;
  let opposite = null;
  if (!stars.length) {
    const branch = BRANCHES[(i + 6) % 12], oppositeName = OPPOSITE[name];
    const donors = chart.palaces.filter(p => p?.earthlyBranch === branch || p?.name === oppositeName);
    if (donors.length !== 1 || donors[0].name !== oppositeName || donors[0].earthlyBranch !== branch) return null;
    const borrowed = readStars(donors[0], name);
    if (!borrowed?.length) return null;
    opposite = { palace: oppositeName, branch, stars: borrowed };
  }
  return {
    label: HOUSE_GUIDES[name].label, lead: HOUSE_GUIDES[name].lead, question: HOUSE_GUIDES[name].question,
    palace: name, branch: palace.earthlyBranch, stars, opposite
  };
}


export function readingFact(reading) {
  const {stars, opposite} = reading;
  const names = (opposite ? opposite.stars : stars).map(s => s.name).join('、');
  return palaceTitle(reading.palace) + '喺' + reading.branch + '位，' + (opposite
    ? '本宮無十四主星。借對宮' + palaceTitle(opposite.palace) + '（' + opposite.branch + '位）嘅' + names + '嚟參看。'
    : '本宮主星係' + names + '。');
}

export const ZIWEI_RULES = Object.freeze({ yearDivide: 'normal', horoscopeDivide: 'normal', ageDivide: 'normal', dayDivide: 'forward', algorithm: 'default' });

export function getZiweiError(input, today = new Date()) {
  if (!input || typeof input !== 'object') return { field: 'year', message: '請填寫出生資料。' };
  const dateError = getBirthDateError(input, today);
  if (dateError) return dateError;
  if (Number(input.year) < 1900 || Number(input.year) > 2099) return { field: 'year', message: '請填1900至2099年之間嘅西曆出生日期。' };
  if (!['exact', 'unknown'].includes(input.precision)) return { field: 'precision', message: '請選擇已知時間或不知道。' };
  if (input.precision === 'exact' && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.time)) return { field: 'time', message: '請填有效出生時間，或選不知道。' };
  if (input.precision === 'unknown' && input.time !== '') return { field: 'time', message: '未知時辰不能同時填入時間。' };
  if (!['male', 'female', 'withheld'].includes(input.gender)) return { field: 'gender', message: '請選擇性別，或暫不提供。' };
  if (typeof input.place !== 'string' || input.place.length > 80) return { field: 'place', message: '出生地最多80字，唔需要詳細地址。' };
  return null;
}

export function calculateZiwei(input, engine = globalThis.iztro, { asOf = hongKongDate() } = {}) {
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
  const mutagens = natalMutagens(chart.palaces);
  const timing = chartTiming(chart, `${Number(input.year)}-${String(input.month).padStart(2,'0')}-${String(input.day).padStart(2,'0')}`, asOf);
  return { status: 'ready', timeIndex, lunarDate: chart.lunarDate, fiveElementsClass: chart.fiveElementsClass, palaces: chart.palaces, mutagens, timing };
}

const HUA = ['祿','權','科','忌'];
const allStars = p => [...p.majorStars, ...p.minorStars, ...p.adjectiveStars];
export const TEMPO_RULE = 'tempo-v1';
export function hongKongDate() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Hong_Kong', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
  return ['year','month','day'].map(key => parts.find(p=>p.type===key).value).join('-');
}
export function natalMutagens(palaces) {
  const rows = palaces.flatMap((p,index) => allStars(p).filter(s => s.mutagen).map(s => ({ scope:'origin', hua:s.mutagen, star:s.name, type:s.type, index, palace:p.name, branch:p.earthlyBranch })));
  if (rows.length !== 4 || HUA.some(h => rows.filter(r=>r.hua===h).length!==1)) throw new Error('四化資料未齊，請重新起盤。');
  return HUA.map(h=>rows.find(r=>r.hua===h));
}

function readPeriod(chart, birthDate, date) {
  if (date < birthDate) return { date, status:'before-birth' };
  const h = chart.horoscope(date, 0), age = h.age.nominalAge;
  if (age > Math.max(...chart.palaces.map(p=>p.decadal.range[1]))) return { date, status:'out-of-range' };
  const result = { date, status:'ready', nominalAge:age };
  for (const scope of ['decadal','yearly','monthly']) {
    const raw = h[scope];
    if (!Number.isInteger(raw?.index) || raw.index < 0 || raw.index > 11 || raw.palaceNames?.length !== 12 || new Set(raw.palaceNames).size !== 12 || raw.mutagen?.length !== 4) throw new Error('運限資料未能核對。');
    const anchor = chart.palaces[raw.index];
    const activations = HUA.map((hua,i) => {
      const star = raw.mutagen[i], matches = chart.palaces.map((p,index)=>({p,index})).filter(({p})=>allStars(p).some(s=>s.name===star));
      if (matches.length!==1) throw new Error('運限四化落點未能核對。');
      const {p,index} = matches[0];
      return {scope,hua,star,index,palace:p.name,branch:p.earthlyBranch,flowPalace:raw.palaceNames[index]};
    });
    result[scope] = { index:raw.index, stem:raw.heavenlyStem, branch:raw.earthlyBranch, natalPalace:anchor.name,
      palaceNames:Array.from(raw.palaceNames), activations };
    if (scope==='decadal') {
      result.decadal.range = Array.from(anchor.decadal.range);
      result.decadal.active = age >= anchor.decadal.range[0] && age <= anchor.decadal.range[1];
    }
  }
  return result;
}

export function chartTiming(chart, birthDate, asOf) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || Number.isNaN(Date.parse(asOf+'T12:00:00Z')) || new Date(asOf+'T12:00:00Z').toISOString().slice(0,10)!==asOf || asOf < birthDate) throw new Error('運限參照日期無效。');
  const annual = [2026,2027,2028].map(year => ({ year, ...readPeriod(chart,birthDate,year+'-07-01') }));
  const quarters = [2026,2027,2028].flatMap(year => [3,6,9,12].map((month,i) => ({ year, quarter:i+1, ...readPeriod(chart,birthDate,`${year}-${String(month).padStart(2,'0')}-15`) })));
  return { asOf, rule:TEMPO_RULE, current:readPeriod(chart,birthDate,asOf), annual, quarters };
}

// A documented editorial index from native placements, never a measured real-world outcome.
export function periodTempo(period, palaces, key, quarterly = false) {
  if (period.status!=='ready') return { score:null, evidence:[] };
  const focus = palaces.findIndex(p=>p.name===key);
  if (focus<0) throw new Error('節奏宮位無效。');
  const weight = {祿:2,權:1,科:1,忌:-2}, evidence = [];
  for (const [scope,multiplier] of [['decadal',1],['yearly',2],...(quarterly?[['monthly',1]]:[])]) {
    if (scope==='decadal' && !period.decadal.active) continue;
    for (const activation of period[scope].activations) {
      const offset = (activation.index-focus+12)%12, relation = offset===0 ? 2 : [4,6,8].includes(offset) ? 1 : 0;
      if (relation) evidence.push({...activation, points:weight[activation.hua]*relation*multiplier});
    }
  }
  return {score:evidence.reduce((n,r)=>n+r.points,0),evidence};
}

