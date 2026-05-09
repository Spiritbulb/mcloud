// lib/pro-gate.ts
import { createClient } from '@/lib/server'

export async function isStorePro(storeId: string): Promise<boolean> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('stores')
        .select('is_pro, pro_expires_at')
        .eq('id', storeId)
        .single()

    if (!data?.is_pro) return false

    // Expired — auto-downgrade
    if (data.pro_expires_at && new Date(data.pro_expires_at) < new Date()) {
        await supabase.from('stores').update({ is_pro: false }).eq('id', storeId)
        return false
    }

    return true
}