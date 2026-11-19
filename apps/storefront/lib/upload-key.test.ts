import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseUploadKey, checkUploadHeaders, publicObjectUrl, uniqueUploadKey, isServableImageType, MAX_UPLOAD_BYTES } from './upload-key.ts'

const ID = '123e4567-e89b-12d3-a456-426614174000'

test('accepts keys inside a store', () => {
  assert.deepEqual(parseUploadKey(`store-assets/${ID}/logo/photo.webp`), {
    bucket: 'store-assets', storeId: ID, key: `store-assets/${ID}/logo/photo.webp`,
  })
  assert.ok(parseUploadKey(`product-images/${ID}/products/My Shoe (1).jpg`))
  assert.ok(parseUploadKey(`store-assets/${ID}/slides/0/a.png`))
})

test('rejects other buckets, non-uuid stores, traversal and junk', () => {
  assert.equal(parseUploadKey(null), null)
  assert.equal(parseUploadKey(''), null)
  assert.equal(parseUploadKey('theme/photo.png'), null)
  assert.equal(parseUploadKey(`other/${ID}/a.png`), null)
  assert.equal(parseUploadKey('store-assets/__storeId__/gallery/0/a.png'), null)
  assert.equal(parseUploadKey(`store-assets/${ID}`), null)
  assert.equal(parseUploadKey(`store-assets/${ID}/../${ID}/a.png`), null)
  assert.equal(parseUploadKey(`store-assets/${ID}//a.png`), null)
  assert.equal(parseUploadKey(`store-assets/${ID}/a..png`), null)
  assert.equal(parseUploadKey(`store-assets/${ID}/.hidden`), null)
  assert.equal(parseUploadKey(`store-assets/${ID}/${'x'.repeat(500)}`), null)
})

test('upload headers: images only, bounded, length required', () => {
  assert.deepEqual(checkUploadHeaders('image/png', '1000'), { ok: true })
  assert.equal((checkUploadHeaders('image/svg+xml', '1000') as any).status, 415)
  assert.equal((checkUploadHeaders('text/html', '1000') as any).status, 415)
  assert.equal((checkUploadHeaders(null, '1000') as any).status, 415)
  assert.equal((checkUploadHeaders('image/png', null) as any).status, 411)
  assert.equal((checkUploadHeaders('image/png', String(MAX_UPLOAD_BYTES + 1)) as any).status, 413)
})

test('publicObjectUrl joins the base and encodes each segment', () => {
  assert.equal(
    publicObjectUrl('https://s3.eu-central-003.backblazeb2.com/mcloud/', `store-assets/${ID}/products/My Shoe (1).jpg`),
    `https://s3.eu-central-003.backblazeb2.com/mcloud/store-assets/${ID}/products/My%20Shoe%20(1).jpg`,
  )
})

test('uniqueUploadKey tags the file name and keeps the key valid', () => {
  assert.equal(uniqueUploadKey(`store-assets/${ID}/logo/photo.webp`, 'a1b2c3d4'), `store-assets/${ID}/logo/a1b2c3d4-photo.webp`)
  const long = uniqueUploadKey(`store-assets/${ID}/products/${'x'.repeat(118)}.jpg`, 'a1b2c3d4')
  const file = long.split('/').pop()!
  assert.equal(file.length, 120)
  assert.ok(file.startsWith('a1b2c3d4-') && file.endsWith('.jpg'))
  assert.ok(parseUploadKey(long))
})

test('isServableImageType allows raster images only', () => {
  assert.equal(isServableImageType('image/jpeg'), true)
  assert.equal(isServableImageType('image/webp; charset=binary'), true)
  assert.equal(isServableImageType('image/svg+xml'), false)
  assert.equal(isServableImageType('text/html'), false)
  assert.equal(isServableImageType(undefined), false)
})
