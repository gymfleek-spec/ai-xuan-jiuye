import { calculateZiwei, getPalaceReading, palaceTitle, readingFact } from './chart.mjs';
import { STAR_COPY, HUA_COPY, TOPIC_COPY } from './empathy-copy.mjs';

export const EXAMPLE = Object.freeze({year:'1995', month:'08', day:'15', time:'19:30', gender:'male', precision:'exact', place:''});
export const ORDER = Object.freeze(['官祿','夫妻','田宅','財帛','命宮']);

export function makeBook(input, engine, options) {
  return bookFromChart(calculateZiwei(input,engine,options));
}
export function bookFromChart(chart) {
  if (chart.status!=='ready') throw new Error('資料未齊，先唔會代估時辰。');
  const ji=chart.mutagens?.find(r=>r.hua==='忌'), lu=chart.mutagens?.find(r=>r.hua==='祿');
  if (!ji || !lu || !HUA_COPY[ji.star] || !HUA_COPY[lu.star] || !chart.timing) throw new Error('未能核對四化與運限，請重新起盤。');
  const chapters=ORDER.map(key=>{
    const r=getPalaceReading(chart,key);
    if(!r) throw new Error('未能核對五篇嘅宮位，今次唔會顯示不完整嘅解讀。');
    const stars=r.opposite?r.opposite.stars:r.stars, [a]=stars, copy=STAR_COPY[a.name][key];
    const names=stars.map(s=>s.name).join('、');
    const source=palaceTitle(key)+'・'+r.branch+'位 ／ '+(r.opposite?'借'+palaceTitle(r.opposite.palace)+'・'+r.opposite.branch+'位':'本宮主星')+' ／ '+names;
    const strain='本命'+ji.star+'化忌落喺'+palaceTitle(ji.palace)+'：'+HUA_COPY[ji.star].strain;
    const resource='本命'+lu.star+'化祿喺'+palaceTitle(lu.palace)+'：'+HUA_COPY[lu.star].resource;
    return {key,label:r.label,source,fact:readingFact(r),stars:stars.map(s=>s.name),theme:a.theme,
      lens:copy.receive,people:copy.release,other:strain,
      resource,question:copy.question,line:copy.line,borrow:r.opposite!==null,ji,lu,
      teaser:[copy.receive, a.name+'嘅「'+a.theme+'」，點樣由用力變成留有餘地，係呢一章想陪你拆嘅另一半。'],
      steady:[a.name+'嘅「'+a.theme+'」可以咁樣留力：'+TOPIC_COPY[key].steady[0],TOPIC_COPY[key].steady[1]],breakthrough:[a.name+'嘅「'+a.theme+'」亦可以試另一條路：'+TOPIC_COPY[key].breakthrough[0],TOPIC_COPY[key].breakthrough[1]]};
  });
  const career=chapters[0],direction=chapters[4];
  const sample={head:'唔使一晚改晒，先揀一小步。',basis:career.fact+'對照命宮再睇：'+direction.fact,
    first:'按'+career.stars[0]+'嘅角度，'+career.steady.join(''),second:career.breakthrough.join(''),take:direction.line};
  return {chapters,sample,element:chart.fiveElementsClass,timing:chart.timing,mutagens:chart.mutagens};
}

export function bookPreviews(book, key) {
  const selected = book.chapters.find(c => c.key === key);
  const people = book.chapters.find(c => c.key === '夫妻');
  const { quarters, asOf } = book.timing;
  const ready = quarters.filter(p => p.status === 'ready');
  const quarter = ready.find(p => p.date >= asOf) ?? ready.at(-1);
  const lu = quarter?.monthly.activations.find(r => r.hua === '祿');
  return [
    {title:'第一章：本命內耗與天賦',lines:['由'+selected.label+'出發，睇清'+selected.stars[0]+'嘅「'+selected.theme+'」幾時幫到你，幾時令你用多咗力。']},
    {title:'第二章：2026–2028 財運與轉折',lines:[lu
      ? quarter.year+'年第'+quarter.quarter+'季嘅盤面引子：'+lu.star+'化祿落本命'+palaceTitle(lu.palace)+'，先睇清楚手上已有嘅資源。'
      : '呢三年未有可排嘅運限，先睇眼前有咩資源可以用。']},
    {title:'第三章：緣分與貴人磁場',lines:['由'+people.stars.join('、')+'嘅「'+people.theme+'」，諗一諗邊種相處令你自在，邊種幫忙你先接得住。']},
    {title:'第四章：穩陣 vs 破局雙選擇',lines:['穩陣｜'+selected.steady[1],'破局｜'+selected.breakthrough[1]]}
  ];
}
