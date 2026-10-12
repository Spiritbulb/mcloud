// @route-kind: public — buyer-initiated; priced from the stored order, never from the request
// app/api/payments/paypal/create-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@mcloud/db/server';
import { centsToUsd, orderIsPayable, paypalAmounts } from '@mcloud/merchant/payments';

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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal token error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    // `items` and `totalKES` from the client are ignored: the order is priced from the
    // lines stored when the checkout created it.
    const { orderId } = await req.json();

    if (typeof orderId !== 'string' || !orderId) {
      return NextResponse.json({ success: false, error: 'Missing orderId' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, shipping, metadata, stores(slug), order_items(title, price, quantity)')
      .eq('order_number', orderId)
      .maybeSingle();

    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    if (!orderIsPayable(order)) {
      return NextResponse.json({ success: false, error: 'Order is not awaiting payment' }, { status: 409 });
    }

    const amounts = paypalAmounts(
      (order.order_items ?? []).map((i) => ({ title: i.title ?? 'Item', price: Number(i.price), quantity: i.quantity })),
      Number(order.shipping ?? 0),
    );
    if (amounts.lines.length === 0 || amounts.totalCents <= 0) {
      return NextResponse.json({ success: false, error: 'Order has nothing to pay' }, { status: 400 });
    }

    const paypalItems = amounts.lines.slice(0, 250).map((line, index) => ({
      name: String(line.title || `Item ${index + 1}`).slice(0, 127).trim(),
      unit_amount: { currency_code: 'USD', value: centsToUsd(line.unitCents) },
      quantity: String(line.quantity), // PayPal requires a string
    }));
    const itemsTotalUSD = centsToUsd(amounts.itemCents);
    const orderTotalUSD = centsToUsd(amounts.totalCents);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const body = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: orderId.slice(0, 32),
        description: `Order ${orderId.slice(0, 127)}`,
        amount: {
          currency_code: 'USD',
          value: orderTotalUSD,
          breakdown: {
            item_total: { currency_code: 'USD', value: itemsTotalUSD },
            shipping: { currency_code: 'USD', value: centsToUsd(amounts.shippingCents) },
            tax_total: { currency_code: 'USD', value: '0.00' },
          },
        },
        items: paypalItems,
      }],
      application_context: {
        return_url: `${appUrl}/api/payments/paypal/capture-order`,
        cancel_url: `${appUrl}/store/${order.stores?.slug ?? ''}/cart?payment=cancelled`,
        brand_name: process.env.NEXT_PUBLIC_STORE_NAME?.slice(0, 127) || "Menengai Store",
        locale: 'en-US',
        landing_page: 'BILLING',
        shipping_preference: 'NO_SHIPPING',
        payment_method: 'IMMEDIATE_PAYMENT',
      },
    };

    const accessToken = await getAccessToken();
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
      body: JSON.stringify(body),
    });

    const orderText = await orderRes.text();

    if (!orderRes.ok) {
      console.error('❌ PayPal ERROR', orderRes.status, orderText);
      try {
        const errorData = JSON.parse(orderText);
        return NextResponse.json({
          success: false,
          error: `PayPal ${orderRes.status}: ${errorData.message || JSON.stringify(errorData.details)}`,
        }, { status: orderRes.status });
      } catch {
        return NextResponse.json({
          success: false,
          error: `PayPal ${orderRes.status}: ${orderText.slice(0, 300)}`,
        }, { status: orderRes.status });
      }
    }

    const orderData = JSON.parse(orderText);
    const approvalLink = orderData.links?.find((l: any) =>
      l.rel === 'payer-action' || l.rel === 'approve'
    )?.href;

    if (!approvalLink) {
      return NextResponse.json({
        success: false,
        error: 'No approval URL from PayPal',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orderID: orderData.id,
      approvalUrl: approvalLink,
    });

  } catch (error) {
    console.error('💥 PayPal create-order failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Server error',
    }, { status: 500 });
  }
}
