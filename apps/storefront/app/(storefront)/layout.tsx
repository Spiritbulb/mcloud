import type { Metadata } from 'next'
import './globals.css'
import StatusBanner from '@mcloud/ui/status-banner'

export const metadata: Metadata = {
    title: 'MCloud App',
    description: 'Powered by Menengai Cloud',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                {children}
            </body>
        </html>
    )
}
