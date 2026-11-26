import { TOPIC_CODE, SKU_CODE, track } from './analytics.mjs';

export function checkedEmail(raw) {
  if (typeof raw !== 'string') return null;
  const email = raw.trim(), [local,domain,extra] = email.split('@');
  if (!domain || extra !== undefined || email.length > 254 || local.length > 64 ||
      !/^[a-z\d!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z\d!#$%&'*+/=?^_`{|}~-]+)*$/i.test(local)) return null;
  const labels = domain.split('.');
  if (labels.length < 2 || !/[a-z]/i.test(labels.at(-1)) ||
      !labels.every(s=>/^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(s))) return null;
  return email;
}

export async function registerWaitlist(endpoint,{email,sku,topic},signal) {
  const address = checkedEmail(email);
  if (!endpoint || !address || !Object.values(SKU_CODE).includes(sku) || !Object.values(TOPIC_CODE).includes(topic)) return false;
  const response = await fetch(endpoint,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:address,sku,topic,timestamp:new Date().toISOString()}),
    signal, credentials:'omit', redirect:'error', referrerPolicy:'no-referrer'
  });
  return response.ok && (await response.json())?.ok === true;
}

export function attachWaitlist(find, endpoint = globalThis.document?.querySelector?.('meta[name="waitlist-endpoint"]')?.content) {
  const modal = find('purchase-dialog'), title = find('purchase-title'), form = find('waitlist-form');
  const email = find('waitlist-email'), submit = find('waitlist-submit'), close = find('close-purchase');
  const status = find('waitlist-status'), success = find('waitlist-success');
  let context = null, pending = null;
  function reset() {
    pending?.abort(); pending = context = null;
    email.value = ''; email.readOnly = false; email.setAttribute('aria-invalid','false');
    title.textContent = '為你保留早鳥優惠名額';
    form.hidden = success.hidden = true;
    find('waitlist-intro').hidden = find('waitlist-privacy').hidden = !endpoint;
    find('waitlist-closed').hidden = !!endpoint;
    if (endpoint) form.hidden = false;
    email.disabled = submit.disabled = !endpoint;
    status.textContent = '';
    close.textContent = '先返去睇免費手記';
  }
  function clear() {
    if (modal.open) modal.close();
    reset();
  }
  close.addEventListener('click',clear);
  modal.addEventListener('cancel', reset);
  modal.addEventListener('close',()=>{if (!modal.open) reset();});
  email.addEventListener('input',()=>{
    email.setAttribute('aria-invalid','false');
    if (!pending) status.textContent = '';
  });
  form.addEventListener('submit', async e=>{
    e.preventDefault();
    if (!endpoint || !modal.open || !context || pending || !success.hidden) return;
    const address = checkedEmail(email.value);
    if (!address) {
      email.setAttribute('aria-invalid','true');
      status.textContent = '請輸入有效嘅 Email 地址，先寄得到連結畀你。';
      email.focus();
      return;
    }
    const request = new AbortController(), selection = context;
    pending = request; submit.disabled = true; email.readOnly = true;
    status.textContent = '幫你記低緊……';
    const timeout = setTimeout(()=>request.abort(),8_000);
    let confirmed = false;
    try { confirmed = await registerWaitlist(endpoint,{...selection,email:address},request.signal); }
    catch { /* Do not show service errors or echo the address. */ }
    finally { clearTimeout(timeout); }
    if (pending !== request || !modal.open) return;
    pending = null; submit.disabled = false; email.readOnly = false;
    if (!confirmed || request.signal.aborted) {
      status.textContent = '暫時未記低到，可以遲啲再試，或者先返去睇免費手記。';
      return;
    }
    context = null; email.value = ''; status.textContent = '';
    title.textContent = '已為你留好位置';
    form.hidden = find('waitlist-intro').hidden = find('waitlist-privacy').hidden = true;
    success.hidden = false; close.textContent = '返去繼續睇免費手記'; title.focus();
    track('unlock_email_sent',selection);
  });
  return {
    open(sku,topic) {
      if (modal.open || !Object.values(SKU_CODE).includes(sku) || !Object.values(TOPIC_CODE).includes(topic)) return;
      reset(); context = {sku,topic};
      modal.showModal(); title.focus({preventScroll:true});
      track('unlock_modal_opened', context);
    },
    clear
  };
}
