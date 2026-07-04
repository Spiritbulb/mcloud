# Nuru File Ingestion (PDF text + HEIC + chat attach) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read text-based PDFs (pure JS), convert iPhone HEIC photos to JPEG on-device before OCR, surface actionable extraction errors, and make the chat "+" a real attach affordance that creates a note and scopes the chat to it.

**Architecture:** Server gains a pure-JS `extractPdfText` (unpdf) and branches PDF vs image in the notes route, with three distinct 422 messages. Client gains a shared `toUploadable` helper (HEIC→JPEG via expo-image-manipulator) used by both the add-note sheet and a new `AttachMenu` dropdown wired to the chat composer's "+"; a chat attach creates a note via the existing ingest pipeline and sets the scope chip to it.

**Tech Stack:** Next.js 16 route handler (`apps/web`), `unpdf@1.6.2` (pure-JS PDF text), Azure Vision OCR (existing, images only), Expo/React Native (`apps/nuru`), `expo-image-manipulator@~57.0.2`, `node:test` for pure functions.

## Global Constraints

- **unpdf API (VERIFIED against v1.6.2):** `getDocumentProxy(bytes: Uint8Array)` then `extractText(pdf, { mergePages: true })` → `{ totalPages: number; text: string }`. A PDF with no text layer yields `text === ''` (after trim). Import from `'unpdf'` (ships ESM + CJS).
- **Azure Vision OCR reads images only** (JPEG/PNG/BMP/WEBP/TIFF/GIF); it does NOT read PDF/HEIC/HEIF. Do not send those to `extractText` (the Azure one in `_ingest/extract.ts`).
- **Server accept list becomes:** `IMAGE_TYPES = ['image/jpeg','image/png','image/webp']`, `FILE_TYPES = [...IMAGE_TYPES, 'application/pdf']`. HEIC/HEIF are dropped (client converts them away).
- **Error messages (exact copy):** scanned PDF → `'This looks like a scanned PDF — import it as a photo instead.'`; image OCR empty → `'No text found in this image — try a clearer photo.'`; genuine extractor failure → `'Could not read the file.'`; wrong type → `'Unsupported file type'` (existing).
- **`notes.create()` already rethrows the server `error` field**, and `AddNoteSheet` already renders it — no client error-plumbing changes needed.
- **expo-image-manipulator version:** install via `npx expo install expo-image-manipulator` (resolves `~57.0.2` from Expo's bundledNativeModules). API: `manipulateAsync(uri, [], { format: SaveFormat.JPEG, compress: 0.85 })` → `{ uri }`.
- **Chat scope state lives in `app/(tabs)/index.tsx`:** `contextNoteIds: string[]`, `contextLabel: string | null`; `scopeLabel` is passed to `ChatInputBar`. Setting scope = set both to the created note.
- Tests are `node:test` + `node:assert/strict` on PURE functions. Backend tests run via the existing hook: `node --experimental-strip-types --import ./app/api/mobile/chat/_chat/_test-register.mjs --test <glob>` from `apps/web`.
- Commit frequently. Trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure

**Backend (`apps/web/app/api/mobile/notes/`):**
- `_ingest/extractPdfText.ts` (new) — pure-JS PDF text via unpdf.
- `_ingest/extractPdfText.test.ts` (new) — text vs no-text-layer.
- `_ingest/__fixtures__/hello.pdf` (new) — text PDF fixture.
- `_ingest/__fixtures__/notext.pdf` (new) — no-text-layer fixture.
- `route.ts` (modify) — branch pdf/image; drop heic/heif; split 422 messages.
- `apps/web/package.json` — add `unpdf`.

**Client (`apps/nuru/`):**
- `services/upload.ts` (new) — shared `toUploadable(asset)` HEIC→JPEG helper.
- `components/AttachMenu.tsx` (new) — Files/Camera(greyed) dropdown popover.
- `components/AddNoteSheet.tsx` (modify) — use `toUploadable` before upload.
- `components/ChatInputBar.tsx` (modify) — "+" becomes a Pressable with `onAttach` + `attaching`.
- `app/(tabs)/index.tsx` (modify) — attach handler: pick → create note → set scope; holds menu/attaching/error state.
- `apps/nuru/package.json` — add `expo-image-manipulator`.

---

## Task 1: PDF text extraction module

**Files:**
- Create: `apps/web/app/api/mobile/notes/_ingest/extractPdfText.ts`
- Test: `apps/web/app/api/mobile/notes/_ingest/extractPdfText.test.ts`
- Create: `apps/web/app/api/mobile/notes/_ingest/__fixtures__/hello.pdf`
- Create: `apps/web/app/api/mobile/notes/_ingest/__fixtures__/notext.pdf`
- Modify: `apps/web/package.json` (add `unpdf`)

**Interfaces:**
- Produces: `extractPdfText(bytes: ArrayBuffer): Promise<string>` — trimmed concatenated page text; `''` when no text layer.

- [ ] **Step 1: Install unpdf**

Run (from `apps/web`): `npm install unpdf@1.6.2`
Expected: `unpdf` appears in `apps/web/package.json` dependencies.

- [ ] **Step 2: Create the two PDF fixtures**

Run this from repo root to write both fixtures (byte-exact, verified to extract `"Hello Nuru"` and `""` respectively):

```bash
mkdir -p apps/web/app/api/mobile/notes/_ingest/__fixtures__
python - <<'PY'
import io
hello = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 24 Tf 20 100 Td (Hello Nuru) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
0000000101 00000 n 
0000000209 00000 n 
0000000297 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
367
%%EOF"""
notext = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R>>endobj
4 0 obj<</Length 0>>stream
endstream endobj
trailer<</Size 5/Root 1 0 R>>
%%EOF"""
open("apps/web/app/api/mobile/notes/_ingest/__fixtures__/hello.pdf","wb").write(hello)
open("apps/web/app/api/mobile/notes/_ingest/__fixtures__/notext.pdf","wb").write(notext)
print("fixtures written")
PY
```

Expected: `fixtures written`; two files exist.

- [ ] **Step 3: Write the failing test**

```ts
// apps/web/app/api/mobile/notes/_ingest/extractPdfText.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { extractPdfText } from './extractPdfText.ts'

async function fixture(name: string): Promise<ArrayBuffer> {
  const url = new URL(`./__fixtures__/${name}`, import.meta.url)
  const buf = await readFile(fileURLToPath(url))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

test('extracts text from a text-layer PDF', async () => {
  const out = await extractPdfText(await fixture('hello.pdf'))
  assert.match(out, /Hello Nuru/)
})

test('returns empty string for a PDF with no text layer (scanned)', async () => {
  const out = await extractPdfText(await fixture('notext.pdf'))
  assert.equal(out, '')
})
```

- [ ] **Step 4: Run it, expect fail**

Run (from `apps/web`): `node --test --experimental-strip-types app/api/mobile/notes/_ingest/extractPdfText.test.ts`
Expected: FAIL — cannot find `./extractPdfText.ts`.

- [ ] **Step 5: Implement**

```ts
// apps/web/app/api/mobile/notes/_ingest/extractPdfText.ts
// Pure-JS PDF text extraction (no OCR, no vendor cost). Used for text-based PDFs;
// a PDF with no text layer (scanned/photo) returns '' so the route can tell the
// user to upload it as a photo instead. unpdf wraps pdf.js and runs in a Node
// serverless function with no native binary.
import { extractText, getDocumentProxy } from 'unpdf'

export async function extractPdfText(bytes: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes))
  const { text } = await extractText(pdf, { mergePages: true })
  return text.trim()
}
```

- [ ] **Step 6: Run it, expect pass**

Run (from `apps/web`): `node --test --experimental-strip-types app/api/mobile/notes/_ingest/extractPdfText.test.ts`
Expected: PASS (2 tests). (A `Warning: Indexing all PDF objects` line on stderr is normal.)

- [ ] **Step 7: Typecheck**

Run (from `apps/web`): `npx tsc --noEmit`
Expected: exit 0. If unpdf lacks bundled types and tsc errors on the import, add `apps/web/app/api/mobile/notes/_ingest/unpdf.d.ts` with:
```ts
declare module 'unpdf'
```
and re-run — exit 0.

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/app/api/mobile/notes/_ingest/extractPdfText.ts apps/web/app/api/mobile/notes/_ingest/extractPdfText.test.ts apps/web/app/api/mobile/notes/_ingest/__fixtures__ apps/web/app/api/mobile/notes/_ingest/unpdf.d.ts 2>/dev/null
git commit -m "feat(nuru): pure-JS PDF text extraction (unpdf)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Wire PDF/image branch + accept-list + error messages into the route

**Files:**
- Modify: `apps/web/app/api/mobile/notes/route.ts`

**Interfaces:**
- Consumes: `extractPdfText` (Task 1); `extractText` (existing, `./_ingest/extract`).

- [ ] **Step 1: Import extractPdfText**

In `route.ts`, add next to the existing `extractText` import:
```ts
import { extractPdfText } from './_ingest/extractPdfText'
```

- [ ] **Step 2: Narrow the accept list**

Find:
```ts
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const FILE_TYPES = [...IMAGE_TYPES, 'application/pdf']
```
Replace with:
```ts
// Azure OCR reads raster images only; HEIC/HEIF are converted to JPEG on-device
// before upload, so they never need to be accepted here.
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const FILE_TYPES = [...IMAGE_TYPES, 'application/pdf']
```

- [ ] **Step 3: Branch extraction pdf vs image with distinct messages**

Find the existing block:
```ts
        // Extract text (OCR / PDF read).
        try {
            content = await extractText(bytes, file.type)
        } catch {
            return NextResponse.json({ error: 'Could not read the file' }, { status: 422 })
        }
        if (!content) {
            return NextResponse.json({ error: 'No text found in file' }, { status: 422 })
        }
```
Replace with:
```ts
        // Extract text. PDFs are read with pure JS (text layer); images go through
        // Azure OCR. Distinct messages so the user knows what to do next.
        try {
            if (file.type === 'application/pdf') {
                content = await extractPdfText(bytes)
                if (!content) {
                    return NextResponse.json(
                        { error: 'This looks like a scanned PDF — import it as a photo instead.' },
                        { status: 422 },
                    )
                }
            } else {
                content = await extractText(bytes, file.type)
                if (!content) {
                    return NextResponse.json(
                        { error: 'No text found in this image — try a clearer photo.' },
                        { status: 422 },
                    )
                }
            }
        } catch {
            return NextResponse.json({ error: 'Could not read the file.' }, { status: 422 })
        }
```

- [ ] **Step 4: Typecheck**

Run (from `apps/web`): `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Live smoke — unsupported type is rejected up front**

Start web if not running: `npx turbo run dev --filter=@mcloud/web -- --port 3000`. Unauth still 401 (auth precedes type checks), so this only confirms the route compiles/serves:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/mobile/notes
```
Expected: `401`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/mobile/notes/route.ts
git commit -m "feat(nuru): read text PDFs; drop heic/heif; actionable extraction errors

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Shared on-device upload helper (HEIC→JPEG)

**Files:**
- Create: `apps/nuru/services/upload.ts`
- Modify: `apps/nuru/components/AddNoteSheet.tsx`
- Modify: `apps/nuru/package.json` (add `expo-image-manipulator`)

**Interfaces:**
- Produces: `toUploadable(asset: PickedAsset): Promise<UploadFile>` where
  `PickedAsset = { uri: string; name?: string | null; mimeType?: string | null }`,
  `UploadFile = { uri: string; name: string; type: string }`.

- [ ] **Step 1: Install expo-image-manipulator**

Run (from `apps/nuru`): `npx expo install expo-image-manipulator`
Expected: `expo-image-manipulator` (~57.0.2) in `apps/nuru/package.json`.

- [ ] **Step 2: Write the helper**

```ts
// apps/nuru/services/upload.ts
// Normalizes a picked asset for upload. iPhone photos are HEIC/HEIF by default,
// which the server's OCR cannot read — convert those to JPEG on-device so the
// server only ever sees formats it can extract. Non-HEIC assets (incl. PDFs) pass
// through untouched.
import * as ImageManipulator from 'expo-image-manipulator';

export type PickedAsset = { uri: string; name?: string | null; mimeType?: string | null };
export type UploadFile = { uri: string; name: string; type: string };

function isHeic(a: PickedAsset): boolean {
  return /heic|heif/i.test(a.mimeType ?? '') || /\.hei[cf]$/i.test(a.name ?? '');
}

function renameToJpg(name: string): string {
  return name.replace(/\.[^.]+$/, '') + '.jpg';
}

export async function toUploadable(asset: PickedAsset): Promise<UploadFile> {
  const name = asset.name ?? `upload-${Date.now()}`;
  if (!isHeic(asset)) {
    return { uri: asset.uri, name, type: asset.mimeType ?? 'application/octet-stream' };
  }
  const out = await ImageManipulator.manipulateAsync(asset.uri, [], {
    format: ImageManipulator.SaveFormat.JPEG,
    compress: 0.85,
  });
  return { uri: out.uri, name: renameToJpg(name), type: 'image/jpeg' };
}
```

- [ ] **Step 3: Use it in AddNoteSheet**

In `apps/nuru/components/AddNoteSheet.tsx`, add the import:
```ts
import { toUploadable } from '@/services/upload';
```
Replace the body of `pickFile` after the cancel guard:
```ts
    const asset = result.assets[0];
    await upload('file', {
      uri: asset.uri,
      name: asset.name ?? 'document',
      type: asset.mimeType ?? 'application/octet-stream',
    });
```
with:
```ts
    const asset = result.assets[0];
    await upload('file', await toUploadable({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType }));
```
Replace the tail of `pickPhoto`:
```ts
    const asset = result.assets[0];
    const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
    await upload('photo', { uri: asset.uri, name, type: asset.mimeType ?? 'image/jpeg' });
```
with:
```ts
    const asset = result.assets[0];
    await upload('photo', await toUploadable({ uri: asset.uri, name: asset.fileName, mimeType: asset.mimeType }));
```

- [ ] **Step 4: Typecheck**

Run (from `apps/nuru`): `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/nuru/services/upload.ts apps/nuru/components/AddNoteSheet.tsx apps/nuru/package.json apps/nuru/package-lock.json 2>/dev/null
git commit -m "feat(nuru): convert HEIC/HEIF photos to JPEG on-device before upload

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: AttachMenu dropdown

**Files:**
- Create: `apps/nuru/components/AttachMenu.tsx`

**Interfaces:**
- Produces: `AttachMenu({ visible, onClose, onPickFiles }: { visible: boolean; onClose: () => void; onPickFiles: () => void })` — a small popover; a transparent backdrop dismisses it; the Camera row is disabled.

- [ ] **Step 1: Write the component**

```tsx
// apps/nuru/components/AttachMenu.tsx
// Small anchored dropdown for the chat composer's "+". Files is active; Camera is
// greyed ("coming soon"), mirroring the existing disabled-row pattern. A
// transparent full-screen backdrop dismisses on outside tap (not a full Modal).
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { theme } from '@/theme';

type Props = { visible: boolean; onClose: () => void; onPickFiles: () => void };

export function AttachMenu({ visible, onClose, onPickFiles }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.card}>
          <Pressable
            style={styles.row}
            onPress={() => { onClose(); onPickFiles(); }}
            accessibilityLabel="Attach a file"
          >
            <Text style={styles.rowText}>📄  Files</Text>
          </Pressable>
          <View style={styles.divider} />
          <View style={[styles.row, styles.rowDisabled]} accessibilityLabel="Camera coming soon">
            <Text style={[styles.rowText, styles.rowTextDisabled]}>📷  Camera — coming soon</Text>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: theme.spacing.lg,
    marginBottom: 96, // sit above the composer
    overflow: 'hidden',
  },
  row: { padding: theme.spacing.md },
  rowDisabled: { opacity: 0.4 },
  rowText: { fontSize: 16, color: theme.colors.text },
  rowTextDisabled: { color: theme.colors.textMuted },
  divider: { height: 1, backgroundColor: theme.colors.border },
});
```

- [ ] **Step 2: Typecheck**

Run (from `apps/nuru`): `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/nuru/components/AttachMenu.tsx
git commit -m "feat(nuru): AttachMenu dropdown (Files active, Camera coming soon)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Make the chat "+" open the menu (ChatInputBar)

