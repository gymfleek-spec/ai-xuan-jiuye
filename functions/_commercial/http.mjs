const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', {fatal:true,ignoreBOM:true});
export const tokenOK = token => typeof token === 'string' && /^[a-f0-9]{32}$/.test(token);
export const idOK = id => typeof id === 'string' && /^[a-f0-9-]{36}$/.test(id);
export const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('');
export const newToken = () => hex(crypto.getRandomValues(new Uint8Array(16)));
export const headers = {
  'Cache-Control':'private, no-store',
  'Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff',
  'X-Robots-Tag':'noindex, nofollow'
};

export function json(body, status=200) {
  return Response.json(body, {status,headers});
}
export function html(body, status=200) {
  return new Response(body,{status,headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
}
export class HttpError extends Error {
  constructor(status, code) { super(code); this.status=status; this.code=code; }
}

export async function textBody(request,maxBytes) {
  const length=Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(length) && length > maxBytes) throw new HttpError(413,'too_large');
  const reader=request.body?.getReader();
  if (!reader) throw new HttpError(400,'invalid_body');
  const chunks=[];
  let count=0;
  while (true) {
    const {done,value}=await reader.read(); if (done) break;
    count+=value.byteLength;
    if (count>maxBytes) { await reader.cancel().catch(()=>{}); throw new HttpError(413,'too_large'); }
    chunks.push(value);
  }
  const bytes=new Uint8Array(count);
  let offset=0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset+=chunk.byteLength; }
  try { return decoder.decode(bytes); } catch { throw new HttpError(400,'invalid_body'); }
}
export async function jsonBody(request,maxBytes=4096) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw new HttpError(415,'invalid_body');
  const raw=await textBody(request,maxBytes);
  let value;
  try { value=JSON.parse(raw); } catch { throw new HttpError(400,'invalid_body'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400,'invalid_body');
  return value;
}

export function reportBase(env) {
  let base;
  try { base=new URL(env.PUBLIC_BASE_URL); } catch { throw new HttpError(503,'checkout_unavailable'); }
  const local=env.COMMERCIAL_MODE!=='live'&&base.protocol==='http:'&&base.hostname==='127.0.0.1';
  if ((!local && base.protocol!=='https:') || base.pathname!=='/' || base.username || base.password || base.search || base.hash || !env.DB)
    throw new HttpError(503,'checkout_unavailable');
  return base.origin;
}
export function requiredConfig(env) {
  const mode=env.COMMERCIAL_MODE, base=reportBase(env);
  if (!['test','live'].includes(mode) || !new RegExp('^(?:sk|rk)_'+mode+'_').test(env.STRIPE_SECRET_KEY || '') ||
      !env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_') || !env.RESEND_API_KEY?.startsWith('re_') ||
      !env.RESEND_FROM || /[\r\n]/.test(env.RESEND_FROM) || (mode==='test' && !env.TEST_ORDER_EMAIL)) {
    throw new HttpError(503,'checkout_unavailable');
  }
  return { base, mode };
}
export function allowCheckoutOrigin(request, base) {
  if (request.headers.get('origin')!==base || new URL(request.url).origin!==base) throw new HttpError(403,'invalid_origin');
}

async function hmacKey(secret,usage) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'},false,[usage]);
}
export async function verifyStripeEvent(raw, signature, secret, now=Date.now()) {
  const fields=(signature || '').split(',').map(s=>s.trim().split('='));
  const timestamps=fields.filter(([name])=>name==='t').map(([,value])=>value);
  const candidates=fields.filter(([name,value])=>name==='v1' && /^[a-fA-F0-9]{64}$/.test(value || '')).slice(0,8);
  const ts=timestamps[0];
  if (timestamps.length!==1 || !/^\d{10,11}$/.test(ts || '') || Math.abs(Math.floor(now/1000)-Number(ts))>300 || !candidates.length) return false;
  const key=await hmacKey(secret,'verify'), message=encoder.encode(ts+'.'+raw);
  for (const [,value] of candidates) {
    const mac=Uint8Array.from(value.match(/../g),v=>parseInt(v,16));
    if (await crypto.subtle.verify('HMAC',key,mac,message)) return true;
  }
  return false;
}

export async function limit(request, env, route, max, now=Date.now()) {
  const hour=Math.floor(now/3_600_000), ip=request.headers.get('cf-connecting-ip') || 'local';
  const key=await hmacKey(env.STRIPE_WEBHOOK_SECRET,'sign');
  const bucket=hex(await crypto.subtle.sign('HMAC',key,encoder.encode('xj-rate:'+route+':'+hour+':'+ip)));
  const db=env.DB;
  await db.prepare('DELETE FROM rate_buckets WHERE expires < ?').bind(hour).run();
  const row=await db.prepare('INSERT INTO rate_buckets(bucket,expires,hits) VALUES(?,?,1) ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 WHERE hits < ? RETURNING hits').bind(bucket,hour,max).first();
  if (!row) throw new HttpError(429,'too_many_requests');
}

export function guard(fn) {
  return async context => {
    try { return await fn(context); }
    catch (error) {
      if (error instanceof HttpError) return json({error:error.code},error.status);
      // Never log request bodies, provider responses or report links.
      return json({error:'temporarily_unavailable'},503);
    }
  };
}
