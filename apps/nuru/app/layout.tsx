import type { Metadata } from 'next'
import './globals.css'
import { AiBar } from '@/components/ai-bar'
import { SiteHeader } from '@/components/site-header'

export const metadata: Metadata = {
  title: 'Nuru',
  description: 'Read Kenyan news and documents, and ask questions with the page in view.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
        <AiBar />
      </body>
    </html>
  )
}
