// app/api/payments/paypal/capture-order/route.ts  
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/server';

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
    const referenceId = captureData?.purchase_units?.[0]?.reference_id as string;

    // Update DB (no auth - public update by order_number)
    const supabase = await createServerClient();
    if (referenceId) {
      const { error } = await supabase
        .from('orders')
        .update({
          financial_status: 'paid',
          status: 'confirmed',
          metadata: {
            payment_method: 'PayPal',
            payment_status: 'completed',
            paypal_order_id: paypalOrderId,
            captured_at: new Date().toISOString(),
          },
        })
        .eq('order_number', referenceId);

      if (error) {
        console.error('DB update error:', error);
      }
    }

    return NextResponse.redirect(
      `${appUrl}/orders/${referenceId ?? ''}?payment=success`
    );

  } catch (error) {
    console.error('GET capture-order error:', error);
    return NextResponse.redirect(`${appUrl}/cart?payment=error&reason=capture_failed`);
  }
}
