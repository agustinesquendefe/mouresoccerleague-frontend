import type { Event, EventFormData } from '@/models/event';

type SyncEventStripePriceInput = {
  event?: Event | null;
  payload: EventFormData;
};

type StripePriceResponse = {
  stripe_product_id: string;
  stripe_price_id: string;
};

export async function syncEventStripePrice({
  event,
  payload,
}: SyncEventStripePriceInput): Promise<StripePriceResponse> {
  const eventPrice = Number(payload.event_price);

  if (!Number.isFinite(eventPrice) || eventPrice <= 0) {
    return {
      stripe_product_id: payload.stripe_product_id ?? event?.stripe_product_id ?? '',
      stripe_price_id: payload.stripe_price_id ?? event?.stripe_price_id ?? '',
    };
  }

  const currentPrice = Number(event?.event_price ?? 0);
  const existingProductId = payload.stripe_product_id ?? event?.stripe_product_id ?? null;
  const existingPriceId = payload.stripe_price_id ?? event?.stripe_price_id ?? null;
  const priceUnchanged = Boolean(existingPriceId) && currentPrice === eventPrice;

  if (existingProductId && existingPriceId && priceUnchanged) {
    return {
      stripe_product_id: existingProductId,
      stripe_price_id: existingPriceId,
    };
  }

  const response = await fetch('/api/stripe/event-price', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventId: event?.id ?? null,
      eventName: payload.name,
      eventPrice,
      stripeProductId: existingProductId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to create Stripe price.');
  }

  return data as StripePriceResponse;
}
