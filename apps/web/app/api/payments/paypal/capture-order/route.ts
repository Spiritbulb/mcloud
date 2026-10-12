// @route-kind: public — PayPal redirect target; only settles when the captured amount matches the order
// app/api/payments/paypal/capture-order/route.ts  
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@mcloud/db/server';
import { paypalAmounts, paypalCaptureMatches } from '@mcloud/merchant/payments';

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error(`PayPal token error: ${await res.text()}`);
  return (await res.json()).access_token as string;
}

async function capturePayPalOrder(paypalOrderId: string) {
  const accessToken = await getAccessToken();

  const res = await fetch(
    `${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error('PayPal capture error:', errText);
    throw new Error(`Capture failed: ${res.status}`);
  }

  return res.json();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paypalOrderId = searchParams.get('token');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (!paypalOrderId) {
    return NextResponse.redirect(`${appUrl}/cart?payment=error&reason=missing_token`);
  }

  try {
    const captureData = await capturePayPalOrder(paypalOrderId);
    const status = captureData?.status;

    if (status !== 'COMPLETED') {
      return NextResponse.redirect(
        `${appUrl}/cart?payment=error&reason=not_completed&status=${status}`
      );
    }

    // Get internal order from reference_id
    const referenceId = captureData?.purchase_units?.[0]?.reference_id as string | undefined;
    const captured = captureData?.purchase_units?.[0]?.payments?.captures?.[0]?.amount;

    if (!referenceId) {
      return NextResponse.redirect(`${appUrl}/cart?payment=error&reason=unknown_order`);
    }

    const supabase = await createServerClient();
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, shipping, metadata, order_items(title, price, quantity)')
      .eq('order_number', referenceId)
      .maybeSingle();

    if (!order) {
      return NextResponse.redirect(`${appUrl}/cart?payment=error&reason=unknown_order`);
    }

    // Already settled (a refresh of this URL, or a retry): nothing to change.
    if (order.status === 'paid') {
      return NextResponse.redirect(`${appUrl}/orders/${referenceId}?payment=success`);
    }

    const prior = (typeof order.metadata === 'object' && order.metadata ? order.metadata : {}) as Record<string, unknown>;
    const expected = paypalAmounts(
      (order.order_items ?? []).map((i) => ({ title: i.title ?? 'Item', price: Number(i.price), quantity: i.quantity })),
      Number(order.shipping ?? 0),
    );

    // Only mark paid when PayPal captured what the order costs, in USD. Money was taken
    // either way, so a mismatch is recorded for a human instead of silently dropped.
    if (captured?.currency_code !== 'USD' || !paypalCaptureMatches(captured?.value, expected.totalCents)) {
      console.error('PayPal capture amount mismatch', { referenceId, captured, expectedCents: expected.totalCents });
      await supabase.from('orders').update({
        metadata: {
          ...prior,
          payment_method: 'PayPal',
          payment_status: 'underpaid',
          paypal_order_id: paypalOrderId,
          paypal_captured_amount: captured ?? null,
        },
      }).eq('id', order.id);
      return NextResponse.redirect(`${appUrl}/cart?payment=error&reason=amount_mismatch`);
    }

    const { error } = await supabase
      .from('orders')
      .update({
        fulfillment_status: 'unfulfilled',
        status: 'paid',
        metadata: {
          ...prior,
          payment_method: 'PayPal',
          payment_status: 'completed',
          paypal_order_id: paypalOrderId,
          captured_at: new Date().toISOString(),
        },
      })
      .eq('id', order.id);

    if (error) {
      console.error('DB update error:', error);
    }

    return NextResponse.redirect(`${appUrl}/orders/${referenceId}?payment=success`);

  } catch (error) {
    console.error('GET capture-order error:', error);
    return NextResponse.redirect(`${appUrl}/cart?payment=error&reason=capture_failed`);
  }
}
