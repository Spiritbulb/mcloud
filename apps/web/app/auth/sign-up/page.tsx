import { redirect } from 'next/navigation'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>
}) {
  const slug = (await searchParams).slug
  const state = slug
    ? btoa(JSON.stringify({ storeName: slug, slug }))
    : undefined

  const url = state
    ? `/auth/login?screen_hint=signup&state=${state}`
    : `/auth/login?screen_hint=signup`

  redirect(url)
}