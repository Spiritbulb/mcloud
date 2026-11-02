import 'server-only'
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

let cached: S3Client | undefined

function client(): S3Client {
  return (cached ??= new S3Client({
    endpoint: process.env.B2_ENDPOINT,
    region: process.env.B2_REGION,
    forcePathStyle: true,
    credentials: { accessKeyId: process.env.B2_KEY_ID!, secretAccessKey: process.env.B2_APPLICATION_KEY! },
  }))
}

const Bucket = () => process.env.B2_BUCKET!

export function presignPut(key: string, bytes: number): Promise<string> {
  return getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: Bucket(), Key: key, ContentType: 'application/pdf', ContentLength: bytes }),
    { expiresIn: 600 },
  )
}

export function presignGet(key: string): Promise<string> {
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: Bucket(), Key: key }), { expiresIn: 300 })
}

export async function headBytes(key: string): Promise<number | null> {
  try {
    const r = await client().send(new HeadObjectCommand({ Bucket: Bucket(), Key: key }))
    return r.ContentLength ?? null
  } catch (err) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } }
    if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) return null
    throw err
  }
}

async function body(key: string, range?: string): Promise<Uint8Array> {
  const r = await client().send(new GetObjectCommand({ Bucket: Bucket(), Key: key, Range: range }))
  if (!r.Body) throw new Error('empty object body')
  return r.Body.transformToByteArray()
}

/** Bytes 0..end inclusive. */
export function readRange(key: string, end: number): Promise<Uint8Array> {
  return body(key, `bytes=0-${end}`)
}

export function getBytes(key: string): Promise<Uint8Array> {
  return body(key)
}

export async function deleteObject(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: Bucket(), Key: key }))
}
