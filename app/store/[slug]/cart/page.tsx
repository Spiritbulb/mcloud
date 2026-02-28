'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import {
    Loader2, Plus, Minus, Trash2, ShoppingBag,
    Shield, Info, AlertCircle, Phone, Mail, MessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/client';
import { convertKEStoUSD, formatKES, formatUSD } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CopyButton } from '@/components/animate-ui/components/buttons/copy';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

interface GuestDetails {
    mpesaPhone: string;
    mpesaCode: string;
    whatsapp: string;      // optional, defaults to mpesaPhone if blank
    email: string;         // optional
}

const EMPTY_GUEST: GuestDetails = {
    mpesaPhone: '',
    mpesaCode: '',
    whatsapp: '',
    email: '',
};

export default function CartPage() {
    const {
        cartItems, loading, updateCartLine, removeFromCart,
        refreshCart, itemLoadingStates, clearCart, storeSlug,
    } = useCart();

    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'mpesa'>('mpesa');
    const [guest, setGuest] = useState<GuestDetails>(EMPTY_GUEST);

    const router = useRouter();
    const supabase = createClient();
    const safeCartItems = Array.isArray(cartItems) ? cartItems : [];

    useEffect(() => {
        if (!loading && cartItems.length > 0) refreshCart();
    }, []);

    const setField = (field: keyof GuestDetails) =>
        (e: React.ChangeEvent<HTMLInputElement>) =>
            setGuest(prev => ({ ...prev, [field]: e.target.value }));

    // ── Totals ──────────────────────────────────────────────────────
    const subtotalKES = safeCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingKES = 0;
    const totalKES = subtotalKES + shippingKES;
    const totalUSD = convertKEStoUSD(totalKES);

    // ── Validation ──────────────────────────────────────────────────
    const validateGuest = (): string | null => {
        if (paymentMethod === 'mpesa') {
            if (!guest.mpesaPhone.trim()) return 'M-PESA phone number is required';
            if (!/^(?:\+?254|0)[17]\d{8}$/.test(guest.mpesaPhone.trim()))
                return 'Enter a valid Kenyan phone number (e.g. 0712345678)';
            if (!guest.mpesaCode.trim()) return 'M-PESA transaction code is required';
            const code = guest.mpesaCode.trim().toUpperCase();
            if (!/^[A-Z0-9]{6,20}$/.test(code)) return 'Invalid M-PESA transaction code format';
        }
        if (guest.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email))
            return 'Enter a valid email address';
        return null;
    };

    // ── Create order (no auth required) ────────────────────────────
    const createOrder = async (): Promise<string> => {
        if (safeCartItems.length === 0) throw new Error('Your cart is empty');

        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id')
            .eq('slug', storeSlug)
            .eq('is_active', true)
            .single();

        if (storeError || !store) throw new Error('Store not found');

        // Upsert guest customer by mpesa_phone (or email fallback)
        const phoneKey = guest.mpesaPhone.trim() || null;
        const emailKey = guest.email.trim() || null;

        let customerId: string;
        const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('store_id', store.id)
            .eq('mpesa_phone', phoneKey)
            .maybeSingle();

        if (existing) {
            customerId = existing.id;
            // Update email/whatsapp if provided
            await supabase.from('customers').update({
                ...(emailKey && { email: emailKey }),
                whatsapp_number: guest.whatsapp.trim() || phoneKey,
            }).eq('id', customerId);
        } else {
            const { data: newCustomer, error: ce } = await supabase
                .from('customers')
                .insert({
                    store_id: store.id,
                    mpesa_phone: phoneKey,
                    email: emailKey,
                    whatsapp_number: guest.whatsapp.trim() || phoneKey,
                    first_name: 'Guest',
                    last_name: '',
                })
                .select('id')
                .single();
            if (ce || !newCustomer) throw ce ?? new Error('Failed to create customer');
            customerId = newCustomer.id;
        }

        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                store_id: store.id,
                customer_id: customerId,
                order_number: orderNumber,
                status: 'pending',
                financial_status: 'pending',
                fulfillment_status: 'unfulfilled',
                subtotal: subtotalKES,
                tax: 0,
                shipping: shippingKES,
                discount: 0,
                total: totalKES,
                currency: 'KES',
                customer_email: emailKey,
                metadata: {
                    payment_method: paymentMethod === 'mpesa' ? 'MPESA' : 'PayPal',
                    payment_status: 'pending',
                    mpesa_phone: phoneKey,
                    whatsapp_number: guest.whatsapp.trim() || phoneKey,
                },
            })
            .select('id, order_number')
            .single();

        if (orderError || !order) throw orderError ?? new Error('Failed to create order');

        const { error: itemsError } = await supabase.from('order_items').insert(
            safeCartItems.map(item => ({
                order_id: order.id,
                product_id: item.productId,
                variant_id: item.variantId !== item.productId ? item.variantId : null,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity,
                title: item.name,
                sku: item.variantId,
                image_url: item.image,
            }))
        );
        if (itemsError) throw itemsError;

        return orderNumber;
    };

    // ── M-PESA checkout ─────────────────────────────────────────────
    const handleMpesaCheckout = async () => {
        const validationError = validateGuest();
        if (validationError) { setError(validationError); return; }

        setError('');
        setIsProcessing(true);
        try {
            const orderNumber = await createOrder();
            const code = guest.mpesaCode.trim().toUpperCase();

            await supabase
                .from('orders')
                .update({
                    metadata: {
                        payment_method: 'MPESA',
                        payment_status: 'submitted',
                        mpesa_transaction_code: code,
                        mpesa_phone: guest.mpesaPhone.trim(),
                        whatsapp_number: guest.whatsapp.trim() || guest.mpesaPhone.trim(),
                    },
                })
                .eq('order_number', orderNumber);

            await clearCart();
            router.push(`/orders/${orderNumber}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Checkout failed');
        } finally {
            setIsProcessing(false);
        }
    };

    // ── PayPal checkout ─────────────────────────────────────────────
    const handlePaypalCheckout = async () => {
        setError('');
        setIsProcessing(true);
        try {
            const validItems = safeCartItems
                .filter(i => i.name?.trim() && i.price > 0 && i.quantity > 0)
                .map(i => ({
                    name: i.name.trim().slice(0, 100),
                    sku: i.variantId?.slice(-8) || 'N/A',
                    price: Math.max(0.01, Math.round(i.price * 100) / 100),
                    quantity: Math.max(1, Math.min(999, Math.floor(i.quantity))),
                }));

            if (!validItems.length) throw new Error('No valid items in cart');

            const orderNumber = await createOrder();

            const res = await fetch('/api/payments/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: orderNumber,
                    items: validItems,
                    totalKES: Number(totalKES.toFixed(2)),
                }),
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'PayPal setup failed');
            window.location.href = data.approvalUrl;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Checkout failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCheckout = () =>
        paymentMethod === 'mpesa' ? handleMpesaCheckout() : handlePaypalCheckout();

    // ── Render ──────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">

                {loading ? (
                    <div className="flex justify-center items-center min-h-[400px]">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    </div>

                ) : safeCartItems.length === 0 ? (
                    <div className="text-center py-12 sm:py-20 px-4">
                        <Card className="max-w-md mx-auto border-border/50">
                            <CardContent className="pt-10 pb-10">
                                <div className="w-20 h-20 bg-muted flex items-center justify-center mx-auto mb-6">
                                    <ShoppingBag className="w-10 h-10 text-muted-foreground" />
                                </div>
                                <h3 className="text-2xl font-light mb-3">Your cart is empty</h3>
                                <p className="text-muted-foreground mb-6 font-light text-sm">
                                    Discover our amazing collection of products.
                                </p>
                                <Button size="lg" onClick={() => router.push(`/store/${storeSlug}/products`)}>
                                    <ShoppingBag className="mr-2 h-5 w-5" />
                                    Start Shopping
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

                        {/* ── Cart items ── */}
                        <div className="lg:col-span-8">
                            <Card className="border-border/50">
                                <CardHeader className="px-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg sm:text-xl font-light">
                                            Shopping Cart ({safeCartItems.length})
                                        </CardTitle>
                                        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                                            <Shield className="w-4 h-4" />
                                            <span>Secure checkout</span>
                                        </div>
                                    </div>
                                </CardHeader>

                                <Separator />

                                <CardContent className="p-0">
                                    <div className="divide-y">
                                        {safeCartItems.map((item) => (
                                            <div key={item.variantId} className="p-4 sm:p-6 hover:bg-muted/30 transition-colors">
                                                <div className="flex gap-3 sm:gap-6">
                                                    <div className="relative flex-shrink-0">
                                                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-muted overflow-hidden relative">
                                                            <Image
                                                                src={item.image || '/api/placeholder/200/200'}
                                                                alt={item.name}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                        <Button
                                                            variant="destructive"
                                                            size="icon"
                                                            onClick={() => removeFromCart(item.variantId)}
                                                            disabled={itemLoadingStates[item.variantId]}
                                                            className="absolute -top-2 -right-2 h-6 w-6"
                                                        >
                                                            {itemLoadingStates[item.variantId]
                                                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                                                : <Trash2 className="h-3 w-3" />}
                                                        </Button>
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-normal text-sm sm:text-base mb-1 line-clamp-2">{item.name}</h3>
                                                        <p className="text-xs text-muted-foreground mb-3">SKU: {item.variantId?.slice(-8) || 'N/A'}</p>

                                                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                                                            <div className="flex items-center border w-fit">
                                                                <Button
                                                                    variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10"
                                                                    onClick={() => updateCartLine(item.variantId, item.quantity - 1)}
                                                                    disabled={itemLoadingStates[item.variantId] || item.quantity <= 1}
                                                                >
                                                                    <Minus className="h-3 w-3" />
                                                                </Button>
                                                                <div className="w-10 sm:w-12 flex items-center justify-center">
                                                                    <span className="font-normal text-sm">{item.quantity}</span>
                                                                </div>
                                                                <Button
                                                                    variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10"
                                                                    onClick={() => updateCartLine(item.variantId, item.quantity + 1)}
                                                                    disabled={itemLoadingStates[item.variantId]}
                                                                >
                                                                    {itemLoadingStates[item.variantId]
                                                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                        : <Plus className="h-3 w-3" />}
                                                                </Button>
                                                            </div>

                                                            <div className="text-left sm:text-right">
                                                                <div className="text-base sm:text-xl font-light text-primary">{formatKES(item.price)}</div>
                                                                <div className="text-xs text-muted-foreground">{formatKES(item.price * item.quantity)} total</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* ── Order summary + checkout ── */}
                        <div className="lg:col-span-4">
                            <div className="lg:sticky lg:top-24 space-y-4">

                                <Card className="border-border/50">
                                    <CardHeader className="px-4 sm:px-6">
                                        <CardTitle className="text-lg sm:text-xl font-light flex items-center gap-3">
                                            <div className="w-8 h-8 bg-primary flex items-center justify-center flex-shrink-0">
                                                <ShoppingBag className="w-4 h-4 text-primary-foreground" />
                                            </div>
                                            Order Summary
                                        </CardTitle>
                                    </CardHeader>

                                    <Separator />

                                    <CardContent className="space-y-4 pt-5 px-4 sm:px-6">
                                        {/* Totals */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Subtotal</span>
                                                <span>{formatKES(subtotalKES)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Shipping</span>
                                                <span>{formatKES(shippingKES)}</span>
                                            </div>
                                            <Separator />
                                            <div className="flex justify-between items-center">
                                                <span className="text-base font-normal">Total</span>
                                                <span className="text-2xl font-light text-primary">{formatKES(totalKES)}</span>
                                            </div>
                                        </div>

                                        {/* Payment method toggle */}
                                        <div className="space-y-2">
                                            <Label className="text-sm font-normal">Payment method</Label>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant={paymentMethod === 'mpesa' ? 'default' : 'outline'}
                                                    className="flex-1"
                                                    onClick={() => setPaymentMethod('mpesa')}
                                                    disabled={isProcessing}
                                                >
                                                    M-PESA
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={paymentMethod === 'paypal' ? 'default' : 'outline'}
                                                    className="flex-1"
                                                    onClick={() => setPaymentMethod('paypal')}
                                                    disabled={isProcessing}
                                                >
                                                    PayPal
                                                </Button>
                                            </div>
                                        </div>

                                        {/* ── Guest details form ── */}
                                        {paymentMethod === 'mpesa' && (
                                            <div className="space-y-3">
                                                {/* M-PESA instructions */}
                                                <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                                                    <ol className="space-y-2 leading-relaxed list-decimal pl-4">
                                                        <li>M-PESA Menu → Lipa na M-PESA → Buy Goods and Services</li>
                                                        <li className="space-y-1">
                                                            <div>Enter Business Number</div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="inline-flex items-center rounded border bg-background px-2 py-1 font-mono text-foreground">
                                                                    4202518
                                                                </span>
                                                                <CopyButton content="4202518" size="xs" />
                                                            </div>
                                                        </li>
                                                        <li>
                                                            Amount:{' '}
                                                            <span className="rounded border bg-background px-1.5 py-0.5 font-semibold text-foreground">
                                                                {formatKES(totalKES)}
                                                            </span>
                                                        </li>
                                                        <li>Enter PIN and send</li>
                                                        <li>Paste the confirmation code below</li>
                                                    </ol>
                                                </div>

                                                {/* M-PESA phone — required */}
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="mpesa-phone" className="text-sm flex items-center gap-1.5">
                                                        <Phone className="w-3.5 h-3.5" />
                                                        M-PESA Phone Number <span className="text-destructive">*</span>
                                                    </Label>
                                                    <Input
                                                        id="mpesa-phone"
                                                        value={guest.mpesaPhone}
                                                        onChange={setField('mpesaPhone')}
                                                        placeholder="0712 345 678"
                                                        inputMode="tel"
                                                        autoComplete="tel"
                                                        disabled={isProcessing}
                                                    />
                                                </div>

                                                {/* M-PESA transaction code — required */}
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="mpesa-code" className="text-sm flex items-center gap-1.5">
                                                        M-PESA Transaction Code <span className="text-destructive">*</span>
                                                    </Label>
                                                    <Input
                                                        id="mpesa-code"
                                                        value={guest.mpesaCode}
                                                        onChange={(e) => setGuest(p => ({ ...p, mpesaCode: e.target.value.toUpperCase() }))}
                                                        placeholder="e.g. QW12ABCDEF"
                                                        inputMode="text"
                                                        autoComplete="off"
                                                        disabled={isProcessing}
                                                    />
                                                </div>

                                                {/* WhatsApp — optional */}
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="whatsapp" className="text-sm flex items-center gap-1.5">
                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                        WhatsApp Number
                                                        <span className="text-muted-foreground text-xs">(if different from M-PESA)</span>
                                                    </Label>
                                                    <Input
                                                        id="whatsapp"
                                                        value={guest.whatsapp}
                                                        onChange={setField('whatsapp')}
                                                        placeholder="0712 345 678"
                                                        inputMode="tel"
                                                        autoComplete="tel"
                                                        disabled={isProcessing}
                                                    />
                                                </div>

                                                {/* Email — optional */}
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="email" className="text-sm flex items-center gap-1.5">
                                                        <Mail className="w-3.5 h-3.5" />
                                                        Email Address
                                                        <span className="text-muted-foreground text-xs">(optional, for receipt)</span>
                                                    </Label>
                                                    <Input
                                                        id="email"
                                                        value={guest.email}
                                                        onChange={setField('email')}
                                                        placeholder="you@example.com"
                                                        inputMode="email"
                                                        autoComplete="email"
                                                        type="email"
                                                        disabled={isProcessing}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {paymentMethod === 'paypal' && (
                                            <Alert className="border-blue-200 bg-blue-50">
                                                <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                                <AlertTitle className="text-blue-800 text-sm font-normal">Payment in USD</AlertTitle>
                                                <AlertDescription className="text-xs text-blue-700">
                                                    You'll be charged approximately <strong>{formatUSD(totalUSD)}</strong> USD.
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {error && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription className="text-sm">{error}</AlertDescription>
                                            </Alert>
                                        )}

                                        <Button size="lg" className="w-full" disabled={isProcessing} onClick={handleCheckout}>
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    {paymentMethod === 'mpesa' ? 'Submitting…' : 'Redirecting to PayPal…'}
                                                </>
                                            ) : paymentMethod === 'mpesa' ? (
                                                <><Shield className="mr-2 h-4 w-4" /> Confirm M-PESA Payment</>
                                            ) : (
                                                <><Shield className="mr-2 h-4 w-4" /> Pay with PayPal · {formatUSD(totalUSD)}</>
                                            )}
                                        </Button>

                                        <Button variant="outline" className="w-full" asChild>
                                            <Link href={`/store/${storeSlug}/products`}>Continue Shopping</Link>
                                        </Button>

                                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted p-3">
                                            <Shield className="w-4 h-4 flex-shrink-0" />
                                            <span>
                                                {paymentMethod === 'mpesa'
                                                    ? 'M-PESA payment requires transaction confirmation'
                                                    : 'Secure payment powered by PayPal'}
                                            </span>
                                        </div>

                                        <p className="text-xs text-muted-foreground text-center leading-relaxed">
                                            By completing your purchase you agree to our{' '}
                                            <Link href="/terms" className="text-primary hover:underline">Terms</Link>{' '}and{' '}
                                            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
