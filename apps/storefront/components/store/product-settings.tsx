'use client'
//admin product setting
import { useState, useEffect, useCallback } from 'react'
import { deleteProduct, listProductVariants, listProducts, saveProduct, setProductActive } from '@/lib/admin/catalog-actions'
import { Badge } from '@mcloud/ui/kit/badge'
import { Button } from '@mcloud/ui/kit/button'
import { ConfirmDialog } from '@mcloud/ui/kit/confirm-dialog'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { Field, FormGrid, Switch, TextArea, TextInput } from '@mcloud/ui/kit/form'
import { Icon } from '@mcloud/ui/kit/icon'
import { LoadError } from '@mcloud/ui/kit/load-error'
import { Notice } from '@mcloud/ui/kit/notice'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { SkeletonRows, Spinner } from '@mcloud/ui/kit/skeleton'
import { Table, Td, Th, Tr } from '@mcloud/ui/kit/table'
import ImageUpload from './image-upload'
import { Product, Variant } from '@mcloud/themes/types'

const EMPTY_VARIANT: Variant = {
    id: '',
    name: '',
    sku: '',
    price: '',
    compare_at_price: '',
    inventory_quantity: '0',
    is_active: true,
    image_url: '',
    options: {},
}

type VariantField = 'name' | 'sku' | 'price' | 'inventory_quantity'

