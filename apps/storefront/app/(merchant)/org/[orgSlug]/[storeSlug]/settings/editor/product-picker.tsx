'use client'

import { useEffect, useMemo, useState } from 'react'
import { listProducts } from '@/lib/admin/catalog-actions'
import { MAX_PICKED_PRODUCTS, addId, moveId, removeId, pickedIds } from '@/lib/product-selection'
import { Button } from '@mcloud/ui/kit/button'
import { Icon } from '@mcloud/ui/kit/icon'
import { TextInput } from '@mcloud/ui/kit/form'

type Product = { id: string; name: string; price: number; is_active: boolean | null; images: unknown }

const firstImage = (p: Product): string | null => (Array.isArray(p.images) && typeof p.images[0] === 'string' ? p.images[0] : null)

function Row({ product, children }: { product: Product | null; children: React.ReactNode }) {
    const img = product ? firstImage(product) : null
    return (
        <li className="flex items-center gap-2 rounded-md border border-border p-1.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- merchant upload on R2 */}
                {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <Icon name="inventory_2" size={15} className="text-muted-foreground" />}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{product?.name ?? 'Product no longer available'}</span>
                {product && !product.is_active && <span className="block text-[12px] text-muted-foreground">Hidden, so not shown on your site</span>}
                {!product && <span className="block text-[12px] text-muted-foreground">Deleted. It is skipped on your site.</span>}
            </span>
            {children}
        </li>
    )
}

/**
 * Pick, order and remove the products a section shows. Reads the store's products through the
 * same authorised action as the Products screen; only the ids are saved on the section.
 */
export default function ProductPicker({
    storeId, value, onChange, max = MAX_PICKED_PRODUCTS,
}: {
    storeId: string
    value: unknown
    onChange: (ids: string[]) => void
    max?: number
}) {
    const ids = pickedIds(value, max)
    const [products, setProducts] = useState<Product[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [q, setQ] = useState('')

    useEffect(() => {
        let live = true
        listProducts(storeId).then((res) => {
            if (!live) return
            if (res.ok) setProducts(res.products as Product[])
            else setError(res.error)
        })
        return () => { live = false }
    }, [storeId])

    const byId = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products])
    const available = useMemo(() => {
        const needle = q.trim().toLowerCase()
        return (products ?? []).filter((p) => p.is_active && !ids.includes(p.id) && (!needle || p.name.toLowerCase().includes(needle)))
    }, [products, ids, q])
    const full = ids.length >= max

    if (error) return <p role="alert" className="text-[13px] text-destructive">{error}</p>
    if (!products) return <p className="text-[13px] text-muted-foreground">Loading products…</p>

    return (
        <div className="space-y-3">
            <p className="text-[12px] text-muted-foreground">
                {ids.length === 0 ? 'None chosen: this section shows your featured products, or your newest.' : `${ids.length} of ${max} chosen. Shown in this order.`}
            </p>

            {ids.length > 0 && (
                <ul className="space-y-1.5">
                    {ids.map((id, i) => (
                        <Row key={id} product={byId.get(id) ?? null}>
                            <Button variant="ghost" size="sm" aria-label="Move up" disabled={i === 0} onClick={() => onChange(moveId(ids, i, -1))}><Icon name="arrow_upward" size={14} /></Button>
                            <Button variant="ghost" size="sm" aria-label="Move down" disabled={i === ids.length - 1} onClick={() => onChange(moveId(ids, i, 1))}><Icon name="arrow_downward" size={14} /></Button>
                            <Button variant="ghost" size="sm" aria-label="Remove" onClick={() => onChange(removeId(ids, id))}><Icon name="close" size={14} /></Button>
                        </Row>
                    ))}
                </ul>
            )}

            {full ? (
                <p className="text-[12px] text-muted-foreground">That is the most this section can show. Remove one to add another.</p>
            ) : products.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">You have no products yet. Add some under Products first.</p>
            ) : (
                <div className="space-y-1.5">
                    <TextInput value={q} placeholder="Search your products" className="h-8" onChange={(e) => setQ(e.target.value)} />
                    <ul className="max-h-56 space-y-1.5 overflow-y-auto">
                        {available.map((p) => (
                            <Row key={p.id} product={p}>
                                <Button size="sm" onClick={() => onChange(addId(ids, p.id, max))}><Icon name="add" size={14} />Add</Button>
                            </Row>
                        ))}
                        {available.length === 0 && <li className="px-1 text-[13px] text-muted-foreground">{q ? 'No products match.' : 'Every active product is already chosen.'}</li>}
                    </ul>
                </div>
            )}
        </div>
    )
}
