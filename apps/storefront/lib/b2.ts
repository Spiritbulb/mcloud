import 'server-only'
// Merchant uploads (logos, product, gallery and editor images) live in a Backblaze B2 bucket,
// written over B2's S3-compatible API. Same client setup as Nuru (apps/nuru/lib/files), but a
// separate bucket and key.
//
// TEMPORARY (2026-11): the bucket is private until it can be made public, so images are served
// through /api/media/<key> (app/api/media/[...key]/route.ts). Once the bucket is public, set
// B2_PUBLIC_URL and new uploads link to B2 directly; /api/media stays for URLs already saved.
// Env: B2_ENDPOINT, B2_REGION, B2_BUCKET, B2_KEY_ID, B2_APPLICATION_KEY, optional B2_PUBLIC_URL.
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { publicObjectUrl } from './upload-key'

let cached: S3Client | undefined

function client(): S3Client {
    return (cached ??= new S3Client({
        endpoint: process.env.B2_ENDPOINT,
        region: process.env.B2_REGION,
        forcePathStyle: true,
        // B2 rejects the SDK's default flexible checksums on PutObject.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
        credentials: { accessKeyId: process.env.B2_KEY_ID!, secretAccessKey: process.env.B2_APPLICATION_KEY! },
    }))
}

const bucket = () => process.env.B2_BUCKET!

export function b2Configured(): boolean {
    return !!(process.env.B2_ENDPOINT && process.env.B2_REGION && process.env.B2_BUCKET
        && process.env.B2_KEY_ID && process.env.B2_APPLICATION_KEY)
}

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await client().send(new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentLength: body.byteLength,
        // Keys are unique per upload (uniqueUploadKey), so an object never changes.
        CacheControl: 'public, max-age=31536000, immutable',
    }))
}

/**
 * The URL saved for an uploaded object: B2 directly when B2_PUBLIC_URL is set (public bucket),
 * otherwise this app's /api/media proxy on `origin`.
 */
export function objectUrl(origin: string, key: string): string {
    return publicObjectUrl(process.env.B2_PUBLIC_URL || `${origin}/api/media`, key)
}

export type StoredObject = { body: ReadableStream; contentType: string | undefined; bytes: number | undefined; etag: string | undefined }

/** The object, or null when it does not exist. */
export async function getObject(key: string): Promise<StoredObject | null> {
    try {
        const r = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }))
        if (!r.Body) return null
        return { body: r.Body.transformToWebStream(), contentType: r.ContentType, bytes: r.ContentLength, etag: r.ETag }
    } catch (err) {
        const e = err as { name?: string; $metadata?: { httpStatusCode?: number } }
        if (e.name === 'NoSuchKey' || e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) return null
        throw err
    }
}
