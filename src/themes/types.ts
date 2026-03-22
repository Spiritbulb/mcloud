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
    // Nullable in Supabase generated types — settings pages pass the raw row
    // directly so these need to match what the DB actually returns.
    is_active?: boolean | null
    is_pro?: boolean
    custom_domain?: string | null
    timezone?: string | null
    owner_id?: string
    created_at?: string | null
    updated_at?: string | null
    settings: {
        heroTitle?: string
        heroSubtitle?: string
        heroImage?: string
        heroImagePath?: string
        logoPath?: string
        themeId?: string
        heroSlides?: HeroSlide[]
        socialLinks?: {
            instagram?: string
            twitter?: string
            tiktok?: string
            whatsapp?: string
        }
        galleryPhotos?: GalleryPhoto[]
        [key: string]: unknown  // allows other settings without casting
    }
}

export interface GalleryPhoto {
    id: string
    url: string
    path?: string
    caption?: string
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

// ─────────────────────────────────────────────────────────────────────────────
// Blog types
// ─────────────────────────────────────────────────────────────────────────────

export interface BlogAuthor {
    id: string
    store_id: string
    name: string
    bio: string | null
    avatar_url: string | null
    user_id: string | null
    created_at: string
    updated_at: string
}

export interface BlogPost {
    id: string
    store_id: string
    author_id: string | null
    author: BlogAuthor | null
    title: string
    slug: string
    excerpt: string | null
    content: string
    cover_image: string | null
    tags: string[]
    is_published: boolean
    published_at: string | null
    reading_time_minutes: number | null
    metadata: {
        seo_title?: string
        seo_description?: string
        featured?: boolean
    }
    created_at: string
    updated_at: string
}

export interface BlogListPageProps {
    storeSlug: string
    posts: BlogPost[]
    loading?: boolean
    error?: string | null
    onRetry?: () => void
}

export interface BlogPostPageProps {
    storeSlug: string
    post: BlogPost
    relatedPosts: BlogPost[]
    contentHtml: string
}