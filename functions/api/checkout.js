import { guard } from '../_commercial/http.mjs';
import { checkoutAvailability, postCheckout } from '../_commercial/handlers.mjs';
export const onRequestPost=guard(postCheckout);
export const onRequestGet=guard(checkoutAvailability);
