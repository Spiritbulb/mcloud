import { NextRequest, NextResponse } from 'next/server';
import IntaSend from 'intasend-node';
import { createClient } from '@/lib/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            orderId,
            amount,
            currency = 'KES',
            customer
        } = body;

        if (!orderId || !amount || !customer) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Initialize IntaSend
        const intasend = new IntaSend(
            process.env.INTASEND_PUBLISHABLE_KEY!,
            process.env.INTASEND_SECRET_KEY!,
            process.env.INTASEND_TEST_MODE === 'true'
        );

        const collection = intasend.collection();

        // Create payment charge
        const chargeResponse = await collection.charge({
            first_name: customer.first_name,
            last_name: customer.last_name,
            email: customer.email,
            host: process.env.NEXT_PUBLIC_APP_URL,
            amount: parseFloat(amount),
            currency: currency,
            api_ref: orderId,
            redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}?payment=success`
        });

        // Update order with payment info
        const supabase = await createClient();

        const { error: updateError } = await supabase
            .from('orders')
            .update({
                metadata: {
                    intasend_invoice_id: chargeResponse.invoice?.invoice_id,
                    intasend_payment_id: chargeResponse.id,
                    payment_link: chargeResponse.url
                }
            })
            .eq('id', orderId);

        if (updateError) {
            console.error('Error updating order:', updateError);
        }

        // Create payment transaction record
        await supabase
            .from('payment_transactions')
            .insert({
                order_id: orderId,
                store_id: body.storeId,
                provider: 'intasend',
                transaction_id: chargeResponse.id,
                amount: parseFloat(amount),
                currency: currency,
                status: 'pending',
                metadata: {
                    invoice_id: chargeResponse.invoice?.invoice_id,
                    payment_link: chargeResponse.url,
                    api_ref: orderId
                }
            });

        return NextResponse.json({
            success: true,
            payment_url: chargeResponse.url,
            invoice_id: chargeResponse.invoice?.invoice_id,
            transaction_id: chargeResponse.id
        });

    } catch (error) {
        console.error('IntaSend payment error:', error);
        return NextResponse.json(
            {
                error: 'Payment initialization failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
