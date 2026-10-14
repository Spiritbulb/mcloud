import { useEffect, useState } from 'react'

export interface StoreInfo {
    themeId: string
    /** Whether the store has delivery zones, so the cart does not claim shipping is free. */
    hasDeliveryZones: boolean
    contact: { email: string | null; whatsapp: string | null }
}

const DEFAULTS: StoreInfo = { themeId: 'classic', hasDeliveryZones: false, contact: { email: null, whatsapp: null } }

/** Public presentation info for the cart and checkout, from one request. */
export function useStoreInfo(storeSlug: string | undefined): StoreInfo {
    const [info, setInfo] = useState<StoreInfo>(DEFAULTS)

    useEffect(() => {
        if (!storeSlug) return
        fetch(`/api/store/${storeSlug}/info`)
            .then((res) => res.json())
            .then((data) => {
                if (!data || data.error) return
                setInfo({
                    themeId: typeof data.themeId === 'string' ? data.themeId : DEFAULTS.themeId,
                    hasDeliveryZones: !!data.hasDeliveryZones,
                    contact: {
                        email: data.contact?.email ?? null,
                        whatsapp: data.contact?.whatsapp ?? null,
                    },
                })
            })
            .catch((err) => console.error('Failed to load store info', err))
    }, [storeSlug])

    return info
}