**Files:**
- Modify: `apps/nuru/components/ChatInputBar.tsx`

**Interfaces:**
- Produces: `ChatInputBar` gains props `onAttach?: () => void` and `attaching?: boolean`. The "+" becomes a `Pressable` calling `onAttach`, disabled + spinner while `attaching`.

- [ ] **Step 1: Add props + make "+" pressable**

In `ChatInputBar.tsx`, extend the prop list:
```tsx
export function ChatInputBar({
  onSend,
  disabled,
  scopeLabel,
  onAttach,
  attaching,
}: {
  onSend: (t: string) => void;
  disabled?: boolean;
  scopeLabel?: string;
  onAttach?: () => void;
  attaching?: boolean;
}) {
```
Add `ActivityIndicator` to the react-native import line:
```tsx
import { View, TextInput, Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
```
Replace the placeholder attach `View`:
```tsx
        <View style={styles.attach} accessibilityLabel="Attach (coming soon)">
          <Text style={styles.attachGlyph}>＋</Text>
        </View>
```
with:
```tsx
        <Pressable
          style={styles.attach}
          onPress={onAttach}
          disabled={!onAttach || attaching}
          accessibilityLabel="Attach a file"
        >
          {attaching ? (
            <ActivityIndicator size="small" color={theme.colors.textMuted} />
          ) : (
            <Text style={styles.attachGlyph}>＋</Text>
          )}
        </Pressable>
```

