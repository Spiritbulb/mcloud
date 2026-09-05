// apps/web/app/api/org/[orgSlug]/servers/[uuid]/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { getOrgRole, listOrgServerUuids, removeServerRecord, syncServerCache } from '@/lib/servers-db'
import {
  getServerDetail,
  startServer,
  stopServer,
  restartServer,
  renameServer,
  deleteServer,
} from '@/lib/upcloud'

async function resolveOrgAndAuthorize(orgSlug: string, userId: string, requireManage: boolean) {
  const supabase = await createClient()
  const { data: org } = await supabase.from('orgs').select('id').eq('slug', orgSlug).single()
  if (!org) return { error: NextResponse.json({ error: 'Org not found' }, { status: 404 }) }

  const role = await getOrgRole(org.id, userId)
  if (!role) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  if (requireManage && role !== 'owner' && role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { org }
}

async function assertOwnsServer(orgId: string, uuid: string) {
  const uuids = await listOrgServerUuids(orgId)
  return uuids.includes(uuid)
}

// GET — server detail (IP addresses etc.), for the drawer
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; uuid: string }> },
) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgSlug, uuid } = await params
  const { org, error } = await resolveOrgAndAuthorize(orgSlug, session.user.id, false)
  if (error) return error

  if (!(await assertOwnsServer(org!.id, uuid))) {
    return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  }

  try {
    const server = await getServerDetail(uuid)
    return NextResponse.json({ server })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load server' },
      { status: 502 },
    )
  }
}

// POST — actions: { action: 'start' | 'stop' | 'restart', hard?: boolean }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; uuid: string }> },
) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgSlug, uuid } = await params
  const { org, error } = await resolveOrgAndAuthorize(orgSlug, session.user.id, true)
  if (error) return error

  if (!(await assertOwnsServer(org!.id, uuid))) {
    return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  }

  let body: { action?: unknown; hard?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const action = typeof body.action === 'string' ? body.action : ''
  const hard = body.hard === true

  try {
    let server
    if (action === 'start') server = await startServer(uuid)
    else if (action === 'stop') server = await stopServer(uuid, hard)
    else if (action === 'restart') server = await restartServer(uuid, hard)
    else return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

    await syncServerCache([server])
    return NextResponse.json({ server })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Action failed' },
      { status: 502 },
    )
  }
}

// PATCH — rename: { title: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; uuid: string }> },
) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgSlug, uuid } = await params
  const { org, error } = await resolveOrgAndAuthorize(orgSlug, session.user.id, true)
  if (error) return error

  if (!(await assertOwnsServer(org!.id, uuid))) {
    return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  }

  let body: { title?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  try {
    const server = await renameServer(uuid, title)
    await syncServerCache([server])
    return NextResponse.json({ server })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Rename failed' },
      { status: 502 },
    )
  }
}

// DELETE — deprovision. Server must be stopped first (UpCloud requirement).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; uuid: string }> },
) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgSlug, uuid } = await params
  const { org, error } = await resolveOrgAndAuthorize(orgSlug, session.user.id, true)
  if (error) return error

  if (!(await assertOwnsServer(org!.id, uuid))) {
    return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  }

  try {
    await deleteServer(uuid)
    await removeServerRecord(uuid)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Delete failed. The server may need to be stopped first.' },
      { status: 502 },
    )
  }
}