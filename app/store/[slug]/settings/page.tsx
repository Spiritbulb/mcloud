// app/store/[slug]/settings/page.tsx
// Settings home — redirects are NOT used here, this is its own landing page.
// Data is fetched client-side in SettingsHomeClient so the shell's existing
// store fetch and the home page stats fetch stay independent.

import type { Metadata } from 'next'
import SettingsHomeClient from './settings-home-client'

export const metadata: Metadata = {
    title: 'Settings — Overview',
}

export default async function SettingsHomePage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    return <SettingsHomeClient slug={slug} />
}