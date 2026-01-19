// /components/support/ticket-list.tsx
"use client"

import { MessageSquare, Clock, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

interface SupportTicket {
    id: string
    subject: string
    description: string
    status: string
    priority: string
    created_at: string
    updated_at: string
}

interface TicketListProps {
    tickets: SupportTicket[]
    slug: string
}

export function SupportTicketList({ tickets, slug }: TicketListProps) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'open':
                return <Clock className="h-5 w-5 text-on-surface-variant" />
            case 'closed':
                return <CheckCircle className="h-5 w-5 text-on-surface" />
            case 'pending':
                return <MessageSquare className="h-5 w-5 text-on-surface-variant" />
            default:
                return <XCircle className="h-5 w-5 text-on-surface-variant" />
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open':
                return 'bg-surface-variant text-on-surface border border-outline'
            case 'closed':
                return 'bg-surface-variant text-on-surface border border-outline'
            case 'pending':
                return 'bg-surface-variant text-on-surface-variant border border-outline'
            default:
                return 'bg-surface-variant text-on-surface-variant border border-outline'
        }
    }

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'bg-surface-variant text-on-surface border border-outline'
            case 'medium':
                return 'bg-surface-variant text-on-surface-variant border border-outline'
            case 'low':
                return 'bg-surface-variant text-on-surface-variant border border-outline'
            default:
                return 'bg-surface-variant text-on-surface-variant border border-outline'
        }
    }

    if (!tickets || tickets.length === 0) {
        return (
            <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-on-surface-variant mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-on-surface mb-2">
                    No support tickets yet
                </h3>
                <p className="text-sm text-on-surface-variant mb-4">
                    Create a ticket to get help from our support team
                </p>
                <Link href={`/${slug}/support/tickets/new`}>
                    <button className="google-button-primary py-2 px-4 text-sm">
                        Create Ticket
                    </button>
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {tickets.map((ticket) => (
                <Link key={ticket.id} href={`/${slug}/support/tickets/${ticket.id}`}>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-outline hover:bg-surface-variant transition-colors duration-200 cursor-pointer">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-variant">
                                {getStatusIcon(ticket.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-on-surface truncate">
                                    {ticket.subject}
                                </p>
                                <p className="text-sm text-on-surface-variant truncate">
                                    {ticket.description}
                                </p>
                                <p className="text-xs text-on-surface-variant mt-1">
                                    Created {formatDate(ticket.created_at)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getPriorityBadge(ticket.priority)}`}>
                                {ticket.priority}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(ticket.status)}`}>
                                {ticket.status}
                            </span>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    )
}
