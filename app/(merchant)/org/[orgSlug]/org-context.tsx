'use client'

import { createContext, useContext } from 'react'
import type { PickerStore } from '@/app/(merchant)/org/actions'

type OrgContextValue = {
    stores: PickerStore[]
    orgSlug: string
}

const OrgContext = createContext<OrgContextValue | null>(null)

export function OrgContextProvider({
    children,
    stores,
    orgSlug,
}: {
    children: React.ReactNode
    stores: PickerStore[]
    orgSlug: string
}) {
    return (
        <OrgContext.Provider value={{ stores, orgSlug }}>
            {children}
        </OrgContext.Provider>
    )
}

export function useOrgContext() {
    const ctx = useContext(OrgContext)
    if (!ctx) throw new Error('useOrgContext must be used within OrgContextProvider')
    return ctx
}