function slugify(str: string) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function Thumb({ src, alt }: { src?: string; alt: string }) {
    return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
            {src
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={src} alt={alt} className="h-full w-full object-cover" />
                : <Icon name="inventory_2" size={16} className="text-muted-foreground" />}
        </span>
    )
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
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!isEdit || !product?.id) return
        listProductVariants(storeId, product.id)
            .then((res) => {
                const data = res.ok ? res.variants : null
                if (data?.length) {
                    setVariants(data.map((v) => ({
                        id: v.id,
                        name: v.name,
                        sku: v.sku ?? '',
                        price: String(v.price),
                        image_url: String(v.image_url ?? ''),
                        compare_at_price: String(v.compare_at_price ?? ''),
                        inventory_quantity: String(v.inventory_quantity),
                        is_active: v.is_active ?? true,
                        options: (v.options ?? {}) as Record<string, string>,
                    })))
                }
            })
    }, [isEdit, product?.id, storeId])

    const updateVariant = (i: number, patch: Partial<Variant>) =>
        setVariants((prev) => prev.map((v, j) => (j === i ? { ...v, ...patch } : v)))

    const handleSave = async () => {
        if (!name.trim() || !price.trim()) {
            setError('Name and price are required.')
            return
        }
        setError('')
        setSaving(true)
        const result = await saveProduct(
            storeId,
            isEdit ? product?.id ?? null : null,
            {
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
            },
            variants.map((v) => ({
                id: v.id,
                name: v.name,
                sku: v.sku || null,
                price: parseFloat(v.price) || parseFloat(price),
                compare_at_price: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
                inventory_quantity: parseInt(v.inventory_quantity) || 0,
                is_active: v.is_active,
                options: v.options,
            })),
        )

        if (!result.ok) {
            setError(result.error)
            setSaving(false)
            return
        }

        setSaving(false)
        onSaved()
    }

    const VARIANT_FIELDS: { label: string; key: VariantField; placeholder: string; type?: string }[] = [
        { label: 'Name', key: 'name', placeholder: 'e.g. Large / Red' },
        { label: 'SKU', key: 'sku', placeholder: 'VAR-001' },
        { label: `Price (${currency})`, key: 'price', placeholder: '0.00', type: 'number' },
        { label: 'Inventory', key: 'inventory_quantity', placeholder: '0', type: 'number' },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title={isEdit ? product.name : 'New product'}
                description={isEdit ? 'Update product details.' : 'Add a new product to your store.'}
                actions={
                    <>
                        <Button onClick={onCancel} disabled={saving}>Cancel</Button>
                        <Button variant="primary" onClick={handleSave} disabled={saving}>
                            {saving && <Spinner size={13} />}
                            {saving ? 'Saving…' : isEdit ? 'Save product' : 'Create product'}
                        </Button>
                    </>
                }
            />

            {error && <Notice tone="error">{error}</Notice>}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div className="space-y-6">
                    <Panel title="Details">
                        <div className="space-y-4">
                            <Field label="Product name">
                                <TextInput
                                    value={name}
                                    required
                                    placeholder="e.g. Classic White Tee"
                                    onChange={(e) => {
                                        setName(e.target.value)
                                        // A new product's slug follows its name until saved.
                                        if (!isEdit) setSlug(slugify(e.target.value))
                                    }}
                                />
                            </Field>
                            <Field label="URL slug" hint={`yourstore.com/products/${slug || '…'}`}>
                                <TextInput value={slug} placeholder="classic-white-tee" className="font-mono" onChange={(e) => setSlug(slugify(e.target.value))} />
                            </Field>
                            <Field label="Description">
                                <TextArea value={description} rows={4} placeholder="Describe your product…" className="resize-none" onChange={(e) => setDescription(e.target.value)} />
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Pricing and inventory">
                        <div className="space-y-4">
                            <FormGrid>
                                <Field label={`Price (${currency})`}>
                                    <TextInput type="number" min="0" step="0.01" value={price} placeholder="0.00" onChange={(e) => setPrice(e.target.value)} />
                                </Field>
                                <Field label={`Compare at (${currency})`} hint="Shown struck through, as the old price.">
                                    <TextInput type="number" min="0" step="0.01" value={compareAtPrice} placeholder="0.00" onChange={(e) => setCompareAtPrice(e.target.value)} />
                                </Field>
                                <Field label="SKU">
                                    <TextInput value={sku} placeholder="SKU-001" className="font-mono" onChange={(e) => setSku(e.target.value)} />
                                </Field>
                                <Field label="Inventory">
                                    <TextInput type="number" min="0" value={inventory} disabled={!trackInventory} onChange={(e) => setInventory(e.target.value)} />
                                </Field>
                            </FormGrid>
                            <Switch label="Track inventory" checked={trackInventory} onChange={setTrackInventory} />
                            <Switch label="Product active" description="Inactive products are drafts: hidden from your storefront." checked={isActive} onChange={setIsActive} />
                        </div>
                    </Panel>
                </div>

                <Panel title="Images" description="The first image is the product thumbnail.">
                    <div className="space-y-3">
                        {images.length > 0 && (
                            <ul className="space-y-2">
                                {images.map((img, i) => (
                                    <li key={i} className="flex items-center gap-3 rounded-md border border-border p-2">
                                        <Thumb src={img} alt="" />
                                        <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted-foreground">{img}</span>
                                        <Button variant="ghost" size="sm" aria-label="Remove image" onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}>
                                            <Icon name="delete" size={15} />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
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
                    </div>
                </Panel>
            </div>

            <Panel
                title={`Variants (${variants.length})`}
                description="Each variant overrides the base price."
                footer={
                    <Button size="sm" onClick={() => setVariants((prev) => [...prev, { ...EMPTY_VARIANT }])}>
                        <Icon name="add" size={15} />
                        Add variant
                    </Button>
                }
            >
                {variants.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">No variants. Add one for sizes, colours or other options.</p>
                ) : (
                    <div className="space-y-4">
                        {variants.map((v, i) => (
                            <div key={i} className="rounded-md border border-border p-3">
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="text-[12px] font-medium text-muted-foreground">
                                        Variant {i + 1}{!v.is_active && ' · hidden'}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="sm" aria-label={v.is_active ? 'Hide variant' : 'Show variant'} onClick={() => updateVariant(i, { is_active: !v.is_active })}>
                                            <Icon name={v.is_active ? 'visibility' : 'visibility_off'} size={15} />
                                        </Button>
                                        <Button variant="ghost" size="sm" aria-label="Remove variant" onClick={() => setVariants((prev) => prev.filter((_, j) => j !== i))}>
                                            <Icon name="delete" size={15} />
                                        </Button>
                                    </div>
                                </div>
                                <FormGrid columns={2} className="lg:grid-cols-4">
                                    {VARIANT_FIELDS.map((field) => (
                                        <Field key={field.key} label={field.label}>
                                            <TextInput
                                                type={field.type ?? 'text'}
                                                value={v[field.key] ?? ''}
                                                placeholder={field.placeholder}
                                                className="h-8"
                                                onChange={(e) => updateVariant(i, { [field.key]: e.target.value })}
                                            />
                                        </Field>
                                    ))}
                                </FormGrid>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>
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
    const [loadError, setLoadError] = useState<string | null>(null)
    const [view, setView] = useState<'list' | 'new' | 'edit'>('list')
    const [editProduct, setEditProduct] = useState<Product | undefined>()
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
    const [deleting, setDeleting] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        const res = await listProducts(storeId)
        setProducts(res.ok ? (res.products as Product[]) : [])
        setLoadError(res.ok ? null : res.error)
        setLoading(false)
    }, [storeId])

    useEffect(() => { load() }, [load])

    const confirmDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        await deleteProduct(storeId, deleteTarget.id)
        setDeleting(false)
        setDeleteTarget(null)
        load()
    }

    const handleToggleActive = async (product: Product) => {
        await setProductActive(storeId, product.id, !product.is_active)
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
            <PageHeader
                title="Products"
                description={loading ? 'Loading…' : `${products.length} product${products.length !== 1 ? 's' : ''} in your store`}
                actions={
                    <Button variant="primary" onClick={() => setView('new')}>
                        <Icon name="add" size={16} />
                        Add product
                    </Button>
                }
            />

            <Panel flush>
                {loadError && !loading ? (
                    <LoadError message={loadError} onRetry={load} />
                ) : !loading && products.length === 0 ? (
                    <EmptyState
                        icon="inventory_2"
                        title="No products yet"
                        description="Add your first product to start selling."
                        action={<Button variant="primary" size="sm" onClick={() => setView('new')}>Add your first product</Button>}
                    />
                ) : (
                    <Table busy={loading}>
                        <thead>
                            <tr>
                                <Th>Product</Th>
                                <Th align="right">Price</Th>
                                <Th>Stock</Th>
                                <Th>Status</Th>
                                <Th align="right"><span className="sr-only">Actions</span></Th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <SkeletonRows columns={5} rows={3} />
                            ) : (
                                products.map((product) => (
                                    <Tr key={product.id}>
                                        <Td>
                                            <div className="flex items-center gap-3">
                                                <Thumb src={(product.images as string[])?.[0]} alt={product.name} />
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium">{product.name}</p>
                                                    <p className="truncate font-mono text-[12px] text-muted-foreground">{product.slug}</p>
                                                </div>
                                            </div>
                                        </Td>
                                        <Td label="Price" align="right">{currency} {Number(product.price).toLocaleString()}</Td>
                                        <Td label="Stock" muted>{product.track_inventory ? `${product.inventory_quantity} in stock` : 'Untracked'}</Td>
                                        <Td label="Status">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleActive(product)}
                                                title={product.is_active ? 'Make draft' : 'Make active'}
                                                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                                            >
                                                <Badge tone={product.is_active ? 'success' : 'neutral'}>{product.is_active ? 'Active' : 'Draft'}</Badge>
                                            </button>
                                        </Td>
                                        <Td label="Actions" align="right">
                                            <div className="inline-flex items-center gap-1">
                                                <Button size="sm" onClick={() => { setEditProduct(product); setView('edit') }}>Edit</Button>
                                                <Button variant="ghost" size="sm" aria-label={`Delete ${product.name}`} onClick={() => setDeleteTarget(product)}>
                                                    <Icon name="delete" size={15} />
                                                </Button>
                                            </div>
                                        </Td>
                                    </Tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                )}
            </Panel>

            <ConfirmDialog
                open={deleteTarget !== null}
                title={deleteTarget ? `Delete ${deleteTarget.name}?` : ''}
                description="The product and its variants are removed from your store. This cannot be undone."
                confirmLabel="Delete product"
                busy={deleting}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    )
}
