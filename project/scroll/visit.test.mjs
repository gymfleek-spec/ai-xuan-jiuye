import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

function visit(){
  const nodes=new Map(),events={};
  const node=id=>{
    if(nodes.has(id))return nodes.get(id);
    const n={id,dataset:{},hidden:false,open:false,scrollTop:0,textContent:'',children:[],handlers:{},
      addEventListener(k,fn){this.handlers[k]=fn;},
      getAttribute(){return 'lobby.webp';},removeAttribute(k){delete this.dataset[k.replace('data-','')];},
      focus(){},replaceChildren(...kids){this.children=kids;},
      append(k){this.children.push(k);k.parentElement=this;},
      prepend(k){this.children.unshift(k);k.parentElement=this;},
      showModal(){this.open=true;},close(){this.open=false;this.handlers.close?.();},
      querySelectorAll(){return []}
    };
    nodes.set(id,n);return n;
  };
  node('film-stage').dataset={arrival:'idle.mp4',entry:'entry.mp4',door:'door.jpg',desk:'desk.jpg'};
  const keys=['官祿','夫妻','田宅','財帛','命宮'];
  const chapters=keys.map(key=>({dataset:{key},querySelectorAll:()=>[]}));
  node('top').querySelectorAll=s=>s==='.story[data-key]'?chapters:[];
  let callbacks,paint,deliver,pick,opens=0,plays=0,pauses=0;
  const scenes=[], observed=[];
  const document={hidden:false,getElementById:node,documentElement:{classList:{add(){}}},
    addEventListener:(name,fn)=>{events[name]=fn;}};
  const source=readFileSync(new URL('./reader.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  runInNewContext(source,{
    document,window:{scrollTo(){}},iztro:{version:'2.6.5'},
    TOPIC_CODE:{田宅:'family'},track:(name,payload={})=>observed.push([name,JSON.parse(JSON.stringify(payload))]),
    matchMedia:()=>({addEventListener:(name,fn)=>{events['motion-'+name]=fn;}}),
    addEventListener:(name,fn)=>{events[name]=fn;},
    attachSceneSequence:(_video,_poster,cb)=>{
      callbacks=cb;
      return {setScene(c){scenes.push(c);return true;},play(){plays++;return Promise.resolve(true);},pause(){pauses++;}};
    },
    attachZiwei:(_dialog,_content,fn,done,selected)=>{paint=fn;deliver=done;pick=selected;return ()=>{opens++;paint('<h2>玄</h2>','entrance');};},
    attachResult:()=>({show(){},clear(){}})
  });
  return {node,events,scenes,document,observed,pick:k=>pick(k),paint:(...v)=>paint(...v),deliver:(...v)=>deliver(...v),
    meet:()=>{node('enter').handlers.click();callbacks.onComplete({id:'entry',reason:'ended'});},
    count:()=>({opens,plays,pauses})};
}
test('mobile visit keeps one portrait idle running through every intake step, then pauses for the chart and reading',()=>{
  const f=visit();f.meet();
  assert.equal(f.node('scene-media').parentElement.id,'desk-scene');
  assert.equal(f.scenes.at(-1).src,'idle.mp4');assert.equal(f.scenes.at(-1).loop,true);
  const setCount=f.scenes.length;
  for(const phase of ['interaction','career-setup','career-setup','career-setup']){
    f.node('consult-body').scrollTop=480;f.paint('<h2>下一步</h2>',phase);
    assert.equal(f.node('consult-body').scrollTop,0);
    assert.equal(f.scenes.length,setCount,'typing or changing a step never restarts the movie');
  }
  const pause=f.count().pauses;f.paint('<h2>為你點星</h2>','career-ritual');
  assert.equal(f.count().pauses,pause+1);
  const plays=f.count().plays;f.events.visibilitychange();assert.equal(f.count().plays,plays);
  f.pick('田宅');
  f.deliver({chart:{fiveElementsClass:'土五局'},input:{year:1995,month:8,day:15,time:'09:30',gender:'male'},alias:'例',question:'',subject:'家庭',reply:'同盤',offer:true,topic:'田宅'});
  assert.deepEqual(f.observed,[['enter_room',{}],['topic_selected',{topic:'family'}],['chart_generated',{topic:'family'}]]);
  assert.equal(f.node('top').hidden,false);assert.equal(f.count().pauses,pause+2);
  f.node('finish').handlers.click();
  assert.equal(f.node('scene-media').parentElement.id,'film-stage');
  assert.equal(f.node('top').hidden,true);assert.equal(f.node('chart-label').textContent,'');
});
test('mobile visit restores animation when returning to a visible question, never in the chart or after leaving',()=>{
  const f=visit();f.meet();f.paint('<h2>生辰</h2>','career-setup');
  const n=f.count().plays;f.document.hidden=true;f.events.visibilitychange();assert.equal(f.count().plays,n);
  f.document.hidden=false;f.events.visibilitychange();assert.equal(f.count().plays,n+1);
  f.events['motion-change']();assert.equal(f.count().plays,n+2);
  f.events.pagehide();assert.equal(f.node('consult').open,false);assert.equal(f.node('scene-media').parentElement.id,'film-stage');
  const sets=f.scenes.length;f.events.pageshow({persisted:true});assert.equal(f.scenes.length,sets+1);
});

test('seam: only natural entry completion requests a captured frame, before moving media',()=>{
 const f=visit();assert.equal(f.count().opens,0);f.meet();
 const scene=f.scenes.find(x=>x.id==='desk');assert.equal(scene.preserveFrame,true);
 const src=readFileSync(new URL('./reader.mjs',import.meta.url),'utf8');
 assert.ok(src.indexOf('preserveFrame:normal')<src.indexOf('deskScene.append(media)'));
});

test('entry portrait layout is active only during entry and is cleared on return',()=>{
 const f=visit();assert.equal(f.node('threshold').dataset.phase,undefined);
 f.node('enter').handlers.click();assert.equal(f.node('threshold').dataset.phase,'entering');
 assert.equal(f.node('consult').open,false);f.meet();
 f.node('consult').close();assert.equal(f.node('threshold').dataset.phase,undefined);
 assert.equal(f.node('scene-media').parentElement.id,'film-stage');
});
