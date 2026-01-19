// /components/billing/invoice-list.tsx
"use client"

import { Download, CheckCircle, Clock, XCircle, FileText } from "lucide-react"
import Link from "next/link"

interface Invoice {
    id: string
    invoice_number: string
    created_at: string
    due_date: string | null
    paid_at: string | null
    amount_due: number
    currency: string
    status: string
    description: string | null
}

interface InvoiceListProps {
    invoices: Invoice[]
    slug: string
}

export function InvoiceList({ invoices, slug }: InvoiceListProps) {
    const formatCurrency = (amount: number, currency: string = 'KES') => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
        }).format(amount / 100)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'paid':
                return <CheckCircle className="h-5 w-5 text-on-surface" />
            case 'open':
                return <Clock className="h-5 w-5 text-on-surface-variant" />
            case 'void':
            case 'uncollectible':
                return <XCircle className="h-5 w-5 text-on-surface-variant" />
            default:
                return <FileText className="h-5 w-5 text-on-surface-variant" />
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-surface-variant text-on-surface border border-outline'
            case 'open':
                return 'bg-surface-variant text-on-surface-variant border border-outline'
            case 'void':
            case 'uncollectible':
                return 'bg-surface-variant text-on-surface-variant border border-outline'
            default:
                return 'bg-surface-variant text-on-surface-variant border border-outline'
        }
    }

    const handleDownload = (invoiceId: string, invoiceNumber: string) => {
        // In a real app, this would generate/download a PDF
        console.log('Downloading invoice:', invoiceNumber)
        // You could call an API endpoint here to generate PDF
        // window.open(`/api/invoices/${invoiceId}/download`, '_blank')
    }

    if (!invoices || invoices.length === 0) {
        return (
            <div className="text-center py-12">
                <FileText className="h-12 w-12 text-on-surface-variant mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-on-surface mb-2">
                    No invoices yet
                </h3>
                <p className="text-sm text-on-surface-variant">
                    Your invoices will appear here once you have an active subscription
                </p>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-3">
                {invoices.map((invoice) => (
                    <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-outline hover:bg-surface-variant transition-colors duration-200"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-variant">
                                {getStatusIcon(invoice.status)}
                            </div>
                            <div>
                                <p className="font-medium text-on-surface">
                                    {invoice.invoice_number}
                                </p>
                                <p className="text-sm text-on-surface-variant">
                                    {formatDate(invoice.created_at)}
                                    {invoice.due_date && invoice.status === 'open' && (
                                        <span className="ml-2">
                                            • Due {formatDate(invoice.due_date)}
                                        </span>
                                    )}
                                </p>
                                {invoice.description && (
                                    <p className="text-xs text-on-surface-variant mt-1">
                                        {invoice.description}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="font-semibold text-on-surface">
                                    {formatCurrency(invoice.amount_due, invoice.currency)}
                                </p>
                                {invoice.status === 'paid' && invoice.paid_at && (
                                    <p className="text-xs text-on-surface-variant">
                                        Paid {formatDate(invoice.paid_at)}
                                    </p>
                                )}
                            </div>
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(invoice.status)}`}
                            >
                                {invoice.status}
                            </span>
                            {invoice.status === 'open' ? (
                                <Link href={`/${slug}/billing/invoices/${invoice.id}/pay`}>
                                    <button className="google-button-primary py-2 px-4 text-sm">
                                        Pay Now
                                    </button>
                                </Link>
                            ) : (
                                <button
                                    className="google-button-secondary py-2 px-4 text-sm flex items-center gap-2"
                                    onClick={() => handleDownload(invoice.id, invoice.invoice_number)}
                                >
                                    <Download className="h-4 w-4" />
                                    Download
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {invoices.length > 0 && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-surface-variant border border-outline mt-6">
                    <div>
                        <p className="text-sm font-medium text-on-surface">
                            Total Invoices: {invoices.length}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                            Paid: {invoices.filter(inv => inv.status === 'paid').length} •
                            Open: {invoices.filter(inv => inv.status === 'open').length}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-on-surface">
                            Total Amount
                        </p>
                        <p className="text-lg font-bold text-on-surface">
                            {new Intl.NumberFormat('en-KE', {
                                style: 'currency',
                                currency: invoices[0]?.currency || 'KES',
                                minimumFractionDigits: 0,
                            }).format(invoices.reduce((sum, inv) => sum + inv.amount_due, 0) / 100)}
                        </p>
                    </div>
                </div>
            )}
        </>
    )
}
