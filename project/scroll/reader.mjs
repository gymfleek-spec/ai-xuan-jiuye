import { attachSceneSequence } from '../motion/motion.mjs';
import { attachZiwei } from '../ziwei.js';
import { attachResult } from './result.mjs';
import { TOPIC_CODE, track } from './analytics.mjs';

const byId=id=>document.getElementById(id);
const threshold=byId('threshold'), report=byId('top'), dialog=byId('consult'), content=byId('story-content');
const stage=byId('film-stage'), video=byId('scene-video'), poster=byId('scene-poster'), enter=byId('enter');
const media=byId('scene-media'), deskScene=byId('desk-scene'), panel=byId('consult-body');
const reception=poster.getAttribute('src'), desk=stage.dataset.desk;
const invitation=byId('invitation');
const commercial=document.documentElement.dataset?.commercial==='true';
const results=attachResult(report,commercial);
let phase='home';

function paintStep(html,step){
  dialog.dataset.phase=step;
  content.innerHTML='<div class="step-copy">'+html+'</div>';
  const title=byId('dialog-title');title.tabIndex=-1;
  dialog.scrollTop=panel.scrollTop=0;title.focus({preventScroll:true});
  if(step==='career-ritual')player.pause();
  else if(phase==='consult' && !document.hidden)void player.play();
}
function showBook({chart,input,alias,question,subject,reply,offer,topic}){
  const checkoutData=commercial && offer ? {birth:input,nickname:alias,topic:TOPIC_CODE[topic]} : null;
  results.show({chart,alias,subject,offer,reply,checkoutData});
  byId('edition-label').textContent='本次命盤　／　'+alias;
  byId('chart-label').textContent=[input.year,input.month,input.day].join('-')+' · '+input.time+' · '+(input.gender==='male'?'男':'女')+' ｜ '+chart.fiveElementsClass;
  byId('visit-label').textContent='枱邊嗰句　／　'+subject;
  byId('visit-question').textContent=question?'「'+question+'」':'';byId('visit-question').hidden=!question;
  byId('visit-answer').textContent='九爺：'+reply;
  phase='reading';player.pause();dialog.close();content.replaceChildren();report.hidden=false;
  window.scrollTo(0,0);byId('cover-title').focus({preventScroll:true});
  track('chart_generated',{topic:TOPIC_CODE[topic]});
}
const ask=attachZiwei(dialog,content,paintStep,showBook,topic=>track('topic_selected',{topic:TOPIC_CODE[topic]}),commercial);

function meet(normal){
  if(phase!=='entering')return;
  phase='consult';
  player.setScene({id:'desk',src:stage.dataset.arrival,poster:desk,loop:true,preserveFrame:normal});
  deskScene.append(media);
  threshold.hidden=true;dialog.showModal();ask(false);
  if(normal)byId('desk-question').textContent='坐低先，慢慢講。';
}
const player=attachSceneSequence(video,poster,{
  frameHold:byId('scene-hold'),
  onState({id,state}){
    if(id==='entry' && ['error','blocked','reduced'].includes(state))meet(false);
  },
  onComplete({id,reason}){if(id==='entry' && reason==='ended')meet(true);}
});
function home(animate=true){
  const wasReading=phase==='reading';
  phase='home';if(dialog.open)dialog.close();content.replaceChildren();dialog.removeAttribute('data-phase');
  delete threshold.dataset.phase;
  report.hidden=true;
  if(wasReading){
    results.clear();
    for(const n of ['edition-label','chart-label','visit-label','visit-question','visit-answer'].map(byId))n.textContent='';
  }
  stage.prepend(media);panel.scrollTop=0;
  threshold.hidden=false;invitation.hidden=false;byId('entry-foot').hidden=false;enter.disabled=false;
  poster.alt='玄與灰狐九爺在枱前等你。';
  if(!animate){player.pause();return;}
  player.setScene({id:'home',src:stage.dataset.arrival,poster:reception,loop:true});
  if(!document.hidden)void player.play();
}
enter.addEventListener('click',()=>{
  if(phase!=='home')return;
  track('enter_room');
  phase='entering';invitation.hidden=true;byId('entry-foot').hidden=true;enter.disabled=true;
  threshold.dataset.phase='entering';
  window.scrollTo(0,0);poster.alt='步入大門，先見佛龕，向右望就係玄同九爺。';
  if(player.setScene({id:'entry',src:stage.dataset.entry,poster:stage.dataset.door}))void player.play();
});
byId('leave-desk').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{
  if(!dialog.open && phase==='consult'){home();window.scrollTo(0,0);enter.focus({preventScroll:true});}
});
byId('finish').addEventListener('click',()=>{home();window.scrollTo(0,0);enter.focus({preventScroll:true});});
function resumeScene(){
  if(!document.hidden && (phase==='home'||phase==='entering'||phase==='consult' && dialog.dataset.phase!=='career-ritual'))void player.play();
}
document.addEventListener('visibilitychange',resumeScene);
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',resumeScene);
addEventListener('pagehide',()=>home(false));
addEventListener('pageshow',e=>{if(e.persisted)home();});
if(globalThis.iztro?.version==='2.6.5'){
  document.documentElement.classList.add('can-cast');home();byId('viewer-help').hidden=true;
}
