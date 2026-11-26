const growthOrigin = 'https://xuan-jiuye-preview.pages.dev';
export const WAITLIST_ROUTE = '/api/waitlist', EVENTS_ROUTE = '/api/events';

export function growthRoute(value='', route) {
  if (!value) return '';
  if ((route === WAITLIST_ROUTE || route === EVENTS_ROUTE) && (value === route || value === growthOrigin+route)) return route;
  throw new Error('Growth endpoints must use the approved same-site routes.');
}

export function growthConnections(routes) {
  return routes.filter(route=>route === WAITLIST_ROUTE || route === EVENTS_ROUTE).map(route=>growthOrigin+route).join(' ') || "'none'";
}

export function mountedGrowthRoute(name, route) {
  const value=globalThis.document?.querySelector?.('meta[name="'+name+'-endpoint"]')?.content;
  return value === route && (route === WAITLIST_ROUTE || route === EVENTS_ROUTE) ? route : '';
}
