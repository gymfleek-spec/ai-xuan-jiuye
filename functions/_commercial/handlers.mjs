import { checkedEmail } from '../../project/scroll/waitlist.mjs';
import { getZiweiError } from '../../project/scroll/chart.mjs';
import { calculateStoredChart } from './engine.mjs';
import { PLANS, REPORT_TOPICS, makePaidSections, deliveryMessage } from './report.mjs';
import { json, html, headers, HttpError, tokenOK, idOK, newToken, jsonBody, textBody, reportBase, requiredConfig, allowCheckoutOrigin, limit, verifyStripeEvent } from './http.mjs';

const orderQuery = 'SELECT o.*, r.email, r.public_token, r.topic, r.chart_json FROM orders o JOIN readings r ON r.id=o.reading_id';
const cleanInput=(value, max)=>typeof value==='string'&&value.length<=max&&!/\p{C}/u.test(value) ? value.trim() : null;
function getBirth(data) {
  if (!data || typeof data!=='object' || Array.isArray(data)) throw new HttpError(400,'invalid_birth');
  const {year,month,day,time,gender}=data, place=cleanInput(data.place ?? '',80);
  if (![year,month,day,time,gender].every(v=>typeof v==='string') ||
      !/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month) || !/^\d{1,2}$/.test(day) ||
      time.length!==5 || !['male','female'].includes(gender) || place===null) throw new HttpError(400,'invalid_birth');
  const birth={year,month,day,time,gender,precision:'exact',place};
  if (getZiweiError(birth)) throw new HttpError(400,'invalid_birth');
  return birth;
}

export async function postReading({request,env}) {
  const {base}=requiredConfig(env); allowCheckoutOrigin(request,base);
  const data=await jsonBody(request);
  if (data.consent!==true || !Object.hasOwn(REPORT_TOPICS,data.topic)) throw new HttpError(400,'invalid_reading');
  const nickname=cleanInput(data.nickname ?? '',18), birth=getBirth(data.birth);
  if (nickname===null) throw new HttpError(400,'invalid_reading');
  await limit(request,env,'readings',8);
  const chart=await calculateStoredChart(birth);
  const readingId=crypto.randomUUID(), publicToken=newToken();
  await env.DB.prepare('INSERT INTO readings (id,public_token,nickname,topic,birth_payload,chart_json) VALUES (?,?,?,?,?,?)')
    .bind(readingId,publicToken,nickname,data.topic,JSON.stringify(birth),JSON.stringify(chart)).run();
  return json({readingId,publicToken},201);
}

