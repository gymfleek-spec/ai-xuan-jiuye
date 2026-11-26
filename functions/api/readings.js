import { guard } from '../_commercial/http.mjs';
import { postReading } from '../_commercial/handlers.mjs';
export const onRequestPost=guard(postReading);
