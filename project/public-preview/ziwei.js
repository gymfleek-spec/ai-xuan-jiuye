import { getBirthDateError } from './content.js?v=0.6.14';

const READING_TOPICS = {
  官祿: { label: '事業', hint: '我點做事', invite: '同一份工，有人鍾意帶頭，有人鍾意執好細節。你最享受邊一樣？我哋由官祿宮睇起。', lead: '諗返最近一次有人臨時搵你幫手，你最先答咗邊句？', question: '下次有人話「好趕」，你想即刻接手，定先問邊樣可以遲啲交？' },
  夫妻: { label: '愛情', hint: '我點同人相處', invite: '有句說話未諗好點開口？唔使講對方係邊個，我哋由夫妻宮睇親密關係入面嘅相處方式。', lead: '揀最近一次你想同對方講、最後又冇講出口嘅事，睇下邊段似當時嘅你。', question: '如果可以補返一句，邊句最接近你嗰刻真正想講嘅嘢？' },
  田宅: { label: '家庭', hint: '我想點樣安頓', invite: '返到屋企，邊件小事最令你覺得自在？由田宅宮講起，睇吓你重視點樣嘅生活空間。', lead: '由返到屋企嗰一刻諗起：邊件小事最令你放鬆，邊件你成日就住其他人？', question: '今晚返到屋企，有邊件小事你想照自己意思做一次？' },
  財帛: { label: '財運', hint: '我點用手上資源', invite: '有筆錢可以自己安排，你會留起，定用喺最在意嗰件事？由財帛宮睇你點分配資源。', lead: '試拎最近一筆你有猶豫過嘅開支做例，諗返落決定前你最在意乜。', question: '下次遇到同樣一筆數，你想保留咩預算，又想留幾多畀自己自由用？' },
  命宮: { label: '未來方向', hint: '我下一步想點行', invite: '眼前有幾條路，邊條值得先試一小步？我哋由命宮睇你慣常點揀，唔替你定去向。', lead: '諗一件你最近未揀定嘅事，對照下自己通常點樣踏出第一步。', question: '如果只試一個星期，邊一小步可以幫你睇清楚仲想唔想繼續？' }
};