async function stripeRequest(env,path,form,idem) {
  const config={headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY},redirect:'error',signal:AbortSignal.timeout(12_000)};
  if (form) {
    config.method='POST';config.body=form;
    config.headers['Content-Type']='application/x-www-form-urlencoded';
    config.headers['Idempotency-Key']=idem;
  }
  const response=await fetch('https://api.stripe.com/v1/checkout/sessions'+path,config);
  if (!response.ok) throw new HttpError(503,'checkout_unavailable');
  return response.json();
}
export function checkoutAvailability({request,env}) {
  const {base,mode}=requiredConfig(env);
  if (new URL(request.url).origin!==base) throw new HttpError(404,'not_found');
  return json({available:true,test:mode==='test'});
}
export async function postCheckout({request,env}) {
  const {mode,base}=requiredConfig(env);allowCheckoutOrigin(request,base);
  const {readingId,publicToken,sku,email:input}=await jsonBody(request), email=checkedEmail(input), db=env.DB;
  if (!idOK(readingId) || !tokenOK(publicToken) || !Object.hasOwn(PLANS,sku) || !email) throw new HttpError(400,'invalid_checkout');
  if (mode==='test' && email.toLowerCase()!==env.TEST_ORDER_EMAIL.toLowerCase()) throw new HttpError(400,'test_recipient');
  await limit(request,env,'checkout',16);
  const reading=await db.prepare('SELECT id FROM readings WHERE id=? AND public_token=?').bind(readingId,publicToken).first();
  if (!reading) throw new HttpError(404,'not_found');
  const plan=PLANS[sku];
  await db.batch([
    db.prepare('UPDATE readings SET email=? WHERE id=? AND NOT EXISTS (SELECT 1 FROM orders WHERE reading_id=?)').bind(email,readingId,readingId),
    db.prepare('INSERT INTO orders (id,reading_id,sku,amount_cents) VALUES (?,?,?,?) ON CONFLICT(reading_id) DO NOTHING')
      .bind(crypto.randomUUID(),readingId,sku,plan.amount)
  ]);
  const order=await db.prepare(orderQuery+' WHERE o.reading_id=?').bind(readingId).first();
  if (order.sku!==sku || order.email!==email) throw new HttpError(409,'order_already_started');
  if (order.status==='PAID') return json({reportPath:'/r/'+publicToken});
  if (Date.now()-Date.parse(order.created_at.replace(' ','T')+'Z')>3_600_000) throw new HttpError(409,'order_expired');
  const form=new URLSearchParams({
    mode:'payment', customer_email:email, 'payment_method_types[0]':'card', 'adaptive_pricing[enabled]':'false',
    'line_items[0][price_data][currency]':'hkd','line_items[0][price_data][unit_amount]':String(plan.amount),
    'line_items[0][price_data][product_data][name]':'玄與九爺・'+plan.name, 'line_items[0][quantity]':'1',
    client_reference_id:order.id,'metadata[order_id]':order.id,
    success_url:base+'/r/'+publicToken+'?paid=1',cancel_url:base+'/r/'+publicToken+'?cancelled=1'
  });
  const session = order.stripe_session_id ? await stripeRequest(env,'/'+encodeURIComponent(order.stripe_session_id)) :
    await stripeRequest(env,'',form,'xj-checkout-'+order.id);
  if (session?.livemode !== (mode==='live') || session.amount_total!==plan.amount || session.currency!=='hkd' ||
      session.client_reference_id!==order.id || typeof session.id!=='string' || !/^cs_(test|live)_[a-zA-Z0-9]+$/.test(session.id))
    throw new HttpError(503,'checkout_unavailable');
  if (session.status==='complete') return json({reportPath:'/r/'+publicToken});
  if (session.status!=='open' || typeof session.url!=='string') throw new HttpError(409,'order_expired');
  let checkout;
  try { checkout=new URL(session.url); } catch { throw new HttpError(503,'checkout_unavailable'); }
  if (checkout.origin!=='https://checkout.stripe.com' || checkout.username || checkout.password) throw new HttpError(503,'checkout_unavailable');
  const update=await db.prepare('UPDATE orders SET stripe_session_id=? WHERE id=? AND (stripe_session_id IS NULL OR stripe_session_id=?) RETURNING id')
    .bind(session.id,order.id,session.id).first();
  if (!update) throw new HttpError(503,'checkout_unavailable');
  return json({checkoutUrl:checkout.href});
}

export async function orderReady(db,order,now=Date.now()) {
  const lease=now+30_000;
  const claimed=await db.prepare(
    "UPDATE orders SET status='PAID',report_status='GENERATING',generation_lease_until_ms=? WHERE id=? AND (status='PENDING' OR (status='PAID' AND report_status='GENERATING' AND generation_lease_until_ms<=?)) RETURNING id"
  ).bind(lease,order.id,now).first();
  if (!claimed) return;
  try {
    const sections=makePaidSections(JSON.parse(order.chart_json),order.topic,order.sku);
    await db.batch([
      ...sections.map(section=>db.prepare(
        "INSERT OR IGNORE INTO report_sections (id,order_id,section_key,content_json) SELECT ?,id,?,? FROM orders WHERE id=? AND status='PAID' AND report_status='GENERATING' AND generation_lease_until_ms=?")
        .bind(crypto.randomUUID(),section.key,JSON.stringify(section),order.id,lease)),
      db.prepare("UPDATE orders SET report_status='READY',generation_lease_until_ms=0 WHERE id=? AND generation_lease_until_ms=? AND (SELECT COUNT(*) FROM report_sections WHERE order_id=?)=4")
        .bind(order.id,lease,order.id)
    ]);
  } catch {
    await db.prepare('UPDATE orders SET generation_lease_until_ms=0 WHERE id=? AND generation_lease_until_ms=?')
      .bind(order.id,lease).run();
    throw new HttpError(503,'report_retry');
  }
}

