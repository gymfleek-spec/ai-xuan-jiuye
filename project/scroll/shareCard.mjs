import { TOPIC_CODE, track } from './analytics.mjs';
import { STAR_COPY } from './empathy-copy.mjs';
import { checkedArtwork, checkedSignature, paintShareArtwork } from './share-art.mjs';

const SHARE_QUOTES = Object.freeze({
  官祿:'總係頂到最後嗰個，\n唔係唔識推，只係太想\n件事有交帶。今晚放低一份，\n唔等於你唔負責任。',
  夫妻:'好想被聽明嗰陣，\n最怕仲要估對方諗乜。\n原來真正舒服嘅相處，\n係唔使成晚靠猜。',
  田宅:'屋企唔應該係另一張\n做晒先准唞嘅清單。\n今晚留十分鐘畀自己，\n唔算冷淡，係留返氣力。',
  財帛:'每次睇實啲數，其實最想\n計清幾時先可以唔使咁緊。\n留一筆畀安心，亦留少少\n畀真心想過嘅日子。',
  命宮:'未揀定一世行邊條路，\n唔代表你慢咗。\n先試一個禮拜嘅小步，\n行唔啱，隨時可以轉彎。'
});

export function shareFields(chapter, element) {
  if (!Object.hasOwn(SHARE_QUOTES,chapter?.key) || !/^(?:水二|木三|金四|土五|火六)局$/.test(element) ||
      !Array.isArray(chapter.stars) || !chapter.stars.length || !chapter.stars.every(star=>Object.hasOwn(STAR_COPY,star))) return null;
  const fields = {topic:TOPIC_CODE[chapter.key], pattern:element+'・'+chapter.key+(chapter.borrow?'借':'・')+chapter.stars.join('、'), quote:SHARE_QUOTES[chapter.key]};
  try { checkedArtwork(fields); return Object.freeze(fields); } catch { return null; }
}

export function needsShareImage(ua, touches, canDownload) {
  return !canDownload || /iP(?:hone|ad|od)|WhatsApp|Instagram/i.test(ua) ||
    (/Macintosh/.test(ua) && touches > 1);
}

function shareImageSource(canvas) {
  const data = canvas.toDataURL('image/png');
  if (!data.startsWith('data:image/png;base64,')) throw new Error('No PNG');
  return data;
}

