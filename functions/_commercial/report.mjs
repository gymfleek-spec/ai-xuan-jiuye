import { bookFromChart } from '../../project/scroll/book.mjs';
import { palaceTitle, periodTempo } from '../../project/scroll/chart.mjs';
import { PAID_STAR_DEPTH, PAID_HUA_DEPTH, TOPIC_DEEP_FRAME, YEARLY_TEMPO_COPY, EMPTY_PALACE_NOTE, PAID_JIUYE_CLOSINGS, buildDeliveryEmail } from './paid-copy.mjs';

export const REPORT_TOPICS = Object.freeze({career:'官祿',love:'夫妻',family:'田宅',wealth:'財帛',direction:'命宮'});
export const PLANS = Object.freeze({
  xuan_single_v1:{name:'單題拆局書',amount:8800,full:false},
  xuan_full_3yr_v1:{name:'全盤三年命書',amount:14800,full:true}
});

const markHua=r=>r.star+'化'+r.hua+'喺'+palaceTitle(r.palace);
const noteHua=r=>markHua(r)+'。'+(PAID_HUA_DEPTH[r.star]?.[r.hua]||'可以用呢個落點做一條提問，唔使當成定論。');
function starReading(chapter){
  const stars=chapter.stars.map(star=>{
    const {talentDepth,frictionDepth}=PAID_STAR_DEPTH[star];
    return star+'｜'+talentDepth+' 對照一下：'+frictionDepth;
  });
  return [chapter.label+'｜'+TOPIC_DEEP_FRAME[chapter.key].ch1Lead,chapter.fact,...(chapter.borrow?[EMPTY_PALACE_NOTE]:[]),...stars,
    ...(stars.length>1?['兩粒星分開睇：揀一件最近攰完又覺得值得嘅事，邊一種出力方式先似你？未必要兩種都中。']:[])];
}
function yearReading(chapter,periods,palaces){
  const scored=periods.map(p=>({p,...periodTempo(p,palaces,chapter.key)})).filter(v=>v.score!==null);
  if(!scored.length)return [chapter.label+'｜'+YEARLY_TEMPO_COPY.childhoodOrLimited()];
  const max=Math.max(...scored.map(v=>v.score)), min=Math.min(...scored.map(v=>v.score));
  const years=score=>scored.filter(v=>v.score===score).map(v=>v.p.year).join('、')+' 年';
  const lead = max===min?[YEARLY_TEMPO_COPY.balanced()]:[YEARLY_TEMPO_COPY.peak(years(max)),YEARLY_TEMPO_COPY.rest(years(min))];
  return [chapter.label+'｜'+lead[0],...lead.slice(1),...(scored.length<periods.length||scored.some(v=>!v.p.decadal.active)?[YEARLY_TEMPO_COPY.childhoodOrLimited()]:[])];
}
function quarterReading(chapter,periods,palaces){
  return periods.map(q=>{
    const prefix=q.year+' 年第 '+q.quarter+' 季｜';
    const tempo=periodTempo(q,palaces,chapter.key,true);
    if(tempo.score===null)return prefix+'呢季未有可核對嘅運限，唔套入推算。';
    const emphasis=tempo.evidence.filter(r=>tempo.score===0||Math.sign(r.points)===Math.sign(tempo.score))
      .sort((a,b)=>Math.abs(b.points)-Math.abs(a.points))[0];
    const detail=emphasis ? markHua(emphasis)+'；' : '';
    return prefix+detail+(tempo.score<0?'先將未核實同已答應嘅事分開，唔使急住加碼。':tempo.score>0?'擺一件準備好嘅事上枱試一次，見到回應再續。':'照住行得通嘅步伐，留一格畀臨時調整。');
  });
}
const nextLine=c=>{
  const copy=TOPIC_DEEP_FRAME[c.key];
  return [c.label+'｜'+copy.ch3Heading,copy.ch3Lead,...c.stars.map(star=>star+'・'+PAID_STAR_DEPTH[star].relationalAngle)];
};
const paths=c=>{
  const {steadyRoute,breakthroughRoute}=TOPIC_DEEP_FRAME[c.key];
  return [c.label+'｜試行兩條路','穩陣・'+steadyRoute.join(' '),'破局・'+breakthroughRoute.join(' ')];
};

export function makePaidSections(chart,topic,sku) {
  const key=REPORT_TOPICS[topic], plan=PLANS[sku], book=bookFromChart(chart);
  const focus=book.chapters.find(c=>c.key===key);
  if (!focus || !plan) throw new Error('Unknown report scope');
  const selected=plan.full?[focus,...book.chapters.filter(c=>c.key!==key)]:[focus];
  const yearly=selected.flatMap(c=>yearReading(c,book.timing.annual,chart.palaces));
  const timeline=quarterReading(focus,book.timing.quarters,chart.palaces);
  const support=book.mutagens.filter(r=>['祿','科'].includes(r.hua)&&plan.full);
  const mutagens=plan.full?book.mutagens:[focus.ji,focus.lu];
  return [
    {key:'ch1',title:'第一章・本命內耗與天賦',paragraphs:[
      book.element+'｜由'+focus.label+'入卷。呢度嘅星曜講一種可以對照嘅處事方式，唔係替你定性。',
      ...selected.flatMap(starReading),...mutagens.map(noteHua)
    ]},
    {key:'ch2',title:'第二章・2026–2028 流年與節奏轉折',paragraphs:[
      '同一張盤嘅相對節奏用嚟提問，唔係回報率、事件機率，亦唔係投資建議。',
      ...yearly,focus.label+'｜三年逐季對照',...timeline,
      '揀一節最似眼前嘅狀況，寫低一件已知、一件待核對，同一個可以撤回嘅小步。'
    ]},
    {key:'ch3',title:'第三章・緣分、貴人與相處磁場',paragraphs:[
      '唔由盤推斷邊個會出現。先睇隔籬嗰個人肯唔肯講清楚界線，同埋有冇照講嘅去做。',
      ...selected.flatMap(nextLine),
      ...support.map(r=>markHua(r)+'｜作為相處對照，可以留意清楚交接同主動問一問點幫手，有冇令彼此少啲靠估。'),
      '九爺想問：你係想有人聽你講完，定係想搵個人一齊接住下一步？'
    ]},
    {key:'ch4',title:'第四章・穩陣同破局，兩條可試嘅路',paragraphs:[
      ...selected.flatMap(paths),
      '回看嗰日，分清楚邊件事真係變咗、邊樣係自己估多咗，再決定留低定調整。',
      plan.full?PAID_JIUYE_CLOSINGS.xuan_full_3yr_v1:PAID_JIUYE_CLOSINGS.xuan_single_v1(focus.label)
    ]}
  ];
}

export function deliveryMessage(sku,reportUrl){
  return buildDeliveryEmail({sku,reportUrl});
}
