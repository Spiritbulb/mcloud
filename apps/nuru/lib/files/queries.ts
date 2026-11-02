import 'server-only'
import { db } from '@/lib/db'
import type { StudyOutput } from '@/lib/ai/schema'

export type FileStatus = 'uploaded' | 'processing' | 'ready' | 'failed'

export type FileRow = {
  id: string
  filename: string
  bytes: number
  pages: number | null
  status: FileStatus
  error: string | null
  createdAt: string
  claimedAt: string | null
  b2Key: string
}

type Raw = {
  id: string
  filename: string
  bytes: number
  pages: number | null
  status: FileStatus
  error: string | null
  created_at: string | Date
  claimed_at: string | Date | null
  b2_key: string
}

function toRow(r: Raw): FileRow {
  return {
    id: r.id,
    filename: r.filename,
    bytes: r.bytes,
    pages: r.pages,
    status: r.status,
    error: r.error,
    createdAt: new Date(r.created_at).toISOString(),
    claimedAt: r.claimed_at ? new Date(r.claimed_at).toISOString() : null,
    b2Key: r.b2_key,
  }
}

// Every query here is scoped by owner_id. A file id alone never grants access (files-scope.test.ts).

export async function createFile(ownerId: string, f: { id: string; b2Key: string; filename: string; bytes: number }): Promise<void> {
  await db()`
    insert into files (id, owner_id, b2_key, filename, mime, bytes, status)
    values (${f.id}, ${ownerId}, ${f.b2Key}, ${f.filename}, 'application/pdf', ${f.bytes}, 'uploaded')`
}

export async function getFile(ownerId: string, id: string): Promise<FileRow | null> {
  const rows = (await db()`
    select id, filename, bytes, pages, status, error, created_at, claimed_at, b2_key
    from files where id = ${id} and owner_id = ${ownerId}`) as Raw[]
  return rows[0] ? toRow(rows[0]) : null
}

export async function listFiles(ownerId: string): Promise<FileRow[]> {
  const rows = (await db()`
    select id, filename, bytes, pages, status, error, created_at, claimed_at, b2_key
    from files where owner_id = ${ownerId} order by created_at desc`) as Raw[]
  return rows.map(toRow)
}

export async function setStatus(
  ownerId: string,
  id: string,
  status: FileStatus,
  extra?: { pages?: number; error?: string | null },
): Promise<void> {
  await db()`
    update files set status = ${status},
      pages = coalesce(${extra?.pages ?? null}, pages),
      error = ${extra?.error ?? null}
    where id = ${id} and owner_id = ${ownerId}`
}

export async function deleteFile(ownerId: string, id: string): Promise<void> {
  await db()`delete from files where id = ${id} and owner_id = ${ownerId}`
}

/**
 * Atomically moves a file from `from` to `processing`. Returns false when another request got there
 * first (or the file is not in `from`), so only one caller extracts or generates.
 */
export async function claimForProcessing(ownerId: string, id: string, from: FileStatus): Promise<boolean> {
  const rows = (await db()`
    update files set status = 'processing', error = null, claimed_at = now()
    where id = ${id} and owner_id = ${ownerId} and status = ${from}
    returning id`) as { id: string }[]
  return rows.length > 0
}

/**
 * Claims a file for "Try again": a `failed`/`generation_failed` row, or a `processing` row whose claim
 * is stale (its function died; see STALE_PROCESSING_MS). Returns false when the file is in neither state
 * or another request claimed it first.
 */
export async function claimForRetry(ownerId: string, id: string): Promise<boolean> {
  const rows = (await db()`
    update files set status = 'processing', error = null, claimed_at = now()
    where id = ${id} and owner_id = ${ownerId}
      and ((status = 'failed' and error = 'generation_failed')
        or (status = 'processing' and (claimed_at is null or claimed_at < now() - interval '10 minutes')))
    returning id`) as { id: string }[]
  return rows.length > 0
}

// file_pages and file_outputs have no owner_id: every query checks the parent files row instead.

export async function savePages(ownerId: string, fileId: string, pages: string[]): Promise<void> {
  await db()`
    insert into file_pages (file_id, page_no, text)
    select ${fileId}::uuid, u.ord::int, u.t
    from unnest(${pages}::text[]) with ordinality as u(t, ord)
    where exists (select 1 from files where id = ${fileId} and owner_id = ${ownerId})
    on conflict (file_id, page_no) do update set text = excluded.text`
}

export async function getPages(ownerId: string, fileId: string): Promise<string[]> {
  const rows = (await db()`
    select p.text from file_pages p
    join files f on f.id = p.file_id
    where p.file_id = ${fileId} and f.owner_id = ${ownerId}
    order by p.page_no`) as { text: string }[]
  return rows.map((r) => r.text)
}

export async function saveOutputs(ownerId: string, fileId: string, o: StudyOutput, model: string): Promise<void> {
  const sql = db()
  await sql.transaction([
    sql`
      delete from file_outputs
      where file_id = ${fileId} and exists (select 1 from files where id = ${fileId} and owner_id = ${ownerId})`,
    sql`
      insert into file_outputs (file_id, kind, content, model)
      select ${fileId}::uuid, v.kind, v.content::jsonb, ${model}
      from (values ('notes', ${JSON.stringify(o.notes)}), ('questions', ${JSON.stringify(o.questions)})) as v(kind, content)
      where exists (select 1 from files where id = ${fileId} and owner_id = ${ownerId})`,
  ])
}

export async function getOutputs(
  ownerId: string,
  fileId: string,
): Promise<{ notes: StudyOutput['notes'] | null; questions: StudyOutput['questions'] | null }> {
  const rows = (await db()`
    select o.kind, o.content from file_outputs o
    join files f on f.id = o.file_id
    where o.file_id = ${fileId} and f.owner_id = ${ownerId}
    order by o.created_at desc`) as { kind: 'notes' | 'questions'; content: unknown }[]
  const notes = rows.find((r) => r.kind === 'notes')
  const questions = rows.find((r) => r.kind === 'questions')
  return {
    notes: notes ? (notes.content as StudyOutput['notes']) : null,
    questions: questions ? (questions.content as StudyOutput['questions']) : null,
  }
}

export async function getPage(ownerId: string, fileId: string, pageNo: number): Promise<string | null> {
  const rows = (await db()`
    select p.text from file_pages p
    join files f on f.id = p.file_id
    where p.file_id = ${fileId} and p.page_no = ${pageNo} and f.owner_id = ${ownerId}`) as { text: string }[]
  return rows[0]?.text ?? null
}

// asks has its own owner_id, so the daily limit counts one user's questions across all their files.

/**
 * Reserves one ask against the rolling 24 h limit before the model is called. The advisory lock
 * serialises a user's concurrent asks, so the count and insert cannot race. Returns false at the limit.
 * A reserved row stays even if the model call later fails or is refused.
 */
export async function reserveAsk(ownerId: string, fileId: string, pageNo: number, limit: number): Promise<boolean> {
  const sql = db()
  const [, inserted] = (await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtext(${ownerId}))`,
    sql`
      insert into asks (owner_id, file_id, page_no)
      select ${ownerId}, ${fileId}::uuid, ${pageNo}
      where exists (select 1 from files where id = ${fileId} and owner_id = ${ownerId})
        and (select count(*) from asks where owner_id = ${ownerId} and created_at > now() - interval '24 hours') < ${limit}
      returning id`,
  ])) as [unknown, { id: number }[]]
  return inserted.length > 0
}
