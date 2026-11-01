import type { Metadata } from 'next'
import './globals.css'
import { AiBar } from '@/components/ai-bar'
import { SiteHeader } from '@/components/site-header'
import { currentUser } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Nuru',
  description: 'Read Kenyan news and documents, and ask questions with the page in view.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()
  return (
    <html lang="en">
      <body>
        <SiteHeader user={user} />
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
        <AiBar />
      </body>
    </html>
  )
}
