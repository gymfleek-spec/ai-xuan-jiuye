import { guard } from '../_commercial/http.mjs';
import { getReportPage } from '../_commercial/handlers.mjs';
export const onRequestGet=guard(getReportPage);