- [ ] **Step 2: Typecheck**

Run (from `apps/nuru`): `npx tsc --noEmit`
Expected: exit 0 (props are optional; the existing call site in index.tsx still compiles).

- [ ] **Step 3: Commit**

```bash
git add apps/nuru/components/ChatInputBar.tsx
git commit -m "feat(nuru): chat composer + becomes a real attach button

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Attach flow in the chat screen (pick → create note → scope)

**Files:**
- Modify: `apps/nuru/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `AttachMenu` (Task 4); `toUploadable` (Task 3); `ChatInputBar` `onAttach`/`attaching` (Task 5); `notes.create` (existing); scope state `contextNoteIds`/`contextLabel` (existing).

- [ ] **Step 1: Add imports + state + handler**

In `apps/nuru/app/(tabs)/index.tsx`, add imports:
```tsx
import * as DocumentPicker from 'expo-document-picker';
import { AttachMenu } from '@/components/AttachMenu';
import { toUploadable } from '@/services/upload';
```
Add state near the other `useState` hooks (note `notes: notesService` is already destructured from `useApi()`):
```tsx
  const [attachOpen, setAttachOpen] = useState(false);
  const [attaching, setAttaching] = useState(false);
```
Add the handler alongside `onSend`:
```tsx
  async function onPickFiles() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    setAttaching(true);
    setLoadError(false);
    try {
      const file = await toUploadable({ uri: a.uri, name: a.name, mimeType: a.mimeType });
      const note = await notesService.create({ title: a.name ?? 'Attachment', subject: '', source: 'file', file });
      // Scope the chat to the new note so the next question is asked against it.
      setContextNoteIds([note.id]);
      setContextLabel(note.title);
    } catch (e) {
      setContextLabel((e as Error).message);
    } finally {
      setAttaching(false);
    }
  }
```

