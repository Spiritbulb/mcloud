export type AppStatus = 'active' | 'beta' | 'archived' | 'maintenance'
export type DomainStatus = 'active' | 'pending' | 'failed' | 'expired'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
export type TicketStatus = 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'
export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface Organization {
    id: string
    name: string
    slug: string
    owner_id: string
    logo_url?: string
    description?: string
    settings?: Record<string, any>
    created_at: string
    updated_at: string
}

export interface App {
    id: string
    name: string
    slug: string
    description?: string
    status: AppStatus
    user_id: string
    created_at: string
    updated_at: string
    settings?: Record<string, any>
}

export interface Domain {
    id: string
    app_id: string
    domain: string
    ssl_enabled: boolean
    status: DomainStatus
    dns_verified: boolean
    created_at: string
    updated_at: string
    expires_at?: string
}

export interface AnalyticsEvent {
    id: string
    app_id: string
    event_type: 'pageview' | 'click' | 'signup' | 'purchase' | 'custom'
    user_id?: string
    session_id?: string
    page_url?: string
    referrer?: string
    metadata?: Record<string, any>
    created_at: string
}

export interface SubscriptionPlan {
    id: string
    name: string
    slug: string
    description?: string
    price_monthly: number
    price_yearly?: number
    currency: string
    features: string[]
    limits: Record<string, number>
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface Subscription {
    id: string
    user_id: string
    plan_id: string
    status: SubscriptionStatus
    billing_cycle: 'monthly' | 'yearly'
    current_period_start: string
    current_period_end: string
    cancel_at_period_end: boolean
    trial_start?: string
    trial_end?: string
    created_at: string
    updated_at: string
    plan?: SubscriptionPlan
}

export interface Invoice {
    id: string
    invoice_number: string
    user_id: string
    subscription_id?: string
    amount_due: number
    amount_paid: number
    currency: string
    status: InvoiceStatus
    due_date?: string
    paid_at?: string
    description?: string
    line_items?: any[]
    created_at: string
    updated_at: string
}

export interface PaymentMethod {
    id: string
    user_id: string
    type: 'card' | 'mpesa' | 'bank_transfer'
    is_default: boolean
    card_brand?: string
    card_last4?: string
    card_exp_month?: number
    card_exp_year?: number
    mpesa_phone?: string
    created_at: string
    updated_at: string
}

export interface SupportTicket {
    id: string
    ticket_number: string
    user_id: string
    subject: string
    description: string
    status: TicketStatus
    priority: TicketPriority
    category?: string
    assigned_to?: string
    resolved_at?: string
    created_at: string
    updated_at: string
}

export interface UserProfile {
    id: string
    full_name?: string
    avatar_url?: string
    phone?: string
    bio?: string
    company?: string
    location?: string
    timezone: string
    language: string
    theme: 'light' | 'dark' | 'system'
    email_notifications: boolean
    push_notifications: boolean
    marketing_emails: boolean
    organization_id?: string
    created_at: string
    updated_at: string
    organizations?: Organization
}

export interface TeamMember {
    id: string
    organization_id: string
    user_id: string
    role: TeamRole
    invited_by?: string
    invited_at: string
    joined_at?: string
    status: 'pending' | 'active' | 'suspended'
}
