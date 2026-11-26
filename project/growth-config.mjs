const previewOrigin = 'https://xuan-jiuye-preview.pages.dev';

// No provider is enabled by default. Configuration narrows connect-src to the reviewed routes.
export function growthEndpoints({WAITLIST_ENDPOINT='', ANALYTICS_ENDPOINT=''} = {}) {
  function approvedURL(value,sameOriginPath) {
    if (!value) return '';
    if (value === sameOriginPath) return previewOrigin + value;
    if (/^https:\/\/[\w.-]+(?::\d+)?\/[\w.~-]+(?:\/[\w.~-]+)*$/i.test(value) &&
        !/(?:^|\/)\.\.?(?:\/|$)/.test(value.slice(value.indexOf('/',8)))) {
      try { return new URL(value).href; } catch { /* Do not echo invalid configuration. */ }
    }
    throw new Error('Use a dedicated HTTPS endpoint with no credentials, query or fragment.');
  }
  const waitlist = approvedURL(WAITLIST_ENDPOINT,'/api/waitlist');
  const analytics = approvedURL(ANALYTICS_ENDPOINT,'/api/analytics');
  if (waitlist && waitlist === analytics) throw new Error('Waitlist and analytics require distinct endpoints.');
  return {waitlist, analytics};
}
