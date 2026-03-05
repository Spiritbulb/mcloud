// Shared prop types for all storefront theme components

export interface HeroSlide {
    title: string
    subtitle?: string
    image?: string
    imagePath?: string
    accent?: string
    buttonText?: string
}

export interface Store {
    id: string
    name: string
    slug: string
    description: string | null
    logo_url: string | null
    currency: string
    settings: {
        heroTitle?: string
        heroSubtitle?: string
        heroImage?: string
        heroImagePath?: string
        logoPath?: string
        heroSlides?: HeroSlide[]
        socialLinks?: {
            instagram?: string
            twitter?: string
            tiktok?: string
            whatsapp?: string
        }
    }
}

export interface Product {
    id: string
    name: string
    slug: string
    description: string | null
    price: number
    compare_at_price: number | null
    images: string[]
    inventory_quantity: number
    track_inventory: boolean
}

export interface Collection {
    id: string
    name: string
    slug: string
    description: string | null
    image_url: string | null
}

export interface StoreFrontProps {
    store: Store
    products: Product[]
    collections: Collection[]
    featuredProducts: Product[]
}

// ── Products page ──────────────────────────────────────────────────────────────
export interface ProductItem {
    id: string
    name: string
    slug: string
    description: string | null
    price: number
    compare_at_price: number | null
    images: string[]
    inventory_quantity: number
    is_active: boolean
    sku: string | null
    metadata: any
}

export interface ProductsPageProps {
    storeSlug: string
    products: ProductItem[]
    loading?: boolean
    error?: string | null
    onRetry?: () => void
}

// ── Product detail page ────────────────────────────────────────────────────────
export interface ProductVariant {
    id: string
    name: string
    price: number
    inventory_quantity: number
    options: Record<string, string>
    sku: string | null
    image_url: string | null
}

export interface ProductDetailData {
    id: string
    name: string
    slug: string
    description: string | null
    price: number
    compare_at_price: number | null
    images: string[]
    inventory_quantity: number
    is_active: boolean
    sku: string | null
    metadata: {
        tags?: string[]
        productType?: string
        rating?: number
        reviews?: number
        features?: string[]
        descriptionHtml?: string
    }
    variants?: ProductVariant[]
}

export interface ProductDetailPageProps {
    storeSlug: string
    product: ProductDetailData
    selectedVariant: ProductVariant | null
    selectedOptions: Record<string, string>
    quantity: number
    currentImageIndex: number
    onOptionChange: (optionName: string, value: string) => void
    onQuantityChange: (qty: number) => void
    onImageChange: (index: number) => void
    onAddToCart: () => void
    isAddingToCart: boolean
}

// ── Cart page ─────────────────────────────────────────────────────────────────
export interface CartItem {
    variantId: string
    productId: string
    name: string
    price: number
    image: string
    quantity: number
}

export interface MpesaConfig {
    type: 'till' | 'paybill'
    number: string
    account?: string
    enabled: boolean
    paypalEnabled: boolean
}

export interface CartPageProps {
    storeSlug: string
    cartItems: CartItem[]
    loading: boolean
    itemLoadingStates: Record<string, boolean>
    mpesaConfig: MpesaConfig | null
    onUpdateQuantity: (variantId: string, qty: number) => void
    onRemoveItem: (variantId: string) => void
    onMpesaCheckout: (guest: GuestDetails) => Promise<void>
    onPaypalCheckout: () => Promise<void>
    isProcessing: boolean
}

export interface GuestDetails {
    mpesaPhone: string
    mpesaCode: string
    whatsapp: string
    email: string
}