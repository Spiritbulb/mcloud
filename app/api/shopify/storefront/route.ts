// app/api/shopify/storefront/route.ts
import { NextResponse } from 'next/server';

const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_PUBLIC_ACCESS_TOKEN;
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;

interface ShopifyRequestBody {
    query: string;
    variables?: Record<string, unknown>;
}

interface ShopifyResponse {
    data?: unknown;
    errors?: unknown;
}

export async function POST(request: Request): Promise<NextResponse<ShopifyResponse | { error: string }>> {
    try {
        const { query, variables }: ShopifyRequestBody = await request.json();

        const response: Response = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/api/2026-01/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN as string,
            },
            body: JSON.stringify({
                query,
                variables,
            }),
        });

        const data: ShopifyResponse = await response.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error('Shopify API error:', error);
        return NextResponse.json(
            { error: 'Failed to communicate with Shopify' },
            { status: 500 }
        );
    }
}