import { getPalaceReading, readingFact, palaceTitle, READING_TOPICS, periodTempo } from './chart.mjs';
import { bookFromChart } from './book.mjs';
import { HUA_COPY, RELATING_COPY } from './empathy-copy.mjs';

export function resultFromChart(chart, subject) {
  const book = bookFromChart(chart), readings = chart.palaces.map(p => getPalaceReading(chart, p.name));
  if (readings.length !== 12 || readings.some(r => !r)) throw new Error('十二宮資料未能核對，請返回出生資料。');
  return { chart, book, readings, selected: book.chapters.find(c => c.label === subject)?.key || '命宮' };
}

export function attachResult(report) {
  const find = id => report.querySelector('#' + id);
  const node = (tag, value, cls) => {
    const el = document.createElement(tag); el.textContent = value;
    if (cls) el.className = cls;
    return el;
  };
  const put = (id, value) => { find(id).textContent = value; };
  const positions = { 寅:[4,1], 卯:[3,1], 辰:[2,1], 巳:[1,1], 午:[1,2], 未:[1,3], 申:[1,4], 酉:[2,4], 戌:[3,4], 亥:[4,4], 子:[4,3], 丑:[4,2] };
  const prices = { full:[388,240,148], single:[228,140,88] };
  let current = null, name = '', canOffer = false, activeTopic = '', purchaseTopic = '', safeReply = '', plan = 'full';
  const chapterFor = key => current?.book.chapters.find(c => c.key === key);
  function pricing(key) {
    plan = key;
    const [original, discount, total] = prices[key];
    put('price-original', 'HK$' + original); put('price-discount', '-HK$' + discount);
    for (const id of ['price-final','cta-price','purchase-price']) put(id, 'HK$' + total);
    put('purchase-plan', key === 'full' ? '全盤三年命書' : (chapterFor(purchaseTopic || activeTopic)?.label || '') + '・單題拆局書');
    for (const sku of ['full','single']) find('sku-' + sku).setAttribute('aria-pressed', String(sku === key));
  }
  function openPurchase(sku = plan, key = purchaseTopic || activeTopic) {
    if (!current || !canOffer) return;
    purchaseTopic = key; pricing(sku); find('purchase-dialog').showModal();
  }
  for (const key of ['full','single']) find('sku-' + key).addEventListener('click', () => {
    if (current && canOffer) pricing(key);
  });
  find('purchase-cta').addEventListener('click', () => openPurchase());
  find('close-purchase').addEventListener('click', () => find('purchase-dialog').close());
  function teaser(title, lines, key, full = false) {
    const card = node('section', '', 'teaser-card'); card.dataset.topic = key;
    card.append(node('h3', title), ...lines.map(line => node('p', line, 'teaser-intro')));
    // Decorative marks only: neither DOM nor the accessibility tree contains a hidden paid chapter.
    const tail = node('div', '', 'teaser-fade'); tail.setAttribute('aria-hidden','true'); tail.setAttribute('inert','');
    for (let i = 0; i < 3; i++) tail.append(node('span', '────────　──────'));
    card.append(tail);
    if (canOffer) {
      const button = node('button', full ? '全盤三年命書・HK$148' : '單題拆局書・HK$88', 'teaser-cta');
      button.type = 'button'; button.setAttribute('aria-label',title+'・'+button.textContent); button.addEventListener('click', () => openPurchase(full ? 'full' : 'single', key)); card.append(button);
    }
    return card;
  }
  function basis(chapter) {
    const { timing, mutagens } = current.book;
    const parts = [chapter.fact + (chapter.borrow ? ' 借星仍然喺對宮，唔會搬入本宮。' : '')];
    parts.push('本命四化：' + mutagens.map(r => r.star + '化' + r.hua + '在' + palaceTitle(r.palace) + '（' + r.branch + '）').join('；') + '。');
    const now = timing.current;
    parts.push('以香港日期 ' + timing.asOf + ' 查目前運限。' + (now.status === 'ready' ? now.decadal.active ? '目前大限為' + now.decadal.range.join('–') + '虛歲，落本命' + palaceTitle(now.decadal.natalPalace) + '。' : '目前仍在童限，未套用十年大限。' : '目前超出引擎十年大限範圍。'));
    for (const year of timing.annual) {
      if (year.status !== 'ready') { parts.push(year.year + '：' + (year.status === 'before-birth' ? '出生前，不排運限。' : '超出運限範圍。')); continue; }
      const h = year.yearly;
      parts.push(year.year + '（' + h.stem + h.branch + '，取' + year.date + '）：' + (year.decadal.active ? '大限' + year.decadal.range.join('–') + '虛歲；' : '童限；') + h.activations.map(r => r.star + '化' + r.hua + '落本命' + palaceTitle(r.palace) + '／流年' + palaceTitle(r.flowPalace)).join('；') + '。');
    }
    parts.push('曲線用同一張盤嘅四化落點整理相對節奏（tempo-v1），唔係回報率或事件機率：祿+2、權+1、科+1、忌−2；落本題宮×2、三方及對宮×1、其餘×0。大限×1、流年×2；逐季另加流月×1。未到大限起歲唔計大限。每年7月1日取年度值；每季3／6／9／12月15日各自查流月，唔將年度值複製四次。曲線同高低點只比較呢三年，分數相同就並列。');
    parts.push('按所填當地鐘錶時間，未校真太陽時；採農曆年界，所以1月1日未必已轉流年。');
    put('basis-detail', parts.join('\n\n'));
  }
  function topic(key) {
    const chapter = chapterFor(key); if (!chapter) return;
    activeTopic = key; purchaseTopic = key; find('topic-select').value = key;
    put('pattern-badge', current.book.element + ' · ' + chapter.source);
    put('empathy-headline', name + '，由' + chapter.label + '開始，一件一件慢慢拆。');
    const free = key === current.selected;
    find('empathy-body').replaceChildren(...(free
      ? [chapter.lens, chapter.people, chapter.other, chapter.resource].map(v => node('p', v))
      : [teaser(chapter.label + '・另一半慢慢拆', chapter.teaser, key)]));
    put('jiuye-quote', !canOffer ? safeReply : free ? chapter.question + ' 可以試吓講：' + chapter.line : READING_TOPICS[key].question);
    find('resonance').hidden = !free;
    find('resonance').setAttribute('aria-pressed','false'); put('resonance','呢句講中咗 ✦');
    basis(chapter); find('basis').open = false; pricing(plan); palace(key);
  }
  function palace(key) {
    const reading = current?.readings.find(r => r.palace === key); if (!reading) return;
    for (const button of find('result-grid').querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.palace === key));
    const raw = current.chart.palaces.find(p => p.name === key), stars = reading.opposite ? reading.opposite.stars : reading.stars;
    const detail = find('palace-detail');
    detail.replaceChildren(node('h3','玄 · ' + palaceTitle(key)), node('p',readingFact(reading),'source'), node('p','參看主星：' + stars.map(s => s.name + '・' + s.theme).join('、')));
    const hua = current.book.mutagens.filter(r => r.palace === key);
    detail.append(node('p', hua.length ? '本命四化：' + hua.map(r => r.star + '化' + r.hua).join('、') : '呢一宮冇本命四化落點。', 'jade-copy'));
    detail.append(node('p',raw.heavenlyStem + raw.earthlyBranch + (reading.opposite ? '；借星只供參看，四化仍留原宮。' : '；星曜按本宮位置顯示。'),'micro'));
  }
  function paintTiming() {
    const { timing } = current.book, palaces = current.chart.palaces;
    const wealth = timing.annual.map(p => periodTempo(p,palaces,'財帛').score), career = timing.annual.map(p => periodTempo(p,palaces,'官祿').score);
    const extent = Math.max(1,...wealth.concat(career).filter(v => v !== null).map(Math.abs));
    for (const [id, values] of [['wealth-line',wealth],['career-line',career]]) {
      let connected = false;
      const d = values.map((value,i) => {
        if (value === null) { connected = false; return ''; }
        const point = (connected ? 'L' : 'M') + (12 + i*148) + ' ' + (75 - value/extent*48).toFixed(2); connected = true; return point;
      }).join(' ');
      find(id).setAttribute('d',d);
    }
    find('tempo-curve').setAttribute('aria-label', '三年盤面相對節奏。' + timing.annual.map((p,i) => p.year + '年財運' + (wealth[i] ?? '不適用') + '，事業' + (career[i] ?? '不適用')).join('；'));
    const valid = wealth.filter(v => v !== null), max = Math.max(...valid), min = Math.min(...valid);
    const years = value => timing.annual.filter((p,i) => wealth[i] !== null && wealth[i] === value).map(p => p.year).join('／');
    put('curve-high', !valid.length ? '三年唔在可排運限內，先照顧眼前。' : max === min ? '三年節奏相近・先重新看清自己嘅籌碼。' : years(max) + '・先睇清手上嘅長處，再諗下一步。');
    put('curve-low', !valid.length ? '留低心力，按眼前需要行。' : max === min ? '唔使追高低・留空間，慢慢行。' : years(min) + '・先留空間，再算人情。');
    const validCareer=career.filter(v=>v!==null), careerHigh=Math.max(...validCareer);
    put('turn-year',validCareer.length && new Set(validCareer).size>1 ? timing.annual.filter((p,i)=>career[i]===careerHigh).map(p=>p.year).join('／') : '2026–2028');
    const now = timing.current;
    put('decadal-label', now.status === 'ready' ? now.decadal.active ? '目前十年大限：' + now.decadal.range.join('–') + '虛歲・' + palaceTitle(now.decadal.natalPalace) : '目前童限・先讀本命與流年節奏' : '本命仍可讀・目前超出十年大限範圍');
    const cards = timing.quarters.map(p => {
      if (p.status !== 'ready') return teaser(p.year + '・第' + p.quarter + '季', ['呢一季' + (p.status === 'before-birth' ? '仍在出生之前。' : '超出引擎運限範圍。'),'先由眼前能做嘅一小步開始。'],current.selected,true);
      const ji = p.monthly.activations.find(r => r.hua === '忌'), lu = p.monthly.activations.find(r => r.hua === '祿');
      return teaser(p.year + '・第' + p.quarter + '季', [p.monthly.stem + p.monthly.branch + '流月，' + lu.star + '化祿落本命' + palaceTitle(lu.palace) + '，可以先望一望手上已有嘅資源。',ji.star + '化忌落本命' + palaceTitle(ji.palace) + '，有邊份用力可以慢半拍？'],current.selected,true);
    });
    find('quarter-previews').replaceChildren(...cards);
  }
  function paintRelating() {
    const { stars, theme, ji, lu } = chapterFor('夫妻');
    // Show both stars in the basis; when paired, use the companion for the two reflection prompts.
    const clues = [stars.join('、') + '・' + theme, ...RELATING_COPY[stars.at(-1)], HUA_COPY[ji.star].space, HUA_COPY[lu.star].evening];
    clues.forEach((value,i) => put('fate-' + i,value));
  }
  find('topic-select').addEventListener('change', e => topic(e.target.value));
  find('resonance').addEventListener('click', () => {
    if (!current || activeTopic !== current.selected) return;
    const pressed = find('resonance').getAttribute('aria-pressed') !== 'true';
    find('resonance').setAttribute('aria-pressed',String(pressed)); put('resonance',pressed ? '留低呢句，再慢慢諗 ✦' : '呢句講中咗 ✦');
  });
  return {
    show({chart,alias,subject,offer = true,reply = ''}) {
      current = resultFromChart(chart,subject); name = alias; canOffer = offer; safeReply = reply || '今晚唔使急住作決定。可以先同自己講：「我想留返空間，照顧好自己。」'; activeTopic = current.selected;
      find('purchase-cta').hidden = !canOffer; pricing('full');
      for (const el of report.querySelectorAll('.js-user-name')) el.textContent = alias;
      const grid = find('result-grid'); grid.replaceChildren();
      for (const p of chart.palaces) {
        const button = node('button','','palace-cell'); button.type = 'button'; button.dataset.palace = p.name;
        [button.style.gridRow,button.style.gridColumn] = positions[p.earthlyBranch];
        button.append(node('strong',palaceTitle(p.name)),node('span',p.heavenlyStem + p.earthlyBranch + (p.isBodyPalace ? ' · 身宮' : '')));
        button.append(node('span',p.majorStars.filter(s => s.type === 'major').map(s => s.name).join('、') || '本宮無十四主星','gold-copy'));
        const hua = current.book.mutagens.filter(r => r.palace === p.name);
        if (hua.length) button.append(node('small',hua.map(r => r.star + '化' + r.hua).join('、'),'jade-copy'));
        button.setAttribute('aria-label','睇' + palaceTitle(p.name) + '，' + p.earthlyBranch + '位');
        button.addEventListener('click',() => palace(p.name)); grid.append(button);
      }
      const center = node('div','','palace-center'); center.append(node('strong','紫微斗數'),node('span',current.book.element),node('span','本命十二宮')); grid.append(center);
      topic(current.selected); paintTiming(); paintRelating();
      find('chapter-previews').replaceChildren(...current.book.chapters.map(c => teaser(c.label + (c.key === current.selected ? '・由呢一題開始' : '・再行深一步'),c.teaser,c.key)));
      const selected = chapterFor(current.selected);
      find('action-previews').replaceChildren(teaser('穩陣・留力先行',selected.steady,current.selected),teaser('破局・試出新路',selected.breakthrough,current.selected));
      find('chart-details').open = find('topic-menu').open = false;
    },
    clear() {
      if (find('purchase-dialog').open) find('purchase-dialog').close();
      current = null; name = safeReply = ''; canOffer = false; activeTopic = purchaseTopic = '';
      find('purchase-cta').hidden = true; pricing('full');
      for (const id of ['pattern-badge','empathy-headline','empathy-body','jiuye-quote','basis-detail','result-grid','palace-detail','chapter-previews','action-previews','quarter-previews','decadal-label','curve-high','curve-low','turn-year',...Array.from({length:5},(_,i) => 'fate-' + i)]) find(id).replaceChildren();
      for (const id of ['wealth-line','career-line']) find(id).setAttribute('d','');
      for (const el of report.querySelectorAll('.js-user-name')) el.textContent = '';
      find('basis').open = find('chart-details').open = find('topic-menu').open = false;
      find('topic-select').value = '命宮'; find('resonance').setAttribute('aria-pressed','false'); put('resonance','呢句講中咗 ✦');
    }
  };
}
