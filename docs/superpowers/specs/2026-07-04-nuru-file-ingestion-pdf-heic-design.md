# Nuru File Ingestion — PDF text + HEIC photos — Design

**Date:** 2026-07-04
**Status:** Approved (pending spec review)

## Problem

Uploading certain note files fails with an opaque "Could not read the file" (422).

Root cause: the notes upload route accepts file types the OCR backend cannot read.
`apps/web/app/api/mobile/notes/route.ts` sets:

```
IMAGE_TYPES = ['image/jpeg','image/png','image/webp','image/heic','image/heif']
FILE_TYPES  = [...IMAGE_TYPES, 'application/pdf']
```

but extraction goes through Azure AI Vision "Image Analysis 4.0 read"
(`_ingest/extract.ts`), which reads only raster image formats
(JPEG/PNG/BMP/WEBP/TIFF/GIF/ICO/MPO). It does **not** accept **PDF**, **HEIC**, or
**HEIF**. Those uploads pass the type check, upload to storage, then throw at
`extractText` → the route's catch returns the generic 422.

Impact:
- **HEIC/HEIF** is the default iPhone camera/library format → hits real users
  constantly.
- **PDF** is common coursework (Word/Docs exports, lecture handouts).

## Goals

1. Text-based PDFs are read and turned into note content — with pure JS, no OCR,
   no vendor cost.
2. iPhone HEIC/HEIF photos become notes — via on-device conversion to JPEG before
   upload, so the server only sees formats the OCR backend accepts.
3. When a file genuinely cannot be read, the user sees an *actionable* message,
   not the generic "Could not read the file."
4. The chat composer's "+" becomes a real attach affordance: a small dropdown
   (Files active, Camera greyed/"coming soon"); picking a file creates a note via
   the same ingest pipeline and scopes the chat to it.

## Non-Goals (deferred — YAGNI)

- OCR of scanned/photo PDFs (no text layer). Requires page rasterization — a
  separate follow-up. For now these get a clear "import as a photo instead"
  message.
- Server-side HEIC decoding (native/wasm codec in Vercel serverless). The client
  converts instead.