// A scene is an invitation to compare with lived experience, not a finding about the visitor.
const STAR_READINGS = {
  紫微: { theme:'定方向',
    官祿:'開完會冇人拍板，你可能會先定一個方向，等大家有路行。留意散會之後，係咪連本來可以分出去嘅事都返到你手。',
    夫妻:'兩個人揀去邊，你可能習慣提早訂好位。係對方鍾意你安排，定係你哋一直冇問過大家想點？',
    田宅:'家人聚餐要夾時間，你可能好快就整好一張名單。試留一件事畀另一個人話事，睇下晚餐仲係咪一樣順。',
    財帛:'遇到一筆要一齊用嘅錢，你可能想先定好用途。留意最後個安排，有冇連提出唔同意見嘅人都照顧到。',
    命宮:'面前幾條路都行得，你可能最想揀嗰條可以自己話事嘅。諗清楚你想決定嘅係方向，定係連每個細節都要自己管。' },
  天機: { theme:'搵做法',
    官祿:'份工一轉要求，你可能好快諗到第二、第三個做法。如果草稿改咗幾次仲未交，可能差嘅唔係主意，而係一句「咁就夠」。',
    夫妻:'收到一個好短嘅回覆，腦入面可能即刻浮起幾種解釋。與其估邊個啱，不如問返對方嗰句想講乜。',
    田宅:'屋企有樣嘢唔順手，你可能即刻諗到點調位。不妨先問成日用嗰件嘢嘅人，最麻煩係邊一步。',
    財帛:'想買一樣嘢，你可能開幾頁慢慢比。若果越睇越難揀，返去睇最初想用佢解決邊個問題，未必需要再搵多十款。',
    命宮:'新線索一出現，你可能又想改計劃。留意今次係真係多咗重要資料，定純粹想等到再穩陣啲先開始。' },
  太陽: { theme:'主動幫一把',
    官祿:'有人卡住，你可能第一個行埋去幫。若果次次都幫到收工，不如先問佢係想你示範一次，定替佢做晒。',
    夫妻:'對方講今日好攰，你可能好快幫佢諗辦法。有時最啱用嘅幫忙，反而係問一句：「想我聽，定一齊諗？」',
    田宅:'屋企多嘢做，你可能唔出聲就執多兩手。留意呢個係今次自願幫手，定係大家已經當咗你會做。',
    財帛:'夾份送禮，你可能想出多啲等大家方便。落實之前對一對自己個數，慷慨同勉強唔一定要一齊出現。',
    命宮:'見到有人等你出手，件事可能突然變得好值得做。試想像冇人等你幫忙嗰日，你自己又最想做乜。' },
  武曲: { theme:'動手落實',
    官祿:'有人臨收工話「好急」，你可能已經覆咗「我嚟」，先發現原本嗰份都係今日交。你想幫手，同你手上仲有幾多時間，係兩件事。',
    夫妻:'屋企有嘢壞咗，你可能當晚就整好，當係一句關心。如果對方仲想傾耐啲，佢要嘅可能唔係另一個解決方法。',
    田宅:'屋企要執，你可能捲起衫袖就做，做到一半先發現得自己一個。不妨開頭就問清楚，邊個洗碗、邊個收枱。',
    財帛:'見到銀碼未對清，你可能寧願逐項計過先安心。睇返最近一筆，邊部分真係要計準，邊部分只要預個上限就夠？',
    命宮:'同坐低諗相比，你可能更鍾意落手試一次。若果揀唔落去，試分清楚：你係唔想行嗰條路，定只係唔知第一步做乜。' },
  天同: { theme:'留住舒服',
    官祿:'同事問你接唔接多件事，你可能怕大家尷尬，於是話「冇問題」。如果之後連午飯都要趕，嗰句答應仲合唔合你心意？',
    夫妻:'大家唔同意嗰陣，你可能會先講笑，等氣氛鬆一鬆。如果笑完仍然介意，遲啲搵個舒服嘅時候講返都得。',
    田宅:'屋企人問食乜，你可能順口講「是但」。一次半次係隨和；如果成個禮拜都冇食過自己想食嗰樣，今晚可以講一個菜名。',
    財帛:'忙完一日，買杯鍾意嘅飲品可能係你畀自己嘅休息。留意邊次真係享受，邊次其實只係想早十分鐘收工。',
    命宮:'有個做慣嘅選擇擺喺面前，舒服未必等於停滯。可以問吓自己：休息完，我仲想留喺度，定有件事想試？' },
  廉貞: { theme:'把界線講清楚',
    官祿:'兩個同事接同一類差事，規矩卻唔一樣，你可能會特別在意。講出邊一步唔一致，通常比估邊個偏幫邊個容易傾。',
    夫妻:'有句玩笑聽落唔舒服，你可能要過一陣先知自己介意乜。講返嗰句說話，比替對方定性更容易畀人聽得明。',
    田宅:'屋企人未問就入房，介意嘅可能唔係道門，而係可唔可以先敲一敲。講一條做得到嘅約定，大家先知道點尊重你。',
    財帛:'同朋友夾錢，份額明明唔大，你可能都想講清楚。你在意嘅未必係嗰幾蚊，而係大家用唔用同一個規矩。',
    命宮:'有條捷徑好快，但做法同你重視嘅嘢唔夾，你可能寧願慢啲。分清楚邊條線唔想過，其他條件就有得傾。' },
  天府: { theme:'留有餘地',
    官祿:'接新差事之前，你可能先望一望人手同日程。嗰下停頓唔一定係唔肯做，可能係想知邊個頂得住原有嗰攤。',
    夫妻:'關係入面，你可能鍾意有啲約定唔使次次再問，例如星期日一齊食飯。不妨間中問吓：大家仲係享受，定只係照做？',
    田宅:'櫃桶入面留定一份後備，可能令你住得踏實。今次執屋可以分開：邊樣真係會用，邊樣留低只因未諗好點處理。',
    財帛:'有筆新開支，你可能先留起日常要用嗰份，先諗剩低點用。睇返你留嘅餘額，有冇顧到一樣真心想做嘅事。',
    命宮:'揀一條新路之前，你可能想保留一個退路。若果退路已經喺度，下一個等緊嘅條件係必要，定係錦上添花？' },
  太陰: { theme:'留意細微變化',
    官祿:'開會時你可能留意到，有人本來想講嘢，最後冇出聲。散會私下問一句，會比替佢估原因實在。',
    夫妻:'對方今日覆少咗一句，你可能比平日更留神。先問「今日過成點？」可以畀對方講，亦唔使你自己估晒。',
    田宅:'返到屋企想靜一陣，你可能見大家忙，又起身幫手。如果係咁，試吓早少少講：「我想坐十分鐘，一陣再一齊執。」',
    財帛:'有啲開支細到唔覺眼，但加埋可能佔咗你原本想留低嗰份。試揀一個星期睇，唔使為每一蚊責怪自己。',
    命宮:'一個決定喺人多時聽落好合理，安靜落嚟，你可能有第二種感覺。不如記低令你遲疑嘅嗰個細節，再返去問清楚。' },
  貪狼: { theme:'試新嘢',
    官祿:'同事拋出新點子，你可能即刻想試，手上舊嗰件又唔想放低。如果兩件都開咗頭，邊件試完半個鐘，你仲想做落去？',
    夫妻:'一齊試新地方可能特別有話題；但冇節目嗰晚，又唔代表冇嘢可講。留意你掛住嘅係嗰次新鮮感，定係同邊個一齊。',
    田宅:'見到一個新佈置，你可能想即刻搬吓張枱。試擺一日，睇吓屋企人同自己用落順唔順手，先決定留唔留。',
    財帛:'打開購物籃，可能一眼中意咗幾樣。留到聽朝再望，邊樣你仲講得出會喺邊度用？',
    命宮:'同一晚報幾堂興趣班可能好過癮，但時間未必夠晒。不如先試一堂，留意完咗之後你仲想唔想返去。' },
  巨門: { theme:'問到明白',
    官祿:'收到一句「執靚啲」，你可能想追問到有個實例先開工。與其一路估，不如請對方揀一版，指畀你睇邊度未啱。',
    夫妻:'同一個字，兩個人可能聽出唔同意思。若果你哋兜咗幾個圈都傾唔埋，可以先問：「你講嘅係頭先嗰件事？」',
    田宅:'屋企傾分工，大家口中嘅「幫手」未必係同一樣嘢。不妨逐件講明係買餸、煮飯定洗碗，睇吓仲有冇爭拗。',
    財帛:'睇一張收據，如果銀碼同預期唔同，你可能會問個明白。逐項對返約定，唔使一開始就假設邊個計錯。',
    命宮:'聽到一個好肯定嘅建議，你可能反而多咗疑問。試揀出一條真係會改變你決定嘅問題，先搵嗰個答案。' },
  天相: { theme:'照顧分工',
    官祿:'兩邊要嘅嘢唔一樣，你可能自然做咗中間人。下次傳話前先問：呢個決定係咪應該由佢哋直接傾？',
    夫妻:'揀地方時，你可能好快就講得出對方鍾意乜。試喺嗰句之後加半句「我今日就想……」，兩個人先真係有得揀。',
    田宅:'想家人分工公平，你可能會睇邊個做多咗，卻冇計自己安排時間嗰份工。傾分工嗰陣，記得將呢件事都擺上枱。',
    財帛:'夾一餐飯，平均分最易計，未必人人都覺得公平。你可能想顧晒大家；最好落單前先問大家點分。',
    命宮:'大家有唔同意見時，你可能好快搵到一個人人接受嘅方法。留意嗰個方法入面，有冇計埋你自己想要嘅嘢。' },
  天梁: { theme:'照顧與承擔',
    官祿:'新人問多兩句，你可能索性代佢做埋。若果想佢下次自己識做，今次有邊一步可以留返畀佢試？',
    夫妻:'見到對方為難，你可能第一時間想替佢擋開。問清楚佢想你陪住定幫手決定，可以少一份好心做多咗。',
    田宅:'家人一遇到麻煩就搵你，你可能慣咗先接電話再諗自己得唔得閒。今次可以先講你做到邊一步，唔使一口應承到底。',
    財帛:'有人開口想你幫補，你可能先諗對方點算。答之前留一晚，睇清你願意幫幾多，同自己實際負擔到幾多。',
    命宮:'諗下一步時，你可能由「邊個需要我」開始。試將「我想點過呢一日」都寫低，兩樣可以有唔同答案。' },
  七殺: { theme:'當機立斷',
    官祿:'限期逼近，你可能寧願先落一個決定，好過成班人繼續等。開工前確認邊步可以改、邊步改唔返，快得嚟會踏實啲。',
    夫妻:'一有分歧，你可能想即晚講出個決定；對方可能仲未諗好。不如約實幾時再傾，停一停唔等於避開。',
    田宅:'屋企一亂，你可能即刻清走一批嘢。揀走自己嗰份可以好爽快；到共用嘅物件，問多一聲先落手。',
    財帛:'見到限時優惠，你可能想即刻拍板。試問自己：如果冇個倒數，我仲會唔會覺得呢樣嘢值得？',
    命宮:'一條路行唔通，你可能寧願轉彎，都唔想原地等。諗一個最細、改得返嘅決定先試，唔使今日押晒落去。' },
  破軍: { theme:'試另一套做法',
    官祿:'舊表格越填越慢，你可能想索性重做。先揀最阻時間嗰一欄改，試完先知要唔要成份換晒。',
    夫妻:'同一件事又拗撬，你可能想徹底換個相處方式。不如先改一個開場白，睇下今次係咪傾到平時傾唔到嘅嘢。',
    田宅:'如果一返屋企就喺門口搵鎖匙，你可能想成個玄關重新執過。今個星期先換個放鎖匙嘅位，用得順先再郁其他。',
    財帛:'一個月超咗預算，你可能想將成套計法推倒重來。先搵出最唔合用嗰一項，其他幫到手嘅做法唔使一齊掉。',
    命宮:'想重新開始嗰陣，成套換晒可能最有感覺。試講得出邊一樣真係唔再啱用，亦講一樣你想帶埋行落去嘅嘢。' }
};

