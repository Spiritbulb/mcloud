import type { Metadata } from 'next'
import BetaClient from './beta-client'

export const metadata: Metadata = {
    title: 'Join the Beta | Menengai Cloud',
    description: 'Get early access to Menengai Cloud. Join the closed beta for merchants.',
}

export default function Page() {
    return <BetaClient />
}
