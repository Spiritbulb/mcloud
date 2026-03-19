import { Store, Palette, Package, ShoppingBag, CreditCard, Globe, Link2, Bell, Shield, FileText, CheckCircle2, AlertTriangle, Info, Sparkles } from "lucide-react"

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