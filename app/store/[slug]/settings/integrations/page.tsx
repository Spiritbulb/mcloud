'use client'
import { redirect, usePathname } from 'next/navigation'

export default function IntegrationsPage() {
    const pathname = usePathname()
    redirect(`${pathname}/social`)
}
