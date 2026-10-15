// @route-kind: mobile
// POST /api/mobile/reach/vendor/products/[productId]/photo — a vendor uploads a photo for one of their
// own products. multipart/form-data with `file`. Returns { url }; the app then saves it on the product.
//
// Unlike the generic /api/mobile/upload (any signed-in user, any path), this proves the product is the
// vendor's and builds the path itself: product-images/<storeId>/products/<productId>/<random>.<ext>, the
// platform's `<bucket>/<storeId>/…` convention. A new random name per upload (no upsert), so one
// vendor can never overwrite another store's file or an earlier photo that is still on a live page.
import { NextResponse, type NextRequest } from 'next/server'
import { ownedProductIds } from '@/lib/reach/catalog'
import { reachDb } from '@/lib/reach/db'
import { vendorFor } from '@/lib/reach/vendor'
import { fail, requireMobileUser } from '../../../../../_lib'

const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' }
const MAX_SIZE = 8 * 1024 * 1024 // 8 MB; the app resizes to well under this first
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const vendor = await vendorFor(auth.user.id)
    if (!vendor) return fail(403, 'Not a vendor')

    const { productId } = await params
    if (!UUID_RE.test(productId)) return fail(400, 'Invalid product')

    const form = await req.formData().catch(() => null)
    const file = form?.get('file')
    if (!(file instanceof File)) return fail(400, 'No file provided')
    const ext = TYPES[file.type]
    if (!ext) return fail(400, 'Use a JPEG, PNG, WebP or HEIC photo')
    if (file.size > MAX_SIZE) return fail(400, 'That photo is too large (8 MB max)')

    const db = await reachDb()
    const owned = await ownedProductIds(db, vendor, [productId])
    if (!owned.has(productId)) return fail(403, 'This product is not yours')

    const { data: product } = await db.from('products').select('store_id').eq('id', productId).single()
    if (!product) return fail(404, 'Product not found')

    const path = `${product.store_id}/products/${productId}/${crypto.randomUUID()}.${ext}`
    const { error } = await db.storage.from('product-images').upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false })
    if (error) {
        console.error('[reach photo upload]', error.message)
        return fail(500, 'Upload failed. Try again.')
    }
    const { data } = db.storage.from('product-images').getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl })
}
