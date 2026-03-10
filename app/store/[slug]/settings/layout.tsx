import { createClient } from '@/lib/server'
import { notFound } from 'next/navigation'
import SettingsShell from './settings-shell'

export default async function SettingsLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params

    return <SettingsShell slug={slug}>{children}</SettingsShell>
}