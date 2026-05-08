// hooks/use-track-visit.ts
import { useEffect } from 'react'
import { createClient } from '@/lib/client'

export function useTrackVisit(storeId: string, userId: string) {
    useEffect(() => {
        const supabase = createClient()
        supabase
            .from('store_visits')
            .upsert(
                { user_id: userId, store_id: storeId, visited_at: new Date().toISOString() },
                { onConflict: 'user_id,store_id' }
            )
            .then()
    }, [storeId, userId])
}