- [ ] **Step 2: Wire the menu + bar props into the render**

Replace the existing composer line:
```tsx
      <ChatInputBar onSend={onSend} disabled={sending} scopeLabel={contextLabel ?? undefined} />
```
with:
```tsx
      <ChatInputBar
        onSend={onSend}
        disabled={sending}
        scopeLabel={contextLabel ?? undefined}
        onAttach={() => setAttachOpen(true)}
        attaching={attaching}
      />
      <AttachMenu
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        onPickFiles={onPickFiles}
      />
```

- [ ] **Step 3: Typecheck**

Run (from `apps/nuru`): `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Bundle guard (SDK import check)**

Run (from `apps/nuru`): `npx expo export --output-dir dist-verify --platform android 2>&1 | tail -3 && rm -rf dist-verify`
Expected: `Exported`, exit 0 (confirms `expo-image-manipulator` bundles).

- [ ] **Step 5: Commit**

```bash
git add "apps/nuru/app/(tabs)/index.tsx"
git commit -m "feat(nuru): chat + attaches a file, creates a note, scopes chat to it

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: End-to-end device verification (controller/human-run)

**Files:** none.

- [ ] **Step 1: On-device E2E**

`cd apps/nuru && npm start`, sign in, then verify:
- **Text PDF** (from the "+" or Add-note) → note is created with real text; a question about it is answered from it.
- **iPhone HEIC photo** → converts silently; note has OCR'd text (no "Could not read the file").
- **Scanned PDF** (a photographed page saved as PDF) → the message "This looks like a scanned PDF — import it as a photo instead."
- **Chat "+"** → dropdown shows **Files** (active) + **Camera — coming soon** (greyed). Pick a PDF → "+" spins → a note is created → the scope chip flips from "All notes" to the file's title → a follow-up question is answered against it.
- **Cancel** the picker → no-op, no error.

