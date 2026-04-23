// app/api/store/[slug]/reviews/route.ts
import { createClient } from '@/lib/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('product_id')

    if (!productId) return NextResponse.json({ error: 'product_id required' }, { status: 400 })

    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    const { data: reviews, error } = await supabase
        .from('product_reviews')
        .select(`
            id, rating, title, body, is_verified_purchase,
            helpful_count, created_at,
            customer:customers(first_name, last_name)
        `)
        .eq('product_id', productId)
        .eq('store_id', store.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ reviews })
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params
    const body = await req.json()
    const { product_id, customer_id, rating, title, review_body } = body
    if (!product_id || !customer_id || !rating || !review_body) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })



    // Duplicate check
    const { data: existing } = await supabase
        .from('product_reviews')
        .select('id')
        .eq('customer_id', customer_id)
        .eq('product_id', product_id)
        .eq('store_id', store.id)
        .maybeSingle()

    if (existing) {
        return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 409 })
    }

    // Verified purchase check — direct, no fuzzy matching
    const { data: orderItem } = await supabase
        .from('order_items')
        .select('order_id, order:orders!inner(customer_id, status)')
        .eq('product_id', product_id)
        .eq('order.customer_id', customer_id)
        .in('order.status', ['paid', 'fulfilled'])
        .maybeSingle()

    const isVerifiedPurchase = !!orderItem
    const orderId = orderItem?.order_id ?? null

    const { data: review, error } = await supabase
        .from('product_reviews')
        .insert({
            store_id: store.id,
            product_id,
            customer_id,
            order_id: orderId,
            rating,
            title: title?.trim() || null,
            body: review_body.trim(),
            is_verified_purchase: isVerifiedPurchase,
            is_published: false,   // always goes to moderation queue
        })
        .select('id, rating, title, body, is_verified_purchase, helpful_count, created_at')
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ review }, { status: 201 })
}