import 'server-only'
import { db } from '@/lib/db'

export type FileStatus = 'uploaded' | 'processing' | 'ready' | 'failed'

export type FileRow = {
  id: string
  filename: string
  bytes: number
  pages: number | null
  status: FileStatus
  error: string | null
  createdAt: string
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
    select id, filename, bytes, pages, status, error, created_at, b2_key
    from files where id = ${id} and owner_id = ${ownerId}`) as Raw[]
  return rows[0] ? toRow(rows[0]) : null
}

export async function listFiles(ownerId: string): Promise<FileRow[]> {
  const rows = (await db()`
    select id, filename, bytes, pages, status, error, created_at, b2_key
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