- Multi-page PDF layout fidelity beyond concatenating extracted page text.
- Camera capture (the dropdown's Camera row is greyed/"coming soon").
- Ephemeral (not-saved) chat attachments — the chat "+" always creates a note.
- Attach preview thumbnails / a recent-images strip in the dropdown.

## Architecture

Three coordinated parts across the existing pipeline. No new subsystems.

### Part 1 — PDF text extraction (server, pure JS)

New module `apps/web/app/api/mobile/notes/_ingest/extractPdfText.ts`:

```
extractPdfText(bytes: ArrayBuffer): Promise<string>
```

Uses **`unpdf`** — a maintained, serverless-friendly pure-JS wrapper around
pdf.js (no native binary; safe on Vercel Node functions). Returns the
concatenated text of all pages, trimmed. A PDF with no text layer (scanned/photo
PDF) returns `''` — the signal the route uses to emit the scanned-PDF message.

Route change in `route.ts`, replacing the single `extractText` call in the file
branch:

```
if (file.type === 'application/pdf') {
  content = await extractPdfText(bytes)
  if (!content) {
    return 422 { error: 'This looks like a scanned PDF — import it as a photo instead.' }
  }
} else {
  content = await extractText(bytes, file.type)   // Azure OCR, images only
  if (!content) {
    return 422 { error: 'No text found in this image — try a clearer photo.' }
  }
}
```

A thrown extractor error (either path) still maps to the existing generic
`422 { error: 'Could not read the file.' }` — now reserved for genuine failures.

### Part 2 — HEIC→JPEG on device (client)

Add **`expo-image-manipulator`** (standard Expo module; SDK-57 version resolved by
`expo install`). `expo-image-picker` is already present.

A shared helper `apps/nuru/services/upload.ts` normalizes any picked asset before
upload (used by both `AddNoteSheet` and the chat attach flow in Part 4):

```
async function toUploadable(asset): { uri, name, type } {
  const isHeic = /heic|heif/i.test(asset.mimeType ?? '') || /\.hei[cf]$/i.test(asset.name ?? '')
  if (!isHeic) return { uri, name, type }
  const out = await ImageManipulator.manipulateAsync(asset.uri, [], {
    format: ImageManipulator.SaveFormat.JPEG, compress: 0.85,
  })
  return { uri: out.uri, name: renameExt(name, 'jpg'), type: 'image/jpeg' }
}
```

Applied in **both** `pickPhoto` and `pickFile` (a PDF passes through untouched;
only HEIC/HEIF is converted). The server therefore only ever receives
JPEG/PNG/WEBP/PDF.

### Part 3 — Accept-list + error surfacing (glue)

**Server `FILE_TYPES`:** drop `image/heic`/`image/heif` (the client converts them
away). Net server accept list:

```
IMAGE_TYPES = ['image/jpeg','image/png','image/webp']
FILE_TYPES  = [...IMAGE_TYPES, 'application/pdf']
```

Defense-in-depth: if some path ever sends raw HEIC, it now fails fast with the
existing `400 'Unsupported file type'` (clear) instead of an OCR failure (opaque).

**Error surfacing:** no client change needed — `apps/nuru/services/notes.ts`
`create()` already rethrows the server's `error` field
(`throw new Error(msg.error ?? 'Upload failed')`), and `AddNoteSheet` already
renders it via `setError((e as Error).message)`. The three distinct server
messages (scanned-PDF / no-text-image / generic) reach the user as-is.

### Part 4 — Chat "+" attach → create note → scope chat (client)

The chat composer's "+" (`ChatInputBar.tsx`, today a dead `View` placeholder)
becomes a real `Pressable` that opens a small anchored dropdown.

New component `apps/nuru/components/AttachMenu.tsx` — a lightweight popover (an
absolutely-positioned card above the "+", plus a transparent full-screen backdrop
that dismisses on outside tap; **not** a full-screen Modal). Two rows:
- **📄 Files** (active) → `expo-document-picker`,
  `type: ['application/pdf','image/*']`.
- **📷 Camera** (greyed, `disabled`, "coming soon") — mirrors the existing greyed
  "Record voice" row pattern.

On file pick, the flow is identical to `AddNoteSheet.upload()`: `toUploadable`
(HEIC→JPEG per Part 2) → `notes.create({ source:'file', file })` → the full ingest
(Parts 1/3) → a persisted note with `{ id, title }`.

**Scoping.** `app/(tabs)/index.tsx` already owns `contextNoteIds` + `contextLabel`
and passes `scopeLabel` to `ChatInputBar`. On successful create, the attach flow
sets `contextNoteIds=[note.id]` and `contextLabel=note.title` — the scope chip
flips from "All notes" to the note title, and the next question is asked against
it via the existing `noteInFocus` path. The attach handler and its busy/error
state live in `index.tsx`; `ChatInputBar` gains `onAttach: () => void` (opens the
menu) and an `attaching?: boolean` (spinner/disable the "+").

**States.** While ingesting, the "+" shows a spinner and is disabled. Cancel is a
no-op. Extraction failures surface the Part 3 messages inline near the composer
(reuse the screen's existing error line). The picked file is HEIC-converted before
upload, same as AddNoteSheet.

`AddNoteSheet` is unchanged in this pass (it keeps its own rows); the dropdown is
wired only to chat. `AttachMenu` is written standalone so AddNoteSheet could adopt
it later.

## Data Flow

```
Add-note surface (AddNoteSheet rows) ── or ── Chat "+" (AttachMenu → Files)
  └─ toUploadable: HEIC/HEIF → JPEG (on device); else pass-through
      └─ notes.create → multipart POST /api/mobile/notes
          ├─ type check (jpeg/png/webp/pdf only)
          ├─ upload original to private bucket
          └─ extract:
               pdf  → extractPdfText (pure JS)  → '' ⇒ "scanned PDF" 422
               image→ extractText   (Azure OCR) → '' ⇒ "no text" 422
          └─ chunk + embed + persist note (unchanged)
  └─ (chat path only) set scope → contextNoteIds=[note.id], label=note.title
```

## Error Handling

| Case | Status | Message |
|------|--------|---------|
| PDF, no text layer | 422 | This looks like a scanned PDF — import it as a photo instead. |
| Image, OCR empty | 422 | No text found in this image — try a clearer photo. |
| Extractor/vendor throws | 422 | Could not read the file. |
| HEIC reaches server (shouldn't) | 400 | Unsupported file type |
| >8MB | 400 | File too large (max 8 MB) |

## Testing

- **Pure unit (`node:test` + `node:assert/strict`, repo idiom):**
  `extractPdfText` — a known text-PDF fixture buffer returns its text; a
  no-text-layer fixture returns `''`. Commit both tiny fixtures under
  `_ingest/__fixtures__/`.
- **Typecheck:** `apps/web` and `apps/nuru` (`tsc --noEmit`).
- **Bundle guard:** `expo export --platform android` succeeds (confirms
  `expo-image-manipulator` bundles).
- **Device:** iPhone HEIC photo → note has text; text PDF → note has text; scanned
  PDF → the specific "import as a photo" message; **chat "+" → Files → pick a
  PDF → a note is created, the scope chip flips to its title, and a follow-up
  question is answered against it** (Camera row visibly greyed).

Part 4 adds no pure logic (it reuses `notes.create` + ingest, already covered), so
its coverage is typecheck + `expo export` + the device check above.

## Files

**Backend (`apps/web/app/api/mobile/notes/`):**
- `_ingest/extractPdfText.ts` (new) — pure-JS PDF text extraction via `unpdf`.
- `_ingest/extractPdfText.test.ts` (new) — text vs no-text-layer.
- `_ingest/__fixtures__/*.pdf` (new) — two tiny fixtures.
- `route.ts` (modify) — branch pdf vs image; drop heic/heif from accept list;
  split the 422 messages.
- `apps/web/package.json` — add `unpdf`.

**Client (`apps/nuru/`):**
- `components/AddNoteSheet.tsx` (modify) — `toUploadable` HEIC→JPEG before upload.
- `services/upload.ts` (new) — shared `toUploadable(asset)` helper (HEIC→JPEG),
  used by both AddNoteSheet and the chat attach flow.
- `components/AttachMenu.tsx` (new) — the small Files/Camera(greyed) dropdown.
- `components/ChatInputBar.tsx` (modify) — "+" becomes a `Pressable` with
  `onAttach` + `attaching` props.
- `app/(tabs)/index.tsx` (modify) — attach handler: pick → create note → set
  scope; holds the AttachMenu open state + attaching/error state.
- `package.json` — add `expo-image-manipulator`.
