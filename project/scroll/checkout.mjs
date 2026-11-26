import { COMMERCE_SKUS, checkoutAvailability, createReading, createCheckoutSession } from '../customer.js';
import { checkedEmail } from './waitlist.mjs';
import { track } from './analytics.mjs';

export function attachCheckout(find) {
  const dialog=find('purchase-dialog'),title=find('purchase-title'),close=find('close-purchase');
  const form=find('checkout-form'), email=find('checkout-email'), consent=find('checkout-consent');
  const submit=find('checkout-submit'), status=find('checkout-status'), sandbox=find('checkout-sandbox'), scope=find('checkout-scope');
  let state,controller;
  const cachedReadings=new WeakMap();
  function reset(){
    controller?.abort(); controller=null; state=null;
    email.value='';email.readOnly=false;email.setAttribute('aria-invalid','false');
    consent.checked=false;consent.disabled=true;submit.disabled=true;
    form.hidden=sandbox.hidden=true;status.textContent='';
    title.textContent='確認你嘅命書方案';close.textContent='先返去睇免費手記';
    scope.textContent='';
  }
  function clear(){
    if (dialog.open) dialog.close();
    reset();
  }
  close.addEventListener('click',clear);
  dialog.addEventListener('cancel',reset);
  dialog.addEventListener('close',()=>{if(!dialog.open)reset();});
  email.addEventListener('input',()=>email.setAttribute('aria-invalid','false'));
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const active=state;if(!active?.ready||active.busy||!dialog.open)return;
    const address=checkedEmail(email.value);
    if(!address){email.setAttribute('aria-invalid','true');status.textContent='請核對電郵地址，等我哋寄得到你嘅命書。';email.focus();return;}
    if(!consent.checked){status.textContent='請先睇清楚資料用途，再剔選同意。';consent.focus();return;}
    active.busy=true;submit.disabled=consent.disabled=true;email.readOnly=true;status.textContent='開啟付款頁面緊，唔使再撳多次。';
    let completed=false;
    const request=new AbortController();controller=request;
    const timer=setTimeout(()=>request.abort(),22_000);
    try{
      const cached=cachedReadings.get(active.data);
      const reading=cached || await createReading(active.data,request.signal);
      if(state!==active||!dialog.open)return;
      cachedReadings.set(active.data,reading);
      const next=await createCheckoutSession(active.sku,address,reading,request.signal);
      if(state!==active||!dialog.open||request.signal.aborted)return;
      let destination;
      if(next.reportPath==='/r/'+reading.publicToken)destination=next.reportPath;
      else if(typeof next.checkoutUrl==='string'){
        const url=new URL(next.checkoutUrl);
        if(url.origin==='https://checkout.stripe.com'&&!url.username&&!url.password)destination=url.href;
      }
      if(!destination)throw new Error('Invalid checkout destination');
      email.value='';location.assign(destination);completed=true;
    }catch(error){
      if(state!==active||!dialog.open)return;
      status.textContent=error.code==='test_recipient'?'呢個係結帳演練，請用指定嘅測試電郵。':
        error.code==='order_already_started'||error.code==='order_expired'?'呢張單暫時唔可以再開。未確定有冇付款之前，唔好再付款。':
          '未能打開結帳，呢度未確認付款。可以遲啲再試。';
    }finally{
      clearTimeout(timer);
      if(state===active&&!completed){controller=null;active.busy=false;submit.disabled=consent.disabled=false;email.readOnly=false;}
    }
  });
  return {
    open(key,data,analytics){
      if(dialog.open||!data||!Object.hasOwn(COMMERCE_SKUS,key))return;
      reset();find('waitlist-closed').hidden=true;
      const active={sku:COMMERCE_SKUS[key],data,busy:false,ready:false};state=active;
      const plan=find('purchase-plan').textContent.split('・')[0];
      scope.textContent=key==='single'?'包含「'+plan+'」四章拆局、2026–2028 節奏對照同列印版。':
        '五個課題，完整四章、三年逐季節奏同列印版。';
      submit.textContent='前往安全付款（'+find('purchase-price').textContent+'）';
      dialog.showModal();title.focus({preventScroll:true});
      if(analytics)track('unlock_modal_opened',analytics);
      status.textContent='等一等，核對緊結帳入口。';
      controller=new AbortController();
      const request=controller;
      const timer=setTimeout(()=>request.abort(),8_000);
      void checkoutAvailability(request.signal).then(result=>{
        if(state!==active||!dialog.open||request.signal.aborted)return;
        if(result.available!==true||typeof result.test!=='boolean')throw new Error('Unavailable');
        active.ready=true;form.hidden=false;submit.disabled=consent.disabled=false;
        sandbox.hidden=!result.test;status.textContent='';
      }).catch(()=>{
        if(state===active&&dialog.open)status.textContent='結帳暫未開放，依家唔會送出資料或扣款。';
      }).finally(()=>{clearTimeout(timer);if(controller===request)controller=null;});
    },
    clear
  };
}
