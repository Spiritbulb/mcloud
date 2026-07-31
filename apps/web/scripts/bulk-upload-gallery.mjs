
// scripts/bulk-upload-gallery.mjs
//
// Usage:
//   node scripts/bulk-upload-gallery.mjs <local-folder> <store-slug>
//
// Example:
//   node scripts/bulk-upload-gallery.mjs ./photos tbs
//
// Requires env vars (same ones your app already uses):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   <- service role, NOT anon key (bypasses RLS)
//
// What it does:
//   1. Reads every image file in <local-folder>
//   2. Uploads each to the `store-assets` bucket at `${storeId}/gallery/<filename>`
//   3. Gets each file's public URL
//   4. Reads the store's current `settings` JSON, appends new galleryPhotos
//      records ({ image: url, caption: '' }), and writes it back in ONE update.
//
// This intentionally does NOT go through ImagePicker/EditorClient at all --
// it writes directly to stores.settings, the same column the editor itself
// saves to. Reload the Editor afterward and the photos will already be there.

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return
  const text = fs.readFileSync(file, 'utf8')

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue

    const idx = trimmed.indexOf('=')
    const key = trimmed.slice(0, idx).trim()
    let val = trimmed.slice(idx + 1).trim()

    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }

    if (!(key in process.env)) process.env[key] = val
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const [, , folderArg, slugArg] = process.argv

if (!folderArg || !slugArg) {
  console.error('Usage: node bulk-upload-gallery.mjs <local-folder> <store-slug>')
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'])

async function main() {
  const folder = path.resolve(folderArg)
  const files = fs
    .readdirSync(folder)
    .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))
    .sort()

  if (files.length === 0) {
    console.error(`No image files found in ${folder}`)
    process.exit(1)
  }

  console.log(`Found ${files.length} images. Looking up store "${slugArg}"...`)

  // Adjust the column name / query if your stores table differs.
  const { data: store, error: storeErr } = await supabase
    .from('stores')
    .select('id, settings')
    .eq('slug', slugArg)
    .single()

  if (storeErr || !store) {
    console.error('Could not find store:', storeErr?.message ?? 'no row')
    process.exit(1)
  }

  const bucket = 'store-assets'
  const prefix = `${store.id}/gallery`
  const uploaded = []

  for (const file of files) {
    const filePath = path.join(folder, file)
    const buffer = fs.readFileSync(filePath)
    const destPath = `${prefix}/${file}`

    console.log(`Uploading ${file}...`)
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(destPath, buffer, { upsert: true, contentType: guessMime(file) })

    if (upErr) {
      console.error(`  Failed: ${upErr.message}`)
      continue
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(destPath)
    uploaded.push({ image: pub.publicUrl, caption: '' })
    console.log(`  OK -> ${pub.publicUrl}`)
  }

  if (uploaded.length === 0) {
    console.error('Nothing uploaded successfully. Aborting settings update.')
    process.exit(1)
  }

  const settings = store.settings && typeof store.settings === 'object' ? store.settings : {}
  const existing = Array.isArray(settings.galleryPhotos) ? settings.galleryPhotos : []
  const nextSettings = { ...settings, galleryPhotos: [...existing, ...uploaded] }

  const { error: updateErr } = await supabase
    .from('stores')
    .update({ settings: nextSettings })
    .eq('id', store.id)

  if (updateErr) {
    console.error('Failed to update store settings:', updateErr.message)
    process.exit(1)
  }

  console.log(`\nDone. ${uploaded.length} photos added to galleryPhotos for store "${slugArg}".`)
  console.log('Reload the Editor to see them.')
}

function guessMime(filename) {
  const ext = path.extname(filename).toLowerCase()
  return { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif' }[ext] ?? 'application/octet-stream'
}

main()
