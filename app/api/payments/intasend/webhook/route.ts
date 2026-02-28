import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        console.log('IntaSend webhook received:', body);

        const {
            invoice_id,
            state,
            api_ref, // This is our order_id
            value,
            account,
            mpesa_reference,
            card_reference
        } = body;

        const supabase = await createClient();

        // Find the order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, store_id')
            .eq('order_number', api_ref)
            .single();

        if (orderError || !order) {
            console.error('Order not found:', api_ref);
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        // Update payment transaction status
        const { error: transactionError } = await supabase
            .from('payment_transactions')
            .update({
                status: state === 'COMPLETE' ? 'completed' :
                    state === 'FAILED' ? 'failed' : 'pending',
                metadata: {
                    invoice_id,
                    mpesa_reference,
                    card_reference,
                    account,
                    completed_at: state === 'COMPLETE' ? new Date().toISOString() : null
                }
            })
            .eq('order_id', order.id)
            .eq('provider', 'intasend');

        if (transactionError) {
            console.error('Transaction update error:', transactionError);
        }

        // Update order status if payment is complete
        if (state === 'COMPLETE') {
            const { error: orderUpdateError } = await supabase
                .from('orders')
                .update({
                    financial_status: 'paid',
                    status: 'paid',
                    metadata: {
                        payment_completed_at: new Date().toISOString(),
                        payment_reference: mpesa_reference || card_reference
                    }
                })
                .eq('id', order.id);

            if (orderUpdateError) {
                console.error('Order update error:', orderUpdateError);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Webhook processing error:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}
