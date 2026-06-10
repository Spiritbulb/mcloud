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
    item_type: string
    logo_url: string | null
    currency: string
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

export interface StoreNavProps {
    store: Store
    themeId?: string
}

export interface StoreFrontProps {
    store: Store
    products: Product[]
    collections: Collection[]
    featuredProducts: Product[]
    services: ServiceItem[]
}

export interface ServicesPageProps {
    storeSlug: string
    storeId: string
    services: ServiceItem[]
    loading?: boolean
    error?: string | null
    currency: string
    onRetry?: () => void
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
    item_type: string
    is_active: boolean
    sku: string | null
}

export interface Collection {
    id: string
    name: string
    slug: string
    description: string | null
    image_url: string | null
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
    track_inventory: boolean

    is_active: boolean
    sku: string | null
    metadata: any
    position?: number
}





export interface ProductsPageProps {
    storeSlug: string
    products: ProductItem[]
    services?: ServiceItem[]
    loading?: boolean
    error?: string | null
    storeId: string
    currency: string
    onRetry?: () => void
}

// ── Product detail page ────────────────────────────────────────────────────────
export interface Variant {
    id: string
    name: string
    price: string
    inventory_quantity: string
    options: Record<string, string>
    compare_at_price: string
    is_active: boolean
    sku: string | null
    image_url: string
}

export interface ProductVariant {
  id: string
  name: string
  price: number
  compare_at_price?: number | null
  inventory_quantity: number
  options?: Record<string, string>
  sku?: string | null
  image_url?: string | null
  is_active?: boolean
  position?: number
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
    reviewCount?: number
    avgRating?: number | null
    position?: number
    metadata: {
        tags?: string[]
        productType?: string
        compare_at_price?: number
        rating?: number
        reviews?: number
        features?: string[]
        descriptionHtml?: string
    }
    variants?: ProductVariant[]
}


export interface ProductDetailPageProps {
    storeSlug: string
    storeId: string
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
    onReviewSubmitted: () => void
}

// ── Service detail page ────────────────────────────────────────────────────────
export interface ServiceMediaItem {
    id: string
    url: string
    path?: string
    alt?: string
    type: 'image' | 'video'
}

export interface ServicePackage {
    id: string
    name: string
    price: string         
    description: string | null
    deliverables: string[] 
    delivery_days: number  
    revisions: number | null 
    is_featured?: boolean
}

export interface ServicesPageProps {
    storeSlug: string
    storeId: string
    services: ServiceItem[]
    loading?: boolean
    error?: string | null
    currency: string
    onRetry?: () => void
}

export interface ServiceItem {
    id: string
    name: string
    slug: string
    description: string | null
    item_type: string
    price: number
    images: string[]
    compare_at_price: number | null
    is_active: boolean
    sku: string | null
    media: ServiceMediaItem[]
    availability: 'available' | 'busy' | 'unavailable'
    packages?: ServicePackage[]
    metadata: {
        // ── Media ──────────────────────────────
        media?: ServiceMediaItem[]

        // ── Availability & Booking ─────────────
        availability?: 'available' | 'busy' | 'unavailable'  // ✅ moved from root
        booking?: 'instant' | 'scheduled' | 'quote_only'     // ✅ was bookingType

        // ── Packages ───────────────────────────
        packages?: ServicePackage[]          // ✅ moved from root

        // ── Discovery ──────────────────────────
        tags?: string[]
        serviceType?: string
        rating?: number
        reviews?: number
        features?: string[]
        descriptionHtml?: string | null

        // ── Quantity ───────────────────────────
        quantityUnit?: string               // ✅ was required
        minQuantity?: number | null
        maxQuantity?: number | null
        quantityStep?: number | null

        // ── Duration ───────────────────────────
        durationMinutes?: number | null
        durationHours?: number | null
        durationDay?: number | null

        // ── Delivery & Location ────────────────
        deliveryDays?: number | null
        location?: string | null

        // ── Deposit ────────────────────────────
        requiresDeposit?: boolean
        depositPercent?: number | null
    }
}



export interface ServiceDetailsPageProps {
    storeSlug: string
    service: ServiceItem
    selectedPackage: ServicePackage | null
    quantity: number
    currentMediaIndex: number
    onPackageChange: (packageId: string) => void
    onQuantityChange: (qty: number) => void
    onMediaChange: (index: number) => void
    onBookService: () => void
    isBooking: boolean
    metadata: { quantityUnit: string }
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
    pesapalEnabled?: boolean
    intasendEnabled?: boolean
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
    onPesapalCheckout?: () => Promise<void>
    onIntasendCheckout?: () => Promise<void>
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