async function sendReport(order,env,base,now=Date.now()) {
  const db=env.DB, lease=now+30_000;
  // Treat an unknown delivery beyond Resend's idempotency window as manual review, not a second email.
  const claimed=await db.prepare(
    "UPDATE orders SET email_lease_until_ms=?,email_first_attempt_ms=COALESCE(email_first_attempt_ms,?) WHERE id=? AND report_status='READY' AND email_sent_at IS NULL AND email_lease_until_ms<=? AND (email_first_attempt_ms IS NULL OR email_first_attempt_ms>?) RETURNING id")
    .bind(lease,now,order.id,now,now-20*3_600_000).first();
  if (!claimed) return;
  try {
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(12_000),
      headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'xj-report-'+order.id},
      body:JSON.stringify({from:env.RESEND_FROM,to:[order.email],...deliveryMessage(order.sku,base+'/r/'+order.public_token)})
    });
    if (!response.ok || typeof (await response.json())?.id!=='string') throw new Error('Email not confirmed');
    await db.prepare('UPDATE orders SET email_sent_at=CURRENT_TIMESTAMP,email_lease_until_ms=0 WHERE id=? AND email_lease_until_ms=?')
      .bind(order.id,lease).run();
  } catch {
    await db.prepare('UPDATE orders SET email_lease_until_ms=0 WHERE id=? AND email_lease_until_ms=?')
      .bind(order.id,lease).run();
    throw new HttpError(503,'delivery_retry');
  }
}

export async function postStripeWebhook({request,env}) {
  const {base,mode}=requiredConfig(env), db=env.DB;
  if (new URL(request.url).origin!==base) throw new HttpError(404,'not_found');
  const raw=await textBody(request,262_144);
  if (!await verifyStripeEvent(raw,request.headers.get('stripe-signature'),env.STRIPE_WEBHOOK_SECRET)) throw new HttpError(400,'invalid_signature');
  let event;
  try { event=JSON.parse(raw); } catch { throw new HttpError(400,'invalid_body'); }
  if (!event || event.type!=='checkout.session.completed' || event.livemode!==(mode==='live')) return json({ok:true});
  const s=event.data?.object;
  if (!s || s.object!=='checkout.session' || s.mode!=='payment' || s.payment_status!=='paid' || s.status!=='complete' ||
      s.currency!=='hkd' || typeof s.id!=='string' || !idOK(s.client_reference_id) || s.metadata?.order_id!==s.client_reference_id)
    return json({ok:true});
  const order=await db.prepare(orderQuery+' WHERE o.id=? AND o.stripe_session_id=?').bind(s.client_reference_id,s.id).first();
  if (!order || order.amount_cents!==s.amount_total || order.status==='FAILED' ||
      (mode==='test' && order.email?.toLowerCase()!==env.TEST_ORDER_EMAIL.toLowerCase())) return json({ok:true});
  await orderReady(db,order);
  await sendReport(order,env,base);
  return json({ok:true});
}

export async function getReport({params,env,request}) {
  const token=params.token;
  if (!tokenOK(token)) return json({error:'not_found'},404);
  const base=reportBase(env);
  if (new URL(request.url).origin!==base) return json({error:'not_found'},404);
  const row=await env.DB.prepare('SELECT r.id,o.id AS order_id,o.sku,o.status,o.report_status FROM readings r LEFT JOIN orders o ON o.reading_id=r.id WHERE r.public_token=?')
    .bind(token).first();
  if (!row) return json({error:'not_found'},404);
  if (row.status!=='PAID') return json({status:'LOCKED'});
  if (row.report_status!=='READY') return json({status:'GENERATING'});
  const {results}=await env.DB.prepare('SELECT content_json FROM report_sections WHERE order_id=? ORDER BY section_key').bind(row.order_id).all();
  if (results.length!==4 || !Object.hasOwn(PLANS,row.sku)) throw new HttpError(503,'temporarily_unavailable');
  return json({status:'READY',plan:PLANS[row.sku].name,sections:results.map(row=>JSON.parse(row.content_json))});
}

const invalidPage='<!doctype html><html lang="zh-HK"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>命書連結打唔開</title><h1>命書連結打唔開</h1><p>請核對你收到嗰條連結。</p><a href="/">返茶室</a></html>';
export async function getReportPage({params,env,request}) {
  const token=params.token;
  if (!tokenOK(token)) return html(invalidPage,404);
  if (!env.DB) return html(invalidPage,503);
  const base=reportBase(env);
  if (new URL(request.url).origin!==base) return html(invalidPage,404);
  if (!await env.DB.prepare('SELECT id FROM readings WHERE public_token=?').bind(token).first()) return html(invalidPage,404);
  const asset=await env.ASSETS.fetch(new Request(base+'/report-shell'));
  if (!asset.ok) return html(invalidPage,503);
  return new Response(asset.body,{headers:{...headers,'Content-Type':'text/html; charset=utf-8',
    'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"}});
}
