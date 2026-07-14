// GET  → the user's chat sessions (only those with ≥1 message), newest first.
// POST → create an empty session, return its id ("New chat").
// Auth: mobile bearer; every query scoped to auth.user.id.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { requireMobileUser } from '../../_lib'
import { toSessionDTO, type SessionRow } from '../_sessions'

export async function GET(req: NextRequest) {
  const auth = await requireMobileUser(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.user.id

  const supabase = await createClient()
  // Only sessions that have at least one message (excludes abandoned "New chat").
  const { data, error } = await supabase
    .from('nuru_chat_sessions')
    .select('id, title, updated_at, nuru_chat_messages!inner(id)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) {
    console.error('[nuru sessions list]', error.message)
    return NextResponse.json({ error: 'Could not load sessions' }, { status: 500 })
  }
  // The !inner join yields duplicate session rows (one per message); dedupe by id.
  const seen = new Set<string>()
  const sessions = (data as unknown as SessionRow[])
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .map(toSessionDTO)
  return NextResponse.json({ sessions })
}

export async function POST(req: NextRequest) {
  const auth = await requireMobileUser(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.user.id

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('nuru_chat_sessions')
    .insert({ user_id: userId, title: '' })
    .select('id')
    .single()
  if (error || !data) {
    console.error('[nuru sessions create]', error?.message)
    return NextResponse.json({ error: 'Could not create session' }, { status: 500 })
  }
  return NextResponse.json({ id: data.id }, { status: 201 })
}
