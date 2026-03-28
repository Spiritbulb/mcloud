// app/store/[slug]/account/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { createCustomerClient } from '@/lib/customer-client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, User, MapPin, Heart, LogOut } from 'lucide-react'
import type { Tables } from '@/app/types/database.types'

type Order = Tables<'orders'> & { order_items: Tables<'order_items'>[] }
type Customer = Tables<'customers'>
type WishlistProduct = Tables<'products'>

type Tab = 'orders' | 'profile' | 'addresses' | 'wishlist'

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'orders', label: 'Orders', icon: <Package className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'addresses', label: 'Addresses', icon: <MapPin className="w-4 h-4" /> },
    { id: 'wishlist', label: 'Wishlist', icon: <Heart className="w-4 h-4" /> },
]

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        completed: 'bg-green-50 text-green-700',
        pending: 'bg-amber-50 text-amber-700',
        cancelled: 'bg-red-50 text-red-600',
    }
    return (
        <span className={`text-xs px-2 py-0.5 font-medium ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
            {status}
        </span>
    )
}

export default function DashboardPage() {
    const { user, signOut } = useCustomerAuth()
    const { wishlistIds, toggle } = useWishlist()
    const supabase = createCustomerClient()
    const params = useParams<{ slug: string }>()
    const router = useRouter()

    const [tab, setTab] = useState<Tab>('orders')
    const [customer, setCustomer] = useState<Customer | null>(null)
    const [orders, setOrders] = useState<Order[]>([])
    const [wishlistProducts, setWishlistProducts] = useState<WishlistProduct[]>([])
    const [loading, setLoading] = useState(true)

    // Profile fields
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [phone, setPhone] = useState('')
    const [saving, setSaving] = useState(false)
    const [saveMsg, setSaveMsg] = useState<string | null>(null)

    // Address fields (simple single address for now)
    const [addrLine1, setAddrLine1] = useState('')
    const [addrCity, setAddrCity] = useState('')
    const [addrCountry, setAddrCountry] = useState('Kenya')
    const [savingAddr, setSavingAddr] = useState(false)

    useEffect(() => { if (user) load() }, [user])

    // Load wishlist products when wishlistIds or tab changes
    useEffect(() => {
        if (tab === 'wishlist' && wishlistIds.size > 0) loadWishlistProducts()
        if (tab === 'wishlist' && wishlistIds.size === 0) setWishlistProducts([])
    }, [tab, wishlistIds])

    const load = async () => {
        setLoading(true)

        const { data: store } = await supabase
            .from('stores').select('id').eq('slug', params.slug).single()
        if (!store) return setLoading(false)

        // Fetch customer first — we need their id to scope orders correctly
        const { data: c } = await supabase
            .from('customers')
            .select('*')
            .eq('store_id', store.id)
            .eq('email', user!.email!)
            .single()

        if (c) {
            setCustomer(c)
            setFirstName(c.first_name ?? '')
            setLastName(c.last_name ?? '')
            setPhone(c.phone ?? '')
            const addrs = Array.isArray(c.addresses) ? c.addresses as any[] : []
            if (addrs[0]) {
                setAddrLine1(addrs[0].line1 ?? '')
                setAddrCity(addrs[0].city ?? '')
                setAddrCountry(addrs[0].country ?? 'Kenya')
            }
        }

        // Now fetch orders scoped to this customer record
        // If no customer record exists yet, orders will correctly return empty
        const { data: o } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('store_id', store.id)
            .eq('customer_id', c?.id ?? '')
            .order('created_at', { ascending: false })
            .limit(20)

        setOrders((o as Order[]) ?? [])
        setLoading(false)

        const { data: emailOrders } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('store_id', store.id)
            .eq('customer_email', user!.email!)
            .is('customer_id', null)          // only unlinked ones, avoid dupes
            .order('created_at', { ascending: false })
            .limit(20)

        const allOrders = [
            ...((o as Order[]) ?? []),
            ...((emailOrders as Order[]) ?? []),
        ].sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())

        setOrders(allOrders)
    }



    const loadWishlistProducts = async () => {
        const ids = [...wishlistIds]
        const { data } = await supabase.from('products').select('*').in('id', ids)
        setWishlistProducts(data ?? [])
    }

    const saveProfile = async () => {
        if (!customer) return
        setSaving(true)
        const { error } = await supabase.from('customers')
            .update({ first_name: firstName, last_name: lastName, phone })
            .eq('id', customer.id)
        setSaveMsg(error ? 'Failed to save.' : 'Changes saved.')
        setTimeout(() => setSaveMsg(null), 3000)
        setSaving(false)
    }

    const saveAddress = async () => {
        if (!customer) return
        setSavingAddr(true)
        const addresses = [{ line1: addrLine1, city: addrCity, country: addrCountry, label: 'Default' }]
        await supabase.from('customers').update({ addresses }).eq('id', customer.id)
        setSavingAddr(false)
    }

    const handleSignOut = async () => {
        await signOut()
        router.push(`/store/${params.slug}`)
    }

    const fmt = (amount: number, currency: string) =>
        new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="h-7 w-7 rounded-full border-2 border-black border-t-transparent animate-spin" />
        </div>
    )

    return (
        <div className="min-h-screen bg-white">
            {/* Top bar */}
            <div className="border-b">
                <div className="container mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-medium">
                            {(firstName || user?.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-medium leading-none">
                                {firstName ? `${firstName} ${lastName}`.trim() : 'My Account'}
                            </p>
                            <p className="text-xs text-muted-foreground">{user?.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href={`/store/${params.slug}`} className="text-sm text-muted-foreground hover:text-black transition-colors">
                            ← Back to store
                        </Link>
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-black transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Tab nav */}
                <div className="flex gap-1 border-b mb-8">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${tab === t.id
                                ? 'border-black text-black'
                                : 'border-transparent text-muted-foreground hover:text-black'
                                }`}
                        >
                            {t.icon}
                            {t.label}
                            {t.id === 'wishlist' && wishlistIds.size > 0 && (
                                <span className="ml-0.5 text-xs bg-black text-white rounded-full w-4 h-4 flex items-center justify-center">
                                    {wishlistIds.size}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── ORDERS ── */}
                {tab === 'orders' && (
                    <div className="space-y-3">
                        {orders.length === 0 ? (
                            <div className="text-center py-20 space-y-3">
                                <Package className="w-10 h-10 mx-auto text-gray-200" />
                                <p className="text-sm text-muted-foreground">No orders yet</p>
                                <Link href={`/store/${params.slug}`} className="text-sm underline underline-offset-4">
                                    Start shopping
                                </Link>
                            </div>
                        ) : orders.map(order => (
                            <div key={order.id} className="border p-4 space-y-3 hover:border-black/30 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium">{order.order_number}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(order.created_at!).toLocaleDateString('en-KE', {
                                                day: 'numeric', month: 'short', year: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-sm font-medium">{fmt(order.total, order.currency)}</p>
                                        <StatusBadge status={order.status} />
                                    </div>
                                </div>
                                {order.order_items?.length > 0 && (
                                    <div className="border-t pt-3 space-y-1">
                                        {order.order_items.map(item => (
                                            <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                                                <span>{item.title} × {item.quantity}</span>
                                                <span>{fmt(item.total, order.currency)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <Link
                                    href={`/orders/${order.order_number}`}
                                    className="text-xs underline underline-offset-4 text-muted-foreground hover:text-black"
                                >
                                    View details →
                                </Link>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── PROFILE ── */}
                {tab === 'profile' && (
                    <div className="max-w-md space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">First name</label>
                                <input
                                    value={firstName}
                                    onChange={e => setFirstName(e.target.value)}
                                    className="w-full border-b border-gray-300 focus:border-black outline-none py-2 text-sm bg-transparent transition-colors"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Last name</label>
                                <input
                                    value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                    className="w-full border-b border-gray-300 focus:border-black outline-none py-2 text-sm bg-transparent transition-colors"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Email</label>
                            <input
                                value={user?.email ?? ''}
                                disabled
                                className="w-full border-b border-gray-200 py-2 text-sm text-muted-foreground bg-transparent cursor-not-allowed"
                            />
                            <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Phone / M-Pesa</label>
                            <input
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="e.g. 0712345678"
                                className="w-full border-b border-gray-300 focus:border-black outline-none py-2 text-sm bg-transparent transition-colors"
                            />
                        </div>
                        <div className="flex items-center gap-4 pt-2">
                            <button
                                onClick={saveProfile}
                                disabled={saving}
                                className="bg-black text-white px-6 py-2 text-sm hover:bg-black/80 transition-colors disabled:opacity-40"
                            >
                                {saving ? 'Saving…' : 'Save changes'}
                            </button>
                            {saveMsg && <span className="text-sm text-muted-foreground">{saveMsg}</span>}
                        </div>
                    </div>
                )}

                {/* ── ADDRESSES ── */}
                {tab === 'addresses' && (
                    <div className="max-w-md space-y-5">
                        <p className="text-sm text-muted-foreground">Default delivery address</p>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Street address</label>
                                <input
                                    value={addrLine1}
                                    onChange={e => setAddrLine1(e.target.value)}
                                    placeholder="e.g. 123 Moi Avenue"
                                    className="w-full border-b border-gray-300 focus:border-black outline-none py-2 text-sm bg-transparent transition-colors"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">City</label>
                                    <input
                                        value={addrCity}
                                        onChange={e => setAddrCity(e.target.value)}
                                        placeholder="Nairobi"
                                        className="w-full border-b border-gray-300 focus:border-black outline-none py-2 text-sm bg-transparent transition-colors"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Country</label>
                                    <input
                                        value={addrCountry}
                                        onChange={e => setAddrCountry(e.target.value)}
                                        className="w-full border-b border-gray-300 focus:border-black outline-none py-2 text-sm bg-transparent transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={saveAddress}
                            disabled={savingAddr}
                            className="bg-black text-white px-6 py-2 text-sm hover:bg-black/80 transition-colors disabled:opacity-40"
                        >
                            {savingAddr ? 'Saving…' : 'Save address'}
                        </button>
                    </div>
                )}

                {/* ── WISHLIST ── */}
                {tab === 'wishlist' && (
                    <div>
                        {wishlistIds.size === 0 ? (
                            <div className="text-center py-20 space-y-3">
                                <Heart className="w-10 h-10 mx-auto text-gray-200" />
                                <p className="text-sm text-muted-foreground">Your wishlist is empty</p>
                                <Link href={`/store/${params.slug}`} className="text-sm underline underline-offset-4">
                                    Browse products
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {wishlistProducts.map(product => {
                                    const image = (product.images as string[])?.[0]
                                    return (
                                        <div key={product.id} className="group relative border hover:border-black/30 transition-colors">
                                            <Link href={`/store/${params.slug}/${product.slug}`}>
                                                <div className="aspect-square bg-gray-50 overflow-hidden">
                                                    {image ? (
                                                        <img src={image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Package className="w-8 h-8 text-gray-200" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-3 space-y-0.5">
                                                    <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                                                    <p className="text-sm text-muted-foreground">{fmt(product.price, 'KES')}</p>
                                                </div>
                                            </Link>
                                            <button
                                                onClick={() => toggle(product.id, product.store_id)}
                                                className="absolute top-2 right-2 w-7 h-7 bg-white border flex items-center justify-center hover:bg-red-50 transition-colors"
                                                title="Remove from wishlist"
                                            >
                                                <Heart className="w-3.5 h-3.5 fill-black text-black" />
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}