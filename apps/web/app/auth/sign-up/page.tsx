import { MagicCodeForm } from '@/components/login-form'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { returnTo } = await searchParams
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <MagicCodeForm mode="signup" returnTo={returnTo} />
      </div>
    </div>
  )
}
