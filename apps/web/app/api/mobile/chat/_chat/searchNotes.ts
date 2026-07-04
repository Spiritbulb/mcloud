// The retrieval step, lifted from route.ts so the tool-calling loop can invoke it
// on demand (only when the model calls search_notes). Embeds the query, runs the
// "my notes OR approved" RPC, returns the chunks + the note ids actually hit.
//
// The client type is inferred from @mcloud/db/server's createClient (a typed
// SupabaseClient<Database>) rather than a bare @supabase/supabase-js import, so
// the typed .rpc('match_nuru_chunks', ...) signature is preserved.
import type { createClient } from '@mcloud/db/server'
import { embed } from '../../notes/_ingest/embed'

type DbClient = Awaited<ReturnType<typeof createClient>>

export async function searchNotes(
  supabase: DbClient,
  userId: string,
  query: string,
): Promise<{ chunks: { content: string }[]; noteIds: string[] }> {
  const [queryVec] = await embed([query])
  const { data, error } = await supabase.rpc('match_nuru_chunks', {
    p_user_id: userId,
    p_query_embedding: JSON.stringify(queryVec),
    p_match_count: 8,
  })
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as { note_id: string; content: string }[]
  const noteIds = [...new Set(rows.map((r) => r.note_id))]
  return { chunks: rows.map((r) => ({ content: r.content })), noteIds }
}
