import { pollReport } from '../customer.js';

const reportNode=id=>document.getElementById(id);
const reportToken=location.pathname.match(/^\/r\/([a-f0-9]{32})\/?$/)?.[1];
const reportContent=reportNode('report-content'), reportStatus=reportNode('report-status');
const reportRetry=reportNode('report-retry'), reportPrint=reportNode('report-print');
const cancelled=new URLSearchParams(location.search).get('cancelled')==='1';
function reportState(heading,body){
  reportNode('report-stage').textContent=heading;reportStatus.textContent=body;
}
let reportTimer, reportAbort, reportStart=0;
function makeTextElement(tag,text){
  const node=document.createElement(tag);node.textContent=text;return node;
}
function showPaidReport(value){
  if (!Array.isArray(value.sections)||value.sections.length!==4||
      !value.sections.every((section,i)=>section?.key==='ch'+(i+1)&&typeof section.title==='string'&&
        Array.isArray(section.paragraphs)&&section.paragraphs.every(p=>typeof p==='string')))
    throw new Error('Incomplete report');
  reportContent.replaceChildren(...value.sections.map(({title,paragraphs})=>{
    const section=document.createElement('section');
    section.append(makeTextElement('h2',title),...paragraphs.map(p=>makeTextElement('p',p)));
    return section;
  }));
  reportNode('report-plan').textContent=value.plan;
  reportNode('report-plan').hidden=reportContent.hidden=reportPrint.hidden=reportNode('report-ready').hidden=reportNode('report-note').hidden=reportNode('report-privacy').hidden=false;
  reportNode('report-state').hidden=true;
  if(location.search)history.replaceState(history.state,'',location.pathname);
}
async function checkReport(){
  if(!reportToken){reportState('搵唔到呢份命書','請核對你收到嗰條連結。');return;}
  const running=new AbortController();reportAbort=running;
  const timeout=setTimeout(()=>running.abort(),8_000);
  try{
    const value=await pollReport(reportToken,running.signal);
    if(reportAbort!==running)return;
    if(value.status==='READY'){showPaidReport(value);return;}
    if(!['LOCKED','GENERATING'].includes(value.status))throw new Error('Unknown status');
    if(value.status==='GENERATING')reportState('九爺・逐章整理緊星曜同流年','玄同九爺整理緊你嗰四章。準備好就會自動打開，唔使重新付款。');
    else if(cancelled){reportState('你已返回茶室','暫時未收到付款確認，命書未打開。如果你已畀錢，留低呢條連結稍後再查，唔好再付款。');reportRetry.hidden=false;return;}
    else reportState('玄・核對緊付款紀錄','九爺斟多半杯茶。仲未收到付款確認，命書未打開，唔需要再畀一次錢。');
  }catch(error){
    if(reportAbort!==running)return;
    if(error.status===404){reportState('搵唔到呢份命書','請核對你收到嗰條連結。');return;}
    reportState('暫時未查到命書','可以等一陣再查，唔需要重新付款。');
  }finally{clearTimeout(timeout);}
  if(Date.now()-reportStart<120_000)reportTimer=setTimeout(checkReport,2_000);
  else {
    reportState('茶室仲未可以打開命書','可以留住呢頁稍後再查。如果你已畀錢，唔需要再次付款。');reportRetry.hidden=false;
  }
}
function startReport(){
  clearTimeout(reportTimer);reportAbort?.abort();reportRetry.hidden=true;reportStart=Date.now();void checkReport();
}
reportRetry.addEventListener('click',startReport);
reportPrint.addEventListener('click',()=>{
  if(reportContent.hidden||typeof window.print!=='function')return;
  const path=location.pathname+location.search, state=history.state;
  let restored=false;
  const restore=()=>{if(!restored){restored=true;history.replaceState(state,'',path);}};
  // Browser print headers must not contain the permanent bearer link.
  history.replaceState(state,'','/report-shell');
  addEventListener('afterprint',restore,{once:true});
  try{window.print();}catch{removeEventListener('afterprint',restore);restore();}
});
addEventListener('pagehide',()=>{clearTimeout(reportTimer);const old=reportAbort;reportAbort=null;old?.abort();});
addEventListener('pageshow',e=>{if(e.persisted&&reportContent.hidden)startReport();});
startReport();
