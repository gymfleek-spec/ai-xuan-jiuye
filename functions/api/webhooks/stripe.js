import { guard } from '../../_commercial/http.mjs';
import { postStripeWebhook } from '../../_commercial/handlers.mjs';
export const onRequestPost=guard(postStripeWebhook);
