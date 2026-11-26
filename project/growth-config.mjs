const previewOrigin = 'https://xuan-jiuye-preview.pages.dev';

// Only the reviewed waitlist route may relax the default connect-src policy.
export function waitlistEndpoint(value='') {
  if (!value) return '';
  if (value === '/api/waitlist') return previewOrigin + value;
  if (/^https:\/\/[\w.-]+(?::\d+)?\/[\w.~-]+(?:\/[\w.~-]+)*$/i.test(value) &&
      !/(?:^|\/)\.\.?(?:\/|$)/.test(value.slice(value.indexOf('/',8)))) {
    try { return new URL(value).href; } catch { /* Do not echo invalid configuration. */ }
  }
  throw new Error('Use a dedicated HTTPS endpoint with no credentials, query or fragment.');
}
