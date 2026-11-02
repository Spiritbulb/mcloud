import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.B2_ENDPOINT = 'https://s3.example-region.backblazeb2.com'
process.env.B2_REGION = 'example-region'
process.env.B2_BUCKET = 'bucket'
process.env.B2_KEY_ID = 'AKIDEXAMPLE'
process.env.B2_APPLICATION_KEY = 'secret'

const { presignGet, presignPut } = await import('./b2-presign')

test('presigned PUT has no checksum params and signs content-length', async () => {
  const url = new URL(await presignPut('files/u/f/a.pdf', 1234))
  const keys = [...url.searchParams.keys()].map((k) => k.toLowerCase())
  assert.equal(keys.some((k) => k.includes('x-amz-checksum') || k.includes('x-amz-sdk-checksum')), false, url.search)
  assert.match(url.searchParams.get('X-Amz-SignedHeaders') ?? '', /content-length/)
  assert.equal(url.searchParams.get('X-Amz-Expires'), '600')
})

test('presigned GET forces an inline pdf response with a safe filename', async () => {
  const href = await presignGet('files/u/f/a.pdf', 'bad"name\r\n.PDF')
  const url = new URL(href)
  assert.equal(url.searchParams.get('response-content-type'), 'application/pdf')
  assert.match(href, /response-content-type=application%2Fpdf/)
  const cd = url.searchParams.get('response-content-disposition') ?? ''
  assert.match(cd, /^inline; filename="[A-Za-z0-9._-]+"$/)
  assert.equal(url.searchParams.get('X-Amz-Expires'), '3600')
})