---

## Self-Review

**Spec coverage:**
- PDF text extraction (pure JS) → Task 1 ✓
- Route branch pdf/image + accept-list + 3 error messages → Task 2 ✓
- HEIC→JPEG on device (shared helper) → Task 3 ✓
- AttachMenu dropdown (Files/Camera greyed) → Task 4 ✓
- Chat "+" becomes real attach → Task 5 ✓
- Attach → create note → scope chat → Task 6 ✓
- Actionable errors surfaced (client already forwards `error`) → Tasks 2 + 6 (create() rethrows) ✓
- Device E2E → Task 7 ✓
- Deferred (scanned-PDF OCR, server HEIC decode, camera, ephemeral attach, recents strip) → not built ✓

**Placeholder scan:** none — every code step has full content; commands have expected output.

**Type consistency:** `extractPdfText(ArrayBuffer): Promise<string>` defined Task 1, consumed Task 2. `toUploadable(PickedAsset): Promise<UploadFile>` defined Task 3, consumed Tasks 3 (AddNoteSheet) + 6 (chat). `AttachMenu` prop names (`visible`/`onClose`/`onPickFiles`) consistent Task 4 def ↔ Task 6 use. `ChatInputBar` new props (`onAttach`/`attaching`) consistent Task 5 def ↔ Task 6 use. `notesService.create({title,subject,source:'file',file})` matches the existing `CreateNoteInput` shape. Scope setters `setContextNoteIds`/`setContextLabel` are the existing state hooks in index.tsx.

**Note on tests:** only `extractPdfText` carries pure logic worth unit-testing (Task 1, real-fixture based). The route branch, client helper, dropdown, and attach wiring are verified by typecheck + `expo export` + device E2E — consistent with this repo's pure-function-test idiom.
