import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dropRetiredImages, isRetiredImageUrl } from './retired-images.ts'

const R2 = 'https://pub-a01c7b0d90e245b4a86d38444ccb87f8.r2.dev/store-assets/x/a.jpg'

test('isRetiredImageUrl matches only the r2.dev host', () => {
  assert.equal(isRetiredImageUrl(R2), true)
  assert.equal(isRetiredImageUrl(` ${R2} `), true)
  assert.equal(isRetiredImageUrl('https://s3.eu-central-003.backblazeb2.com/b/a.jpg'), false)
  assert.equal(isRetiredImageUrl('https://example.com/r2.dev/a.jpg'), false)
  assert.equal(isRetiredImageUrl('https://notr2.dev.example.com/a.jpg'), false)
  assert.equal(isRetiredImageUrl(''), false)
  assert.equal(isRetiredImageUrl(null), false)
  assert.equal(isRetiredImageUrl(42), false)
})

test('dropRetiredImages removes from arrays and blanks fields, at any depth', () => {
  const ok = 'https://images.unsplash.com/a.jpg'
  assert.deepEqual(
    dropRetiredImages({
      logo_url: R2,
      name: 'Shop',
      images: [R2, ok],
      settings: {
        heroSlides: [{ image: R2, title: 'Hi' }],
        galleryPhotos: [{ url: R2 }, { url: ok }],
      },
      media: [{ type: 'image', url: R2 }, { type: 'video', url: ok }],
      count: 3,
      empty: null,
    }),
    {
      logo_url: '',
      name: 'Shop',
      images: [ok],
      settings: { heroSlides: [{ image: '', title: 'Hi' }], galleryPhotos: [{ url: ok }] },
      media: [{ type: 'video', url: ok }],
      count: 3,
      empty: null,
    },
  )
})

test('dropRetiredImages leaves non-plain objects alone', () => {
  const d = new Date(0)
  assert.equal(dropRetiredImages(d), d)
  assert.equal(dropRetiredImages(R2), '')
  assert.equal(dropRetiredImages(null), null)
})
