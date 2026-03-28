'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type Customer = {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
    order_count: number | null
    total_spent: number | null
    created_at: string | null
    tags: string | null
}

export default function CustomersPage({ slug }: { slug: string }) {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [q, setQ] = useState('')
    const [page, setPage] = useState(1)

    const load = useCallback(async () => {
        setLoading(true)
        const params = new URLSearchParams({ page: String(page) })
        if (q) params.set('q', q)
        const res = await fetch(`/api/store/${slug}/customers?${params}`)
        const data = await res.json()
        setCustomers(data.customers ?? [])
        setTotal(data.total ?? 0)
        setLoading(false)
    }, [slug, q, page])

    useEffect(() => { load() }, [load])

    // Reset to page 1 when search changes
    useEffect(() => { setPage(1) }, [q])

    const fullName = (c: Customer) =>
        [c.first_name, c.last_name].filter(Boolean).join(' ') || '—'

    const totalPages = Math.ceil(total / 20)

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h1 className="text-[22px] font-semibold tracking-tight">Customers</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{total} total customers</p>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name, email, phone…"
                    className="pl-9"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-5 h-5 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
                </div>
            ) : customers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                    <Users className="w-10 h-10 opacity-30" />
                    <p className="text-sm">{q ? 'No customers match your search.' : 'No customers yet.'}</p>
                </div>
            ) : (
                <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-muted-foreground">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium">Name</th>
                                <th className="text-left px-4 py-3 font-medium">Email</th>
                                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Phone</th>
                                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Orders</th>
                                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Spent</th>
                                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Tags</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {customers.map((c) => (
                                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3 font-medium">{fullName(c)}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{c.email ?? '—'}</td>
                                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.phone ?? '—'}</td>
                                    <td className="px-4 py-3 text-right hidden sm:table-cell">{c.order_count ?? 0}</td>
                                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                                        {c.total_spent != null ? `KES ${c.total_spent.toLocaleString()}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 hidden lg:table-cell">
                                        {c.tags ? (
                                            <div className="flex flex-wrap gap-1">
                                                {(Array.isArray(c.tags)
                                                    ? c.tags
                                                    : String(c.tags).split(',')
                                                ).map((tag) => (
                                                    <Badge key={tag} variant="secondary" className="text-xs">
                                                        {tag.trim()}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : null}

                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Page {page} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="px-3 py-1.5 rounded-md border disabled:opacity-40 hover:bg-muted transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                            className="px-3 py-1.5 rounded-md border disabled:opacity-40 hover:bg-muted transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
