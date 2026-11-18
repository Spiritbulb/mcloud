'use client'

import { usePathname } from 'next/navigation'
import { PageSkeleton } from '@mcloud/ui/kit/page-skeleton'

// Shown inside the settings shell (sidebar and header already on screen) while a settings page
// loads. Drawn from the kit's own PageHeader/StatStrip/Panel shapes; only the Overview, which opens
// with headline numbers, gets the stat strip. Before the shell exists, ../../../loading.tsx shows
// the brand loader instead.
export default function Loading() {
    const isOverview = /^\/org\/[^/]+\/[^/]+\/settings\/?$/.test(usePathname() ?? '')
    return <PageSkeleton stats={isOverview ? 3 : 0} panels={2} />
}
