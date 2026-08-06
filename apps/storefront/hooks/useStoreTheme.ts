import { useEffect, useState } from 'react'

export function useStoreTheme(storeSlug: string | undefined) {
    const [themeId, setThemeId] = useState('classic')

    useEffect(() => {
        if (!storeSlug) return
        fetch(`/api/store/${storeSlug}/info`)
            .then((res) => res.json())
            .then((data) => { if (data?.themeId) setThemeId(data.themeId) })
            .catch((err) => console.error('Failed to load store info', err))
    }, [storeSlug])

    return { themeId }
}