'use client'

import { useState, useRef, useEffect } from "react"
import { motion, useInView } from "framer-motion"
import {
    Store,
    Palette,
    Package,
    ShoppingBag,
    FileText,
    Globe,
    Link2,
    CreditCard,
    Bell,
    Search,
    ChevronRight,
    Info,
    AlertTriangle,
    CheckCircle2,
    X,
    Menu,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocStep = {
    label: string
    detail?: string
}

export type DocField = {
    name: string
    description: string
    required?: "required" | "optional" | "readonly"
}

export type DocNote = {
    type: "info" | "warning" | "tip"
    text: string
}

export type DocSection = {
    id: string
    title: string
    summary: string
    body?: string[]
    steps?: DocStep[]
    fields?: DocField[]
    notes?: DocNote[]
}

export type DocPage = {
    id: string
    title: string
    description: string
    icon: React.ReactNode
    beta?: boolean
    sections: DocSection[]
}

interface DocsClientProps {
    page: string | undefined
}

// ─── Docs Data ────────────────────────────────────────────────────────────────

export const DOCS: DocPage[] = [
    {
        id: "general",
        title: "General Settings",
        description: "Store name, currency, timezone and visibility",
        icon: <Store className="w-4 h-4" />,
        sections: [
            {
                id: "general-overview",
                title: "Overview",
                summary: "General settings control the core identity of your store.",
                body: [
                    "The General settings tab is where you configure the foundational details of your store: its name, public description, operating currency, timezone, and whether the store is currently live.",
                    "Changes you make here are saved only when you click the Save button at the bottom of the page.",
                ],
            },
            {
                id: "general-store-info",
                title: "Store Name & Description",
                summary: "Set the public-facing name and tagline for your storefront.",
                fields: [
                    { name: "Store Name", description: "The display name shown to customers on your storefront and in order emails.", required: "required" },
                    { name: "Store URL (slug)", description: "Your subdomain address, e.g. myshop.menengai.cloud. Set during onboarding and cannot be changed.", required: "readonly" },
                    { name: "Description", description: "A short description of your store. Used in search engine previews and the storefront header.", required: "optional" },
                ],
                notes: [{ type: "info", text: "Your store URL (slug) is permanent. If you need a different URL, you must create a new store." }],
            },
            {
                id: "general-currency-timezone",
                title: "Currency & Timezone",
                summary: "Configure how prices are displayed and how order timestamps are reported.",
                fields: [
                    { name: "Currency", description: "The currency used for all product prices and order totals. Defaults to KES (Kenyan Shilling).", required: "required" },
                    { name: "Timezone", description: "Your store's operating timezone. Affects how order dates and analytics are displayed.", required: "optional" },
                ],
                notes: [{ type: "warning", text: "Changing the currency does not automatically convert existing product prices. You will need to update them manually." }],
            },
            {
                id: "general-visibility",
                title: "Store Visibility",
                summary: "Control whether your store is publicly accessible.",
                body: ["The Active toggle determines whether your store is publicly visible. When turned off, customers who visit your store URL will see a 'Store unavailable' message instead of your products."],
                fields: [{ name: "Active", description: "Toggle to make your store live or take it offline without deleting any data.", required: "optional" }],
                notes: [{ type: "tip", text: "Turn off Active while you're setting up your store, then enable it once everything is ready." }],
            },
        ],
    },
    {
        id: "appearance",
        title: "Appearance",
        description: "Themes, colors, fonts, logo and hero images",
        icon: <Palette className="w-4 h-4" />,
        sections: [
            {
                id: "appearance-overview",
                title: "Overview",
                summary: "Appearance settings let you fully brand your storefront.",
                body: ["From the Appearance tab you can choose a storefront theme, customize its color palette, select typography, upload a logo, and configure your hero section. All changes are previewed live before saving."],
            },
            {
                id: "appearance-theme",
                title: "Choosing a Theme",
                summary: "Pick from Classic, Noir, or Minimal layouts.",
                body: ["Menengai Cloud ships with three built-in storefront themes. Each theme has a distinct layout and visual style, but all of them respect the color and font settings you configure."],
                fields: [
                    { name: "Classic", description: "A warm, image-forward layout with a traditional e-commerce feel. Great for fashion, home goods, and general retail." },
                    { name: "Noir", description: "A dark, high-contrast layout built for premium or luxury brands." },
                    { name: "Minimal", description: "A clean, content-first layout that puts your products front and center with minimal chrome." },
                ],
            },
            {
                id: "appearance-colors",
                title: "Color Palette",
                summary: "Customize primary, secondary, and accent colors for light and dark modes.",
                fields: [
                    { name: "Primary Color", description: "The main brand color — used for buttons, links, and highlights.", required: "optional" },
                    { name: "Secondary Color", description: "A complementary color used for backgrounds and secondary elements.", required: "optional" },
                    { name: "Accent Color", description: "A pop color used for badges, tags, and hover states.", required: "optional" },
                    { name: "Dark Mode Variants", description: "Separate color values automatically applied when a customer's device is in dark mode.", required: "optional" },
                ],
                notes: [{ type: "tip", text: "Use contrasting primary and background colors to keep text readable for all customers." }],
            },
            {
                id: "appearance-typography",
                title: "Typography",
                summary: "Choose heading and body fonts from the available Google Fonts.",
                fields: [
                    { name: "Heading Font", description: "Applied to product names, section titles, and navigation.", required: "optional" },
                    { name: "Body Font", description: "Applied to descriptions, prices, and all other text.", required: "optional" },
                    { name: "Border Radius", description: "Controls how rounded buttons, cards, and input fields appear (sharp to fully rounded).", required: "optional" },
                ],
            },
            {
                id: "appearance-media",
                title: "Logo & Hero Image",
                summary: "Upload your brand logo and configure the hero section shown at the top of your storefront.",
                steps: [
                    { label: "Click Upload logo and select an image file (PNG or SVG recommended)." },
                    { label: "Click Upload hero image to set the full-width banner at the top of your store." },
                    { label: "Fill in Hero Title and Hero Subtitle — these are overlaid on the banner image." },
                    { label: "Click Save to apply changes." },
                ],
                fields: [
                    { name: "Logo", description: "Displayed in your store's navigation bar. Recommended size: 200×60px.", required: "optional" },
                    { name: "Hero Image", description: "Full-width banner image at the top of your homepage. Recommended size: 1600×900px.", required: "optional" },
                    { name: "Hero Title", description: "Large heading overlaid on the hero image.", required: "optional" },
                    { name: "Hero Subtitle", description: "Smaller supporting text below the hero title.", required: "optional" },
                ],
                notes: [{ type: "info", text: "Images are stored in Supabase Storage. Large files may take a moment to upload." }],
            },
        ],
    },
    {
        id: "products",
        title: "Products",
        description: "Add, edit, and organize your product catalog",
        icon: <Package className="w-4 h-4" />,
        sections: [
            {
                id: "products-overview",
                title: "Overview",
                summary: "Manage everything customers can buy in your store.",
                body: [
                    "The Products tab is your product catalog. You can add new products, edit existing ones, manage inventory counts, and organize products into collections.",
                    "There is no limit on the number of products, even on the free plan.",
                ],
            },
            {
                id: "products-adding",
                title: "Adding a Product",
                summary: "Create a new product listing with images, price, and inventory.",
                steps: [
                    { label: "Click + Add Product in the top-right corner." },
                    { label: "Enter the product Name, Description, and Price." },
                    { label: "Upload one or more product images using the image uploader." },
                    { label: "Set the Inventory count (or leave it blank for unlimited stock)." },
                    { label: "Assign the product to a Collection (optional)." },
                    { label: "Toggle Available to make the product visible on your storefront." },
                    { label: "Click Save." },
                ],
                fields: [
                    { name: "Name", description: "The product title shown on listings and detail pages.", required: "required" },
                    { name: "Description", description: "A rich-text description displayed on the product detail page.", required: "optional" },
                    { name: "Price", description: "The selling price in your store's currency.", required: "required" },
                    { name: "Compare-at Price", description: "An optional original price shown as a strikethrough (useful for sales).", required: "optional" },
                    { name: "Inventory", description: "Number of units in stock. Leave blank to disable stock tracking.", required: "optional" },
                    { name: "Available", description: "Whether the product appears on your storefront.", required: "optional" },
                    { name: "Collection", description: "A category or group the product belongs to.", required: "optional" },
                ],
            },
            {
                id: "products-collections",
                title: "Collections",
                summary: "Group products into categories for easier browsing.",
                body: ["Collections are categories that customers can browse on your storefront. A product can belong to one collection. Collections appear in the navigation as category filters."],
                steps: [
                    { label: "Click Manage Collections (or the Collections tab within Products)." },
                    { label: "Click + Add Collection and give it a name and optional description." },
                    { label: "Assign products to the collection from each product's edit form." },
                ],
            },
        ],
    },
    {
        id: "orders",
        title: "Orders",
        description: "View and manage customer orders",
        icon: <ShoppingBag className="w-4 h-4" />,
        sections: [
            {
                id: "orders-overview",
                title: "Overview",
                summary: "Track and fulfill every order placed through your store.",
                body: ["The Orders tab shows every order placed by customers, along with its status, items, and payment information. You can update order statuses and view customer contact details from here."],
            },
            {
                id: "orders-statuses",
                title: "Order Statuses",
                summary: "Understand the lifecycle of an order from placement to delivery.",
                fields: [
                    { name: "Pending", description: "Order received, awaiting payment confirmation." },
                    { name: "Paid", description: "Payment confirmed. Ready to fulfill." },
                    { name: "Processing", description: "You have started preparing the order." },
                    { name: "Shipped", description: "Order has been dispatched to the customer." },
                    { name: "Delivered", description: "Customer has received the order." },
                    { name: "Cancelled", description: "Order was cancelled before fulfillment." },
                    { name: "Refunded", description: "Payment was returned to the customer." },
                ],
            },
            {
                id: "orders-updating",
                title: "Updating an Order",
                summary: "Change the status or add notes to an order.",
                steps: [
                    { label: "Find the order in the list and click it to open the detail view." },
                    { label: "Use the Status dropdown to move the order to its new state." },
                    { label: "Optionally add an internal note visible only to you." },
                    { label: "Click Save to confirm." },
                ],
                notes: [{ type: "info", text: "Status changes can trigger automatic notification emails to the customer if Notifications are configured." }],
            },
        ],
    },
    {
        id: "blog",
        title: "Blog",
        description: "Write and publish articles for your store",
        icon: <FileText className="w-4 h-4" />,
        sections: [
            {
                id: "blog-overview",
                title: "Overview",
                summary: "Build an audience and improve SEO with a built-in blog.",
                body: ["The Blog tab gives you a full publishing workflow. You can draft, edit, and publish articles that appear at /blog on your storefront. All posts support Markdown formatting."],
            },
            {
                id: "blog-creating",
                title: "Creating a Post",
                summary: "Write and publish your first blog article.",
                steps: [
                    { label: "Click + New Post." },
                    { label: "Enter a Title and optional Subtitle." },
                    { label: "Write your content using the Markdown editor." },
                    { label: "Upload a Cover Image to appear at the top of the post and in the blog listing." },
                    { label: "Set the Author from the dropdown." },
                    { label: "Toggle Published to make the post visible (or leave it off to save as a draft)." },
                    { label: "Click Save." },
                ],
                fields: [
                    { name: "Title", description: "The headline of the post.", required: "required" },
                    { name: "Subtitle", description: "An optional deck or summary shown beneath the title.", required: "optional" },
                    { name: "Content", description: "The body of the post, written in Markdown.", required: "required" },
                    { name: "Cover Image", description: "A banner image displayed at the top of the article and in the blog index.", required: "optional" },
                    { name: "Author", description: "The attributed author, selected from your store's team.", required: "optional" },
                    { name: "Published", description: "Toggle to make the post live. Unpublished posts are drafts only you can see.", required: "optional" },
                ],
                notes: [{ type: "tip", text: "Use Markdown headings (## and ###) to structure long posts. They become anchor links for easy navigation." }],
            },
        ],
    },
    {
        id: "domain",
        title: "Custom Domain",
        description: "Connect your own domain to your storefront",
        icon: <Globe className="w-4 h-4" />,
        beta: true,
        sections: [
            {
                id: "domain-overview",
                title: "Overview",
                summary: "Replace your .menengai.cloud subdomain with your own branded domain.",
                body: ["Custom Domain is a beta feature. Once connected, customers can visit your store at yourdomain.com instead of yourshop.menengai.cloud. Both addresses will continue to work."],
                notes: [{ type: "warning", text: "This feature is currently in beta. DNS propagation may take up to 48 hours. Reach out to support if you run into issues." }],
            },
            {
                id: "domain-setup",
                title: "Connecting a Domain",
                summary: "Point your domain's DNS records to Menengai Cloud.",
                steps: [
                    { label: "Go to Settings → Domain." },
                    { label: "Enter your domain name (e.g. shop.yourstore.com) and click Add Domain." },
                    { label: "You will see a set of DNS records to configure. Log into your domain registrar (e.g. Namecheap, GoDaddy, Cloudflare)." },
                    { label: "Add the provided A record and CNAME record in your DNS settings." },
                    { label: "Return to the Domain tab and click Verify. It may take a few minutes (or up to 48 hours) for DNS to propagate." },
                    { label: "Once verified, a green checkmark will confirm the domain is connected." },
                ],
                fields: [{ name: "Domain", description: "The full domain or subdomain you want to point to your store (e.g. shop.yourstore.com).", required: "required" }],
                notes: [{ type: "info", text: "SSL certificates are provisioned automatically once the domain verifies." }],
            },
        ],
    },
    {
        id: "social",
        title: "Social Links",
        description: "Add Instagram, Twitter, TikTok, and WhatsApp links",
        icon: <Link2 className="w-4 h-4" />,
        sections: [
            {
                id: "social-overview",
                title: "Overview",
                summary: "Display your social media profiles in your store's footer and navigation.",
                body: ["Adding social links puts clickable icons in your storefront's footer, making it easy for customers to follow and engage with your brand."],
            },
            {
                id: "social-fields",
                title: "Supported Platforms",
                summary: "Enter the URL or handle for each platform you want to show.",
                fields: [
                    { name: "Instagram", description: "Your Instagram profile URL (e.g. https://instagram.com/yourhandle).", required: "optional" },
                    { name: "Twitter / X", description: "Your Twitter/X profile URL.", required: "optional" },
                    { name: "TikTok", description: "Your TikTok profile URL.", required: "optional" },
                    { name: "WhatsApp", description: "Your WhatsApp business number in international format (e.g. +254700000000). Opens a chat.", required: "optional" },
                ],
                notes: [{ type: "tip", text: "Only platforms with a value filled in will show icons on your storefront. Empty fields are hidden." }],
            },
        ],
    },
    {
        id: "payments",
        title: "Payments",
        description: "Configure payment processors for your store",
        icon: <CreditCard className="w-4 h-4" />,
        beta: true,
        sections: [
            {
                id: "payments-overview",
                title: "Overview",
                summary: "Enable and configure the payment methods your customers can use at checkout.",
                body: ["Payments is a beta feature. Currently supported integrations are M-Pesa (via Daraja/Paybill), PayPal, Stripe, and Flutterwave. You only need to configure the methods you want to accept."],
                notes: [{ type: "warning", text: "Payment integrations are in beta. Test thoroughly in sandbox mode before going live." }],
            },
            {
                id: "payments-mpesa",
                title: "M-Pesa",
                summary: "Accept Lipa na M-Pesa Paybill or Till payments.",
                steps: [
                    { label: "Enable the M-Pesa toggle." },
                    { label: "Enter your Paybill or Till Number." },
                    { label: "Enter your Daraja API Consumer Key and Consumer Secret from the Safaricom developer portal." },
                    { label: "Set the Callback URL to the value shown in the dashboard." },
                    { label: "Save and run a test transaction to verify." },
                ],
                fields: [
                    { name: "Paybill / Till Number", description: "Your registered M-Pesa business number.", required: "required" },
                    { name: "Consumer Key", description: "From your Safaricom Daraja app credentials.", required: "required" },
                    { name: "Consumer Secret", description: "From your Safaricom Daraja app credentials.", required: "required" },
                ],
            },
            {
                id: "payments-paypal",
                title: "PayPal",
                summary: "Accept international card and PayPal wallet payments.",
                body: ["PayPal support is pre-configured at the platform level. Prices are automatically converted from KES to USD at checkout. You do not need to enter API credentials."],
                notes: [{ type: "info", text: "PayPal uses the live KES→USD exchange rate at the moment of checkout." }],
            },
        ],
    },
    {
        id: "notifications",
        title: "Notifications",
        description: "Set up email and webhook alerts for store events",
        icon: <Bell className="w-4 h-4" />,
        beta: true,
        sections: [
            {
                id: "notifications-overview",
                title: "Overview",
                summary: "Receive automatic emails or webhook calls when key events happen in your store.",
                body: ["Notifications is a beta feature. You can configure email notifications for new orders, order status changes, and low stock alerts. Webhooks allow you to connect third-party tools and automation workflows."],
                notes: [{ type: "warning", text: "Notifications are in beta. If you're not receiving emails, check your spam folder and ensure support@menengai.cloud is in your safe sender list." }],
            },
            {
                id: "notifications-email",
                title: "Email Notifications",
                summary: "Get notified by email when important events occur.",
                fields: [
                    { name: "Notification Email", description: "The address where store alerts are sent. Defaults to your account email.", required: "optional" },
                    { name: "New Order", description: "Receive an email every time a customer places an order.", required: "optional" },
                    { name: "Order Status Change", description: "Receive an email when an order moves to a new status.", required: "optional" },
                    { name: "Low Stock Alert", description: "Receive an email when a product's inventory drops below a threshold you set.", required: "optional" },
                ],
            },
            {
                id: "notifications-webhooks",
                title: "Webhooks",
                summary: "Send event payloads to external URLs for automation.",
                steps: [
                    { label: "Enter the Webhook URL (your endpoint that accepts POST requests)." },
                    { label: "Select the events you want to send (new_order, order_updated, product_low_stock)." },
                    { label: "Click Save. We'll send a test ping to confirm the endpoint is reachable." },
                ],
                fields: [{ name: "Webhook URL", description: "The HTTPS endpoint that receives event payloads as JSON POST requests.", required: "optional" }],
                notes: [{ type: "info", text: "Webhook payloads include an X-Menengai-Signature header for request verification." }],
            },
        ],
    },
]

// ─── Helper Components ────────────────────────────────────────────────────────

function FadeIn({ children, className }: { children: React.ReactNode; className?: string }) {
    const ref = useRef(null)
    const inView = useInView(ref, { once: true, margin: "-60px" })
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

function NoteCallout({ note }: { note: DocNote }) {
    const styles = {
        info: {
            bg: "bg-blue-50 dark:bg-blue-950/30",
            border: "border-blue-200 dark:border-blue-800",
            text: "text-blue-800 dark:text-blue-200",
            icon: <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />,
        },
        warning: {
            bg: "bg-amber-50 dark:bg-amber-950/30",
            border: "border-amber-200 dark:border-amber-800",
            text: "text-amber-800 dark:text-amber-200",
            icon: <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />,
        },
        tip: {
            bg: "bg-green-50 dark:bg-green-950/30",
            border: "border-green-200 dark:border-green-800",
            text: "text-green-800 dark:text-green-200",
            icon: <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />,
        },
    }
    const s = styles[note.type]
    return (
        <div className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${s.bg} ${s.border} ${s.text}`}>
            {s.icon}
            <p className="leading-relaxed">{note.text}</p>
        </div>
    )
}

function FieldTable({ fields }: { fields: DocField[] }) {
    const badgeStyle: Record<string, string> = {
        required: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        optional: "bg-muted text-muted-foreground",
        readonly: "bg-secondary text-secondary-foreground",
    }

    return (
        <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-secondary/60">
                            <th className="text-left px-4 py-3 font-medium text-foreground w-1/4">Field</th>
                            <th className="text-left px-4 py-3 font-medium text-foreground">Description</th>
                            <th className="text-left px-4 py-3 font-medium text-foreground w-24">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map((f, i) => (
                            <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs font-medium text-foreground align-top">{f.name}</td>
                                <td className="px-4 py-3 text-muted-foreground align-top">{f.description}</td>
                                <td className="px-4 py-3 align-top">
                                    {f.required && (
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badgeStyle[f.required]}`}>
                                            {f.required}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile card stack */}
            <div className="sm:hidden space-y-2">
                {fields.map((f, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-mono text-xs font-semibold text-foreground">{f.name}</span>
                            {f.required && (
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badgeStyle[f.required]}`}>
                                    {f.required}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                    </div>
                ))}
            </div>
        </>
    )
}

function StepList({ steps }: { steps: DocStep[] }) {
    return (
        <ol className="space-y-3">
            {steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                    </span>
                    <div>
                        <p className="text-sm text-foreground leading-relaxed">{step.label}</p>
                        {step.detail && <p className="text-sm text-muted-foreground mt-0.5">{step.detail}</p>}
                    </div>
                </li>
            ))}
        </ol>
    )
}

// ─── Drawer overlay for mobile sidebar ───────────────────────────────────────

function MobileDrawer({
    open,
    onClose,
    activePageId,
    onSelect,
}: {
    open: boolean
    onClose: () => void
    activePageId: string
    onSelect: (id: string) => void
}) {
    // Trap body scroll when open
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : ""
        return () => { document.body.style.overflow = "" }
    }, [open])

    if (!open) return null

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-40 bg-white dark:bg-black backdrop-blur-sm lg:hidden mt-14"
            />
            {/* Drawer panel */}
            <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed inset-y-0 left-0 z-50 w-full bg-background border-r border-border flex flex-col lg:hidden bg-white dark:bg-black"
            >
                {/* Drawer header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Menu</p>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Nav items */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                    {DOCS.map((page) => (
                        <button
                            key={page.id}
                            onClick={() => onSelect(page.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${activePageId === page.id
                                ? "bg-[#425e7b] text-white font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                                }`}
                        >
                            <span className="flex-shrink-0">{page.icon}</span>
                            <span className="flex-1 truncate">{page.title}</span>
                            {page.beta && (
                                <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                    beta
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </motion.div>
        </>
    )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function DocsClient({ page }: DocsClientProps) {
    const [activePageId, setActivePageId] = useState<string>(page ?? DOCS[0].id)
    const [searchQuery, setSearchQuery] = useState("")
    const [drawerOpen, setDrawerOpen] = useState(false)
    const contentRef = useRef<HTMLDivElement>(null)

    const activePage = DOCS.find((p) => p.id === activePageId) ?? DOCS[0]

    const filteredResults: Array<{ page: DocPage; section: DocSection }> = []
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        for (const page of DOCS) {
            for (const section of page.sections) {
                const matches =
                    section.title.toLowerCase().includes(q) ||
                    section.summary.toLowerCase().includes(q) ||
                    section.body?.some((b) => b.toLowerCase().includes(q)) ||
                    section.fields?.some((f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q))
                if (matches) filteredResults.push({ page, section })
            }
        }
    }

    const isSearching = searchQuery.trim().length > 0

    function selectPage(id: string) {
        setActivePageId(id)
        setDrawerOpen(false)
        contentRef.current?.scrollTo({ top: 0, behavior: "smooth" })
        window.scrollTo({ top: 0, behavior: "smooth" })
    }

    useEffect(() => {
        contentRef.current?.scrollTo({ top: 0 })
    }, [activePageId])

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile drawer */}
            <MobileDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                activePageId={activePageId}
                onSelect={selectPage}
            />

            {/* ── HERO ────────────────────────────────────────────────────── */}
            <section className="relative pt-14 sm:pt-32 pb-10 sm:pb-12 bg-background border-b border-border">
                <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-6xl">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                        className="space-y-3 sm:space-y-4"
                    >
                        {/* Mobile: hamburger in hero row */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setDrawerOpen(true)}
                                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                                aria-label="Open navigation"
                            >
                                <Menu className="w-4 h-4" />
                            </button>
                            <p className="text-xs sm:text-sm font-medium text-primary uppercase tracking-widest">Documentation</p>
                        </div>

                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-montserrat font-bold text-foreground leading-[1.1]">
                            Store Settings Guide
                        </h1>
                        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                            Everything you need to configure and manage your Menengai Cloud store from general info to payments and beyond.
                        </p>

                        {/* Search — full width on mobile */}
                        <div className="relative w-full sm:max-w-lg pt-1 sm:pt-2">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search the docs…"
                                className="block w-full pl-10 pr-10 py-2.5 sm:py-3 border border-border bg-card text-foreground rounded-full outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ── BODY ────────────────────────────────────────────────────── */}
            <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-6xl py-8 sm:py-10">
                <div className="flex gap-8 lg:gap-10">

                    {/* ── Sidebar (desktop only) ─────────────────────────── */}
                    <aside className="hidden lg:block w-56 flex-shrink-0">
                        <div className="sticky top-24 space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-3">Settings</p>
                            {DOCS.map((page) => (
                                <button
                                    key={page.id}
                                    onClick={() => selectPage(page.id)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left ${activePageId === page.id && !isSearching
                                        ? "bg-[#425e7b] text-white font-medium"
                                        : "text-muted-foreground hover:text-white hover:bg-[#425e7b]/60"
                                        }`}
                                >
                                    {page.icon}
                                    <span className="flex-1 truncate">{page.title}</span>
                                    {page.beta && (
                                        <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                            beta
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </aside>

                    {/* ── Content ────────────────────────────────────────── */}
                    <main ref={contentRef} className="flex-1 min-w-0">
                        {isSearching ? (
                            /* ── Search results ──────────────────────────── */
                            <div className="space-y-3 sm:space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
                                </p>
                                {filteredResults.length === 0 ? (
                                    <div className="text-center py-16 border border-border rounded-2xl bg-card">
                                        <p className="text-muted-foreground text-sm">No results found. Try a different search term.</p>
                                        <button onClick={() => setSearchQuery("")} className="mt-4 text-sm text-primary hover:underline">
                                            Clear search
                                        </button>
                                    </div>
                                ) : (
                                    filteredResults.map(({ page, section }) => (
                                        <button
                                            key={section.id}
                                            onClick={() => { setSearchQuery(""); selectPage(page.id) }}
                                            className="w-full text-left border border-border rounded-2xl p-4 sm:p-5 hover:bg-secondary/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 flex-wrap">
                                                {page.icon}
                                                <span>{page.title}</span>
                                                <ChevronRight className="w-3 h-3" />
                                                <span>{section.title}</span>
                                            </div>
                                            <p className="font-medium text-foreground text-sm sm:text-base">{section.title}</p>
                                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">{section.summary}</p>
                                        </button>
                                    ))
                                )}
                            </div>
                        ) : (
                            /* ── Page content ─────────────────────────────── */
                            <div>
                                {/* Page header */}
                                <FadeIn>
                                    <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                                        <div className="text-primary mt-0.5 sm:mt-0">{activePage.icon}</div>
                                        <h2 className="text-xl sm:text-2xl md:text-3xl font-montserrat font-bold text-foreground leading-tight">
                                            {activePage.title}
                                        </h2>
                                        {activePage.beta && (
                                            <span className="text-xs font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full">
                                                Beta
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-6 sm:mb-8">{activePage.description}</p>
                                    <div className="border-b border-border mb-6 sm:mb-8" />
                                </FadeIn>

                                {/* Sections */}
                                <div className="space-y-8 sm:space-y-10">
                                    {activePage.sections.map((section) => (
                                        <FadeIn key={section.id}>
                                            <section id={section.id} className="scroll-mt-24">
                                                <h3 className="text-base sm:text-lg font-montserrat font-semibold text-foreground mb-1">
                                                    {section.title}
                                                </h3>
                                                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{section.summary}</p>

                                                {section.body?.map((para, i) => (
                                                    <p key={i} className="text-sm text-foreground/80 mb-3 leading-relaxed">{para}</p>
                                                ))}

                                                {section.steps && (
                                                    <div className="mt-3 sm:mt-4">
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Steps</p>
                                                        <StepList steps={section.steps} />
                                                    </div>
                                                )}

                                                {section.fields && (
                                                    <div className="mt-3 sm:mt-4">
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Fields</p>
                                                        <FieldTable fields={section.fields} />
                                                    </div>
                                                )}

                                                {section.notes && (
                                                    <div className="mt-3 sm:mt-4 space-y-3">
                                                        {section.notes.map((note, i) => (
                                                            <NoteCallout key={i} note={note} />
                                                        ))}
                                                    </div>
                                                )}
                                            </section>
                                        </FadeIn>
                                    ))}
                                </div>

                                {/* Page nav footer */}
                                <FadeIn>
                                    <div className="mt-12 sm:mt-14 pt-6 sm:pt-8 border-t border-border flex items-center justify-between gap-4">
                                        {(() => {
                                            const idx = DOCS.findIndex((p) => p.id === activePage.id)
                                            const prev = DOCS[idx - 1]
                                            const next = DOCS[idx + 1]
                                            return (
                                                <>
                                                    <div className="flex-1">
                                                        {prev && (
                                                            <button
                                                                onClick={() => selectPage(prev.id)}
                                                                className="group flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
                                                            >
                                                                <ChevronRight className="w-4 h-4 rotate-180 flex-shrink-0" />
                                                                <span className="text-left truncate">{prev.title}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 flex justify-end">
                                                        {next && (
                                                            <button
                                                                onClick={() => selectPage(next.id)}
                                                                className="group flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
                                                            >
                                                                <span className="text-right truncate">{next.title}</span>
                                                                <ChevronRight className="w-4 h-4 flex-shrink-0" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            )
                                        })()}
                                    </div>
                                </FadeIn>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    )
}