const BRANCHES = [...'子丑寅卯辰巳午未申酉戌亥'];
const OPPOSITE = { 官祿:'夫妻', 夫妻:'官祿', 田宅:'子女', 財帛:'福德', 命宮:'遷移' };
const palaceTitle = name => name.endsWith('宮') ? name : name + '宮';

function readStars(palace, topic) {
  const list = palace?.majorStars;
  if (!Array.isArray(list) || list.some(s => !s || typeof s.name !== 'string' || typeof s.type !== 'string')) return null;
  const stars = list.filter(s => s.type === 'major');
  if (stars.length > 2 || new Set(stars.map(s => s.name)).size !== stars.length || stars.some(s => !Object.hasOwn(STAR_READINGS, s.name))) return null;
  return stars.map(({ name }) => ({ name, theme: STAR_READINGS[name].theme, behaviour: STAR_READINGS[name][topic] }));
}

export function getPalaceReading(chart, name) {
  if (chart?.status !== 'ready' || !Object.hasOwn(READING_TOPICS, name) || !Array.isArray(chart.palaces) || chart.palaces.length !== 12) return null;
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
    label: READING_TOPICS[name].label, lead: READING_TOPICS[name].lead, question: READING_TOPICS[name].question,
    palace: name, branch: palace.earthlyBranch, stars, opposite
  };
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
  const rules = '<details class="ziwei-rules"><summary>排盤方式</summary><p>採用西曆及出生地當地鐘錶時間，不校正夏令時間或真太陽時。23:00起按翌日排盤；閏月初一至十五按前月，十六日起按後月。呢張係本命盤，不作大限、流年或吉凶預言。</p></details>';

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
    paint(`<h2 id="dialog-title">玄</h2><p class="speech" id="desk-question">係咪有問題想問我？</p><div class="desk-replies"><button class="button primary" type="button" data-ziwei="greet" data-reply="yes">有呀，想傾吓。</button><button class="button secondary" type="button" data-ziwei="greet" data-reply="curious">你係邊位？</button></div>`, 'entrance');
  }
  function showChoice(reply) {
    const hello = reply === 'curious' ? '我係玄，呢位係九爺。' : reply === 'yes' ? '好呀。' : '';
    paint(`<p class="desk-speaker">玄</p><h2 id="dialog-title">${hello}想由邊方面睇起？</h2><div class="desk-topics">${Object.entries(READING_TOPICS).map(([palace, topic]) => `<button class="option" type="button" data-ziwei="focus" data-palace="${palace}"><strong>${topic.label}</strong><span>${topic.hint}</span></button>`).join('')}</div>`, 'interaction');
  }
  function showResponse() {
    const topic = READING_TOPICS[focusPalace];
    paint(`<h2 id="dialog-title">九爺 · ${topic.label}</h2><p class="speech">${topic.invite}</p><p class="desk-note">用虛構出生資料，免費睇十二宮。</p><div class="dialog-actions">${action('免費試排紫微盤', 'skip')}${action('返去揀話題', 'choose-focus', 'secondary')}</div>`, 'response');
  }
  function showReveal() {
    paint(`<h2 id="dialog-title">十二宮命盤排好喇。</h2><div class="dialog-actions">${action('睇命盤', 'view-result')}</div><button class="dialog-back" type="button" data-ziwei="edit-options">修改資料</button>`, 'reveal');
  }
  function showDate() {
    chart = reviewed = null;
    paint(`${label}<h2 id="dialog-title">例子入面嘅人，邊日出世？</h2><p class="dialog-lead">填一個虛構嘅西曆出生日期。</p><form id="ziwei-date-form" autocomplete="off" novalidate><div class="birth-fields"><label for="ziwei-year">年<input id="ziwei-year" data-ziwei-field="year" type="text" inputmode="numeric" placeholder="YYYY" required></label><label for="ziwei-month">月<input id="ziwei-month" data-ziwei-field="month" type="text" inputmode="numeric" placeholder="MM" required></label><label for="ziwei-day">日<input id="ziwei-day" data-ziwei-field="day" type="text" inputmode="numeric" placeholder="DD" required></label></div>${privacy}<p id="ziwei-error" class="form-error" role="alert"></p><div class="dialog-actions"><button class="button primary" type="submit">填出生時間</button></div></form><button class="dialog-back" type="button" data-ziwei="back-intro">返去揀主題</button>`, 'ziwei-date');
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
    paint(`${label}<h2 id="dialog-title">資料啱嗎？</h2><dl class="visit-review" id="ziwei-review"></dl><p id="ziwei-error" class="form-error" role="alert"></p><div class="dialog-actions">${action('啱，免費排盤', 'calculate')}${action('修改資料', 'edit-options', 'secondary')}</div>`, 'ziwei-review');
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
    content.querySelectorAll('[data-ziwei="palace"]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.palace === name)));
    if (!reading) { note.append(text('p', '呢格嘅星曜資料唔齊，可以打開下面嘅十二宮，或者返去核對出生資料。')); return; }
    const { stars, opposite } = reading;
    const visibleStars = opposite ? opposite.stars : stars;
    const names = visibleStars.map(s => s.name).join('、');
    const fact = palaceTitle(reading.palace) + '喺' + reading.branch + '位，' + (opposite
      ? '本宮無十四主星。借對宮' + palaceTitle(opposite.palace) + '（' + opposite.branch + '位）嘅' + names + '嚟參看。'
      : '本宮主星係' + names + '。');
    note.append(text('h3', '玄 · ' + reading.label), text('p', fact, 'reading-fact'), text('p', reading.lead));
    for (const star of visibleStars) {
      const section = document.createElement('section'); section.className = 'reading-star';
      section.append(text('h4', star.name + ' · ' + star.theme), text('p', star.behaviour)); note.append(section);
    }
    note.append(text('p', '九爺：' + reading.question));
    const evidence = document.createElement('details'); evidence.className = 'reading-evidence';
    evidence.append(text('summary', '解讀依據'), text('p', opposite
      ? '本宮冇主星，傳統紫微斗數會參考正對面嗰一宮。借嚟睇嘅星仍然喺對宮，唔會搬入本宮。'
      : '呢度讀嘅係本宮主星。兩粒星可以有唔同取向，唔代表你每次都會兩樣一齊做。'),
      text('p', '星曜係傳統象徵。近況啱唔啱，由你用生活經驗對照；一粒星唔足以判定發生過咩事。'));
    note.append(evidence);
  }
  function showResult() {
    if (chart.status === 'needs-input') {
      paint(`${label}<h2 id="dialog-title">資料未足，先唔落盤。</h2><p class="dialog-lead">出生時間同排盤參數齊咗，再返嚟排盤。</p><div class="dialog-actions">${action('返回資料', 'edit-options')}</div>${privacy}`, 'ziwei');
      return;
    }
    paint(`${label}<h2 id="dialog-title">十二宮命盤</h2><p class="dialog-lead">先由「${READING_TOPICS[focusPalace].label}」睇起。想睇全盤，可以打開下面嘅十二宮。</p><p id="ziwei-result-context" class="reading-fact"></p><div class="ziwei-reading" id="ziwei-reading"></div><div class="dialog-actions palace-switches">${Object.entries(READING_TOPICS).map(([name, topic]) => `<button class="button secondary" type="button" data-ziwei="palace" data-palace="${name}" aria-pressed="false">${topic.label}</button>`).join('')}</div><section id="ziwei-palace-note" aria-live="polite" aria-atomic="true"></section><details class="ziwei-chart-details"><summary>打開十二宮命盤</summary><div class="ziwei-scroll" tabindex="0" role="region" aria-label="十二宮命盤，窄螢幕可左右捲動"><div class="ziwei-grid" id="ziwei-grid"></div></div></details>${rules}<p class="privacy-note">只作傳統文化參考，不作健康、投資或人生決定依據。未提供流年、大限或完整論命。</p><div class="dialog-actions">${action('修改資料', 'edit-options')}</div>${privacy}`, 'ziwei-result');
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
      const error = getBirthDateError(input) || (Number(input.year) < 1900 || Number(input.year) > 2099 ? { field: 'year', message: '請填1900至2099年之間嘅西曆出生日期。' } : null);
      if (error) errorMessage(error); else showOptions();
    } else {
      const error = getZiweiError(input);
      if (error) errorMessage(error); else showReview();
    }
  }, true);
  content.addEventListener('click', event => {
    const trigger = event.target.closest('button[data-ziwei]');
    if (!active || !trigger || content.inert) return;
    const name = trigger.dataset.ziwei;
    if (name === 'greet' && ['curious', 'yes'].includes(trigger.dataset.reply)) showChoice(trigger.dataset.reply);
    if (name === 'choose-focus') showChoice();
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
