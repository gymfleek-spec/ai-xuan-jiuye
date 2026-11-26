export const COMMERCE_SKUS=Object.freeze({single:'xuan_single_v1',full:'xuan_full_3yr_v1'});

async function commerceRequest(path,{body,signal}={}) {
  const init={cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal};
  if (body) Object.assign(init,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const response=await fetch(path,init);
  const data=await response.json().catch(()=>null);
  if (!response.ok||!data) {
    const error=new Error('Request not completed');
    error.code=data?.error || 'temporarily_unavailable';error.status=response.status;
    throw error;
  }
  return data;
}

export function checkoutAvailability(signal) {
  return commerceRequest('/api/checkout',{signal});
}
export async function createReading(data,signal) {
  const response=await commerceRequest('/api/readings',{
    body:{nickname:data.nickname,topic:data.topic,birth:data.birth,consent:true},signal
  });
  if (!/^[a-f0-9-]{36}$/.test(response.readingId??'') || !/^[a-f0-9]{32}$/.test(response.publicToken??''))
    throw new Error('Reading not confirmed');
  return {readingId:response.readingId,publicToken:response.publicToken};
}
export function createCheckoutSession(sku,email,reading,signal) {
  return commerceRequest('/api/checkout',{body:{sku,email,readingId:reading.readingId,publicToken:reading.publicToken},signal});
}
export function pollReport(token,signal) {
  if (!/^[a-f0-9]{32}$/.test(token??'')) throw Object.assign(new Error('Link not found'),{status:404});
  return commerceRequest('/api/reports/'+token,{signal});
}
