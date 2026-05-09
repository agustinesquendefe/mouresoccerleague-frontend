import { NextResponse } from 'next/server';

type RequestBody = {
  eventId?: number | null;
  eventName: string;
  eventPrice: number;
  stripeProductId?: string | null;
};

function getStripeSecretKey() {
  return process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
}

function toStripeAmount(value: number) {
  return Math.round(value * 100);
}

async function stripeRequest<T>(
  path: string,
  body: URLSearchParams,
  secretKey: string
): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message ?? 'Stripe request failed';
    throw new Error(message);
  }

  return data as T;
}

export async function POST(request: Request) {
  try {
    const secretKey = getStripeSecretKey();

    if (!secretKey) {
      return NextResponse.json(
        { error: 'Stripe secret key is not configured.' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as RequestBody;
    const eventName = body.eventName?.trim();
    const eventPrice = Number(body.eventPrice);

    if (!eventName) {
      return NextResponse.json({ error: 'Event name is required.' }, { status: 400 });
    }

    if (!Number.isFinite(eventPrice) || eventPrice <= 0) {
      return NextResponse.json(
        { error: 'Event price must be greater than zero.' },
        { status: 400 }
      );
    }

    let stripeProductId = body.stripeProductId ?? null;

    if (!stripeProductId) {
      const productBody = new URLSearchParams({
        name: eventName,
      });

      if (body.eventId) {
        productBody.set('metadata[event_id]', String(body.eventId));
      }

      const product = await stripeRequest<{ id: string }>('products', productBody, secretKey);
      stripeProductId = product.id;
    }

    const priceBody = new URLSearchParams({
      currency: 'usd',
      product: stripeProductId,
      unit_amount: String(toStripeAmount(eventPrice)),
    });

    if (body.eventId) {
      priceBody.set('metadata[event_id]', String(body.eventId));
    }

    const price = await stripeRequest<{ id: string }>('prices', priceBody, secretKey);

    return NextResponse.json({
      stripe_product_id: stripeProductId,
      stripe_price_id: price.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create Stripe price.' },
      { status: 500 }
    );
  }
}
