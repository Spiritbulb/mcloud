
import { SignUpForm } from '@/components/sign-up-form'
import { Suspense } from 'react'

export default async function Page({
  searchParams, // should be awaited
}: {
  searchParams: { slug?: string }
}) {
  const slug = await searchParams.slug
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<div>Loading...</div>}>
          <SignUpForm slug={slug} />
        </Suspense>
      </div>
    </div>
  )
}