export function attachShareCard(find) {
  const section=find('share-card'), stage=find('share-stage'), canvas=find('share-canvas'), image=find('share-image');
  const signature=find('share-signature'), save=find('share-save'), copy=find('share-copy');
  const quote=find('share-quote'), notice=find('share-notice'), hint=find('share-hint');
  let fields=null, pictures=null, picturesReady=null, observer=null, useImage=false, pressTimer, press;
  const load = src => new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload=()=>resolve(img); img.onerror=reject; img.src=src;
  });
  function stopPress() { clearTimeout(pressTimer); press=null; }
  function renderCard() {
    if (!fields || !picturesReady) return;
    const sign = checkedSignature(signature.value) || '';
    try {
      paintShareArtwork(canvas,{...fields,signature:signature.value},picturesReady);
      const description = fields.pattern+'。'+fields.quote.replaceAll('\n','')+(sign?' 寫畀 '+sign:'');
      canvas.setAttribute('aria-label', description); image.alt=description;
      stage.hidden=false; canvas.hidden=useImage; image.hidden=!useImage;
      if (useImage) image.src=shareImageSource(canvas);
      save.disabled=false;
      hint.hidden=!useImage;
    } catch {
      stage.hidden=hint.hidden=true; save.disabled=true; quote.hidden=false;
      notice.textContent='呢個瀏覽器暫時整唔到圖片；可以直接複製上面句判詞留底。';
    }
  }
  function prepareCard() {
    observer?.disconnect(); observer=null;
    const visible=fields;
    if (!visible || !section.dataset.portrait) return;
    if (!pictures) {
      pictures = Promise.all([load(section.dataset.portrait),document.fonts?.ready])
        .then(([portrait])=>portrait)
        .catch(()=>null);
    }
    void pictures.then(assets=>{
      if (fields !== visible) return;
      if (assets) { picturesReady=assets; renderCard(); }
      else {
        pictures=null; stage.hidden=true; quote.hidden=false;
        notice.textContent='暫時未能打開判詞圖片；可以直接複製上面句判詞留底。';
      }
    });
  }
  function set(next) {
    observer?.disconnect(); observer=null; stopPress();
    fields=next; section.hidden=!next; signature.value='';
    canvas.width=canvas.height=0; canvas.setAttribute('aria-label',''); canvas.hidden=true;
    image.removeAttribute('src'); image.alt=''; image.hidden=true;
    stage.hidden=hint.hidden=quote.hidden=true; save.disabled=true; notice.textContent='';
    quote.textContent=next ? next.quote.replaceAll('\n','') : '';
    if (!next) return;
    stage.hidden=false;
    useImage=needsShareImage(globalThis.navigator?.userAgent || '',globalThis.navigator?.maxTouchPoints || 0,
      'download' in document.createElement('a'));
    if (globalThis.IntersectionObserver) {
      observer=new IntersectionObserver(entries=>{if(entries.some(v=>v.isIntersecting))prepareCard();},{rootMargin:'320px'});
      observer.observe(section);
    } else prepareCard();
  }
  signature.addEventListener('change',()=>{stopPress();renderCard();});
  save.addEventListener('click',()=>{
    if (!fields || !picturesReady) return;
    renderCard();
    if (save.disabled) return;
    if (useImage) { image.scrollIntoView({block:'nearest'}); return; }
    try {
      const link=document.createElement('a'); link.href=shareImageSource(canvas);
      link.download='jiuye-'+fields.topic+'.png';
      document.body.append(link); try {link.click();} finally {link.remove();}
      track('share_card_downloaded',{topic:fields.topic});
    } catch { useImage=true; renderCard(); }
  });
  image.addEventListener('pointerdown', e=>{
    if (e.pointerType !== 'touch' || !fields || !useImage) return;
    stopPress(); press={x:e.clientX,y:e.clientY};
    pressTimer=setTimeout(()=>{
      if (fields && press) track('share_card_downloaded',{topic:fields.topic});
      stopPress();
    },550);
  });
  image.addEventListener('pointermove', e=>{
    if (press && Math.hypot(e.clientX-press.x,e.clientY-press.y)>12) stopPress();
  });
  for (const type of ['pointerup','pointercancel','pointerleave']) image.addEventListener(type, stopPress);
  // Some in-app browsers open their image menu before a pointer hold completes.
  image.addEventListener('contextmenu', e=>{
    if (e.isTrusted && fields && useImage && press) {
      track('share_card_downloaded',{topic:fields.topic}); stopPress();
    }
  });
  copy.addEventListener('click',async()=>{
    const card=fields; if (!card) return;
    const text='「'+card.quote.replaceAll('\n','')+'」\n—— 九爺留畀你嘅一張判詞｜玄與九爺（'+card.pattern+'）';
    let copied=false;
    try { await navigator.clipboard.writeText(text); copied=true; } catch {
      if (fields !== card) return;
      const buffer=document.createElement('textarea');
      buffer.className='jy-copy-buffer'; buffer.value=text; buffer.readOnly=true;
      document.body.append(buffer);
      try { buffer.select(); buffer.setSelectionRange(0,buffer.value.length); copied=document.execCommand('copy'); }
      catch { /* The selectable quote stays available. */ }
      finally { buffer.remove(); copy.focus({preventScroll:true}); }
    }
    if (fields !== card) return;
    quote.hidden=copied && !stage.hidden;
    notice.textContent=copied?'已複製判詞，可以貼去限時動態。':'未能自動複製，可以長按上面段字複製。';
    if (copied) track('share_quote_copied',{topic:card.topic});
  });
  return {set};
}
