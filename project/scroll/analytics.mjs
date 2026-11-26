export const TOPIC_CODE = Object.freeze({官祿:'career',夫妻:'love',田宅:'family',財帛:'wealth',命宮:'direction'});
export const SKU_CODE = Object.freeze({single:'single_88',full:'full_148'});
const eventTopics = Object.values(TOPIC_CODE), eventSkus = Object.values(SKU_CODE);
const eventFields = Object.freeze({
  enter_room: [],
  topic_selected: ['topic'],
  chart_generated: ['topic'],
  resonance_clicked: ['topic'],
  share_card_downloaded: ['topic'],
  share_quote_copied: ['topic'],
  sku_selected: ['sku'],
  unlock_modal_opened: ['sku','topic'],
  unlock_email_sent: ['sku','topic']
});
const localEvents = [];
const eventChecks = {
  topic: v => eventTopics.includes(v),
  sku: v => eventSkus.includes(v)
};

export function analyticsEvent(event, input = {}) {
  if (typeof event !== 'string' || !Object.hasOwn(eventFields,event) || !input) return null;
  const payload = {};
  for (const field of eventFields[event]) {
    if (!Object.hasOwn(input,field)) return null;
    const value = input[field];
    if (!eventChecks[field](value)) return null;
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
        localEvents.push(event);
        if (localEvents.length>128) localEvents.shift();
        globalThis.__XUAN_EVENTS__=Object.freeze(localEvents.slice());
        globalThis.dispatchEvent?.(new CustomEvent('xuan:track',{detail:event}));
      } catch { /* Counting must not affect reading. */ }
    });
  } catch { /* An invalid or unavailable event is discarded. */ }
}
