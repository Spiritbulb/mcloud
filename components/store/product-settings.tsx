'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ChevronDown, ChevronUp, Eye, EyeOff, Package } from 'lucide-react'
import ImageUpload from './image-upload'

interface Variant {
    id?: string
    name: string
    sku: string
    price: string
    compare_at_price: string
    inventory_quantity: string
    is_active: boolean
    options: Record<string, string>
}

interface Product {
    id: string
    name: string
    slug: string
    description: string | null
    price: number
    compare_at_price: number | null
    inventory_quantity: number
    is_active: boolean
    images: string[]
    sku: string | null
    track_inventory: boolean
}

const EMPTY_VARIANT: Variant = {
    name: '',
    sku: '',
    price: '',
    compare_at_price: '',
    inventory_quantity: '0',
    is_active: true,
    options: {},
}

function slugify(str: string) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function ProductForm({
    storeId,
    currency,
    product,
    onSaved,
    onCancel,
}: {
    storeId: string
    currency: string
    product?: Product
    onSaved: () => void
    onCancel: () => void
}) {
    const isEdit = !!product

    const [name, setName] = useState(product?.name ?? '')
    const [slug, setSlug] = useState(product?.slug ?? '')
    const [description, setDescription] = useState(product?.description ?? '')
    const [price, setPrice] = useState(String(product?.price ?? ''))
    const [compareAtPrice, setCompareAtPrice] = useState(String(product?.compare_at_price ?? ''))
    const [sku, setSku] = useState(product?.sku ?? '')
    const [inventory, setInventory] = useState(String(product?.inventory_quantity ?? '0'))
    const [trackInventory, setTrackInventory] = useState(product?.track_inventory ?? true)
    const [isActive, setIsActive] = useState(product?.is_active ?? true)
    const [images, setImages] = useState<string[]>(product?.images ?? [])
    const [variants, setVariants] = useState<Variant[]>([])
    const [showVariants, setShowVariants] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!isEdit) setSlug(slugify(name))
    }, [name, isEdit])

    useEffect(() => {
        if (!isEdit || !product?.id) return
        const supabase = createClient()
        supabase
            .from('product_variants')
            .select('*')
            .eq('product_id', product.id)
            .order('position')
            .then(({ data }) => {
                if (data?.length) {
                    setVariants(data.map((v) => ({
                        id: v.id,
                        name: v.name,
                        sku: v.sku ?? '',
                        price: String(v.price),
                        compare_at_price: String(v.compare_at_price ?? ''),
                        inventory_quantity: String(v.inventory_quantity),
                        is_active: v.is_active,
                        options: v.options ?? {},
                    })))
                    setShowVariants(true)
                }
            })
    }, [isEdit, product?.id])

    const handleSave = async () => {
        if (!name.trim() || !price.trim()) {
            setError('Name and price are required.')
            return
        }
        setError('')
        setSaving(true)
        const supabase = createClient()

        const payload = {
            store_id: storeId,
            name: name.trim(),
            slug: slug.trim() || slugify(name),
            description: description || null,
            price: parseFloat(price),
            compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : null,
            sku: sku || null,
            inventory_quantity: parseInt(inventory) || 0,
            track_inventory: trackInventory,
            is_active: isActive,
            images,
            updated_at: new Date().toISOString(),
        }

        let productId = product?.id

        if (isEdit) {
            await supabase.from('products').update(payload).eq('id', productId!)
        } else {
            const { data } = await supabase.from('products').insert(payload).select('id').single()
            productId = data?.id
        }

        if (productId && variants.length > 0) {
            for (let i = 0; i < variants.length; i++) {
                const v = variants[i]
                const varPayload = {
                    product_id: productId,
                    name: v.name,
                    sku: v.sku || null,
                    price: parseFloat(v.price) || parseFloat(price),
                    compare_at_price: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
                    inventory_quantity: parseInt(v.inventory_quantity) || 0,
                    is_active: v.is_active,
                    options: v.options,
                    position: i,
                    updated_at: new Date().toISOString(),
                }
                if (v.id) {
                    await supabase.from('product_variants').update(varPayload).eq('id', v.id)
                } else {
                    await supabase.from('product_variants').insert(varPayload)
                }
            }
        }

        setSaving(false)
        onSaved()
    }

    return (
        <div className="space-y-6">
            {/* Header — stacks on mobile, row on sm+ */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-base font-semibold text-foreground">
                        {isEdit ? `Edit: ${product.name}` : 'New product'}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {isEdit ? 'Update product details' : 'Add a new product to your store'}
                    </p>
                </div>
                {/* Action buttons — full-width on mobile, auto on sm+ */}
                <div className="flex gap-2 sm:shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none h-8 text-xs"
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        className="flex-1 sm:flex-none h-8 text-xs"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Saving…' : isEdit ? 'Update' : 'Create product'}
                    </Button>
                </div>
            </div>

            {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2 border border-destructive/20">
                    {error}
                </p>
            )}

            {/* Two-column layout — single col on mobile, side-by-side on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {/* Left column */}
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="product-name">Product name *</Label>
                        <Input
                            id="product-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Classic White Tee"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="slug">URL slug</Label>
                        <Input
                            id="slug"
                            value={slug}
                            onChange={(e) => setSlug(slugify(e.target.value))}
                            placeholder="classic-white-tee"
                            className="font-mono text-xs"
                        />
                        <p className="text-xs text-muted-foreground break-all">
                            yourstore.com/products/{slug || '…'}
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            placeholder="Describe your product…"
                            className="resize-none"
                        />
                    </div>

                    {/* Price row — always 2 cols, works fine at any width */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Price ({currency}) *</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Compare at ({currency})</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={compareAtPrice}
                                onChange={(e) => setCompareAtPrice(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* SKU + inventory — stack on xs, side-by-side on sm+ */}
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>SKU</Label>
                            <Input
                                value={sku}
                                onChange={(e) => setSku(e.target.value)}
                                placeholder="SKU-001"
                                className="font-mono text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Inventory</Label>
                            <Input
                                type="number"
                                min="0"
                                value={inventory}
                                onChange={(e) => setInventory(e.target.value)}
                                disabled={!trackInventory}
                            />
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label className="text-sm font-normal cursor-pointer">Track inventory</Label>
                            <Switch checked={trackInventory} onCheckedChange={setTrackInventory} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label className="text-sm font-normal cursor-pointer">Product active</Label>
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                        </div>
                    </div>
                </div>

                {/* Right column — images (moves below on mobile, which is natural) */}
                <div className="space-y-3">
                    <Label>Product images</Label>
                    {images.length > 0 && (
                        <div className="space-y-2">
                            {images.map((img, i) => (
                                <div key={i} className="flex items-center gap-3 rounded border bg-muted/30 p-2">
                                    <img src={img} alt="" className="w-12 h-12 object-cover rounded flex-shrink-0" />
                                    <p className="text-xs text-muted-foreground font-mono truncate flex-1 min-w-0">{img}</p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 flex-shrink-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                    <ImageUpload
                        label="Add image"
                        value=""
                        pathInDb=""
                        onChange={(url) => setImages((prev) => [...prev, url])}
                        bucket="store-assets"
                        pathPrefix={`${storeId}/products`}
                        aspectRatio="square"
                    />
                    <p className="text-xs text-muted-foreground">First image is used as the product thumbnail.</p>
                </div>
            </div>

            {/* Variants */}
            <Separator />
            <div className="space-y-3">
                <button
                    onClick={() => setShowVariants(!showVariants)}
                    className="flex items-center justify-between w-full text-sm font-medium text-foreground hover:text-muted-foreground transition-colors"
                >
                    <span>Variants ({variants.length})</span>
                    {showVariants ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <AnimatePresence>
                    {showVariants && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 overflow-hidden"
                        >
                            <p className="text-xs text-muted-foreground">
                                Each variant overrides the base price.
                            </p>

                            {variants.map((v, i) => (
                                <Card key={i}>
                                    <CardContent className="pt-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                                                Variant {i + 1}
                                            </p>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-muted-foreground"
                                                    onClick={() => {
                                                        const next = [...variants]
                                                        next[i] = { ...next[i], is_active: !next[i].is_active }
                                                        setVariants(next)
                                                    }}
                                                >
                                                    {v.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setVariants((prev) => prev.filter((_, j) => j !== i))}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Variant fields: 1 col on mobile → 2 on sm → 4 on lg */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                            {[
                                                { label: 'Name *', key: 'name', placeholder: 'e.g. Large / Red' },
                                                { label: 'SKU', key: 'sku', placeholder: 'VAR-001' },
                                                { label: `Price (${currency})`, key: 'price', placeholder: '0.00', type: 'number' },
                                                { label: 'Inventory', key: 'inventory_quantity', placeholder: '0', type: 'number' },
                                            ].map((field) => (
                                                <div key={field.key} className="space-y-1.5">
                                                    <Label className="text-xs">{field.label}</Label>
                                                    <Input
                                                        type={field.type ?? 'text'}
                                                        value={(v as any)[field.key]}
                                                        onChange={(e) => {
                                                            const next = [...variants]
                                                            next[i] = { ...next[i], [field.key]: e.target.value }
                                                            setVariants(next)
                                                        }}
                                                        placeholder={field.placeholder}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => setVariants((prev) => [...prev, { ...EMPTY_VARIANT }])}
                            >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Add variant
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

// ─── Product list ─────────────────────────────────────────────────────────────
export default function ProductSettings({
    storeId,
    currency,
}: {
    storeId: string
    currency: string
}) {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<'list' | 'new' | 'edit'>('list')
    const [editProduct, setEditProduct] = useState<Product | undefined>()

    const load = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()
        const { data } = await supabase
            .from('products')
            .select('id, name, slug, description, price, compare_at_price, inventory_quantity, is_active, images, sku, track_inventory')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
        setProducts((data as Product[]) ?? [])
        setLoading(false)
    }, [storeId])

    useEffect(() => { load() }, [load])

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this product? This cannot be undone.')) return
        const supabase = createClient()
        await supabase.from('products').delete().eq('id', id)
        load()
    }

    const handleToggleActive = async (product: Product) => {
        const supabase = createClient()
        await supabase.from('products').update({ is_active: !product.is_active }).eq('id', product.id)
        load()
    }

    if (view === 'new') {
        return (
            <ProductForm
                storeId={storeId}
                currency={currency}
                onSaved={() => { load(); setView('list') }}
                onCancel={() => setView('list')}
            />
        )
    }

    if (view === 'edit' && editProduct) {
        return (
            <ProductForm
                storeId={storeId}
                currency={currency}
                product={editProduct}
                onSaved={() => { load(); setView('list'); setEditProduct(undefined) }}
                onCancel={() => { setView('list'); setEditProduct(undefined) }}
            />
        )
    }

    return (
        <div className="space-y-6">
            {/* List header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-base font-semibold text-foreground">Products</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {products.length} product{products.length !== 1 ? 's' : ''} in your store
                    </p>
                </div>
                <Button size="sm" className="h-8 text-xs shrink-0" onClick={() => setView('new')}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    <span className="hidden xs:inline">Add product</span>
                    <span className="xs:hidden">Add</span>
                </Button>
            </div>

            {loading && (
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                    ))}
                </div>
            )}

            {!loading && products.length === 0 && (
                <Card className="border-dashed">
                    <CardContent className="py-16 text-center space-y-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                            <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">No products yet</p>
                            <p className="text-xs text-muted-foreground mt-1">Add your first product to start selling.</p>
                        </div>
                        <Button size="sm" className="h-8 text-xs" onClick={() => setView('new')}>
                            Add your first product
                        </Button>
                    </CardContent>
                </Card>
            )}

            {!loading && products.length > 0 && (
                <div className="rounded-lg border divide-y">
                    {products.map((product) => {
                        const thumb = (product.images as string[])?.[0]
                        return (
                            <div
                                key={product.id}
                                className="flex items-center gap-3 px-3 py-3 sm:px-4 bg-background hover:bg-muted/30 transition-colors"
                            >
                                {/* Thumbnail */}
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded border bg-muted flex-shrink-0 overflow-hidden">
                                    {thumb
                                        ? <img src={thumb} alt={product.name} className="w-full h-full object-cover" />
                                        : <div className="w-full h-full" />}
                                </div>

                                {/* Name + slug — takes all remaining space */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                                    {/* Slug hidden on very small screens to save space */}
                                    <p className="text-xs text-muted-foreground font-mono truncate hidden xs:block">
                                        {product.slug}
                                    </p>
                                </div>

                                {/* Price — hidden on mobile, shown sm+ */}
                                <p className="text-sm font-medium text-foreground w-20 text-right shrink-0 hidden sm:block">
                                    {currency} {Number(product.price).toLocaleString()}
                                </p>

                                {/* Stock — hidden on mobile, shown md+ */}
                                <p className="text-xs text-muted-foreground w-20 text-right shrink-0 hidden md:block">
                                    {product.track_inventory ? `${product.inventory_quantity} in stock` : 'Untracked'}
                                </p>

                                {/* Active badge */}
                                <button onClick={() => handleToggleActive(product)} className="shrink-0">
                                    <Badge
                                        variant={product.is_active ? 'default' : 'secondary'}
                                        className="text-[10px] cursor-pointer"
                                    >
                                        {product.is_active ? 'Active' : 'Draft'}
                                    </Badge>
                                </button>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs text-muted-foreground"
                                        onClick={() => { setEditProduct(product); setView('edit') }}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDelete(product.id)}
                                        aria-label="Delete product"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}