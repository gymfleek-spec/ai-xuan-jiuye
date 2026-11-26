import { guard } from '../../_commercial/http.mjs';
import { getReport } from '../../_commercial/handlers.mjs';
export const onRequestGet=guard(getReport);
