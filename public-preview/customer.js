let csrfToken = '';

export async function api(path, body, method = body === undefined ? 'GET' : 'POST') {
  if (globalThis.document?.documentElement?.dataset.mode === 'public-preview') throw new Error('公開預覽不提供帳戶或保存。');
  if (!['http:', 'https:'].includes(globalThis.location?.protocol)) throw new Error('帳戶保存目前無法使用。');
  let response, data;
  try {
    response = await fetch(`/api/${path}`, {
      method, credentials: 'same-origin', cache: 'no-store',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    data = await response.json();
  } catch {
    throw new Error('暫時未能連接保存服務。資料未確認保存，請保留本頁再試。');
  }
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : '未能完成，請重試。');
  if (typeof data.csrf === 'string') csrfToken = data.csrf;
  return data;
}
