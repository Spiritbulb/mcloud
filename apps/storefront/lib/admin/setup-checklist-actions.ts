'use server'
// The Overview setup checklist's two stored flags: the merchant hid it, or copied their store link.
// Everything else about the checklist is derived from store data (setup-checklist-logic.ts).
import { createClient } from '@mcloud/db/server'
import { mergeChecklistState } from '@/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/setup-checklist-logic'
import { requireManagedStore, type ActionResult } from './access'

export async function updateSetupChecklist(
    storeId: string,
    patch: { hidden?: boolean; link_shared?: boolean },
): Promise<ActionResult> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return { ok: false, error: gate.error }

    // Only `true` flags are accepted (mergeChecklistState drops anything else), so the browser can
    // set a flag but never write arbitrary JSON into settings.
    const supabase = await createClient()
    const { data: store, error: readError } = await supabase
        .from('stores')
        .select('settings')
        .eq('id', gate.storeId)
        .single()
    if (readError || !store) return { ok: false, error: 'Could not load the store.' }

    const { error } = await supabase
        .from('stores')
        .update({ settings: mergeChecklistState(store.settings, patch) as never })
        .eq('id', gate.storeId)
    if (error) return { ok: false, error: 'Could not save.' }
    return { ok: true }
}
