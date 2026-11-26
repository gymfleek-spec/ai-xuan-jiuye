export const TOPIC_CODE = Object.freeze({官祿:'career',夫妻:'love',田宅:'family',財帛:'wealth',命宮:'direction'});
export const SKU_CODE = Object.freeze({single:'single_88',full:'full_148'});
const eventTopics = Object.values(TOPIC_CODE), eventSkus = Object.values(SKU_CODE);
const eventFields = Object.freeze({
  enter_room: ['entry_btn'],
  topic_selected: ['topic'],
  chart_generated: ['topic','has_empty_palace'],
  resonance_clicked: ['topic'],
  share_card_downloaded: ['topic','method'],
  share_quote_copied: ['topic'],
  sku_selected: ['sku'],
  unlock_modal_opened: ['sku','topic'],
  unlock_email_sent: ['sku','topic']
});
const eventChecks = {
  entry_btn: v => v === 'luopan_v1',
  topic: v => eventTopics.includes(v),
  sku: v => eventSkus.includes(v),
  has_empty_palace: v => typeof v === 'boolean',
  method: v => v === 'download' || v === 'long_press'
};

export function analyticsEvent(event, input) {
  if (typeof event !== 'string' || !Object.hasOwn(eventFields,event) || !input) return null;
  const payload = {};
  for (const field of eventFields[event]) {
    const value = input[field];
    if (!Object.hasOwn(input, field) || !eventChecks[field](value)) return null;
    payload[field] = value;
  }
  return Object.freeze({event, payload:Object.freeze(payload)});
}

export function track(name, payload) {
  try {
    const event = analyticsEvent(name,payload);
    if (!event) return;
    queueMicrotask(() => {
      try {
        // Even with no collector, the allowlisted event is observable on this page, not stored.
        globalThis.dispatchEvent?.(new CustomEvent('xj:analytics',{detail:event}));
        const endpoint = document.querySelector('meta[name="analytics-endpoint"]')?.content;
        if (endpoint) void fetch(endpoint,{
          method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(event),
          credentials:'omit', redirect:'error', referrerPolicy:'no-referrer', keepalive:true
        }).catch(()=>{});
      } catch { /* Counting must not affect reading. */ }
    });
  } catch { /* An invalid or unavailable event is discarded. */ }
}
