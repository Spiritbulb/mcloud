// Client and presigning for B2. No `server-only` here so it can be tested offline; import it only from b2.ts.
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { UPLOAD_WINDOW_MS, safeFilename } from './upload-logic'

let cached: S3Client | undefined

export function client(): S3Client {
  return (cached ??= new S3Client({
    endpoint: process.env.B2_ENDPOINT,
    region: process.env.B2_REGION,
    forcePathStyle: true,
    // Default flexible checksums would put the CRC of an empty body into the presigned URL and break browser PUTs.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: { accessKeyId: process.env.B2_KEY_ID!, secretAccessKey: process.env.B2_APPLICATION_KEY! },
  }))
}

export const bucket = () => process.env.B2_BUCKET!

export function presignPut(key: string, bytes: number): Promise<string> {
  return getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: 'application/pdf', ContentLength: bytes }),
    { expiresIn: UPLOAD_WINDOW_MS / 1000 },
  )
}

/** Always served as an inline PDF, whatever content type the object was stored with. */
export function presignGet(key: string, filename: string): Promise<string> {
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentType: 'application/pdf',
      ResponseContentDisposition: `inline; filename="${safeFilename(filename)}"`,
    }),
    { expiresIn: 3600 },
  )
}
