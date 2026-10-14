import Link from "next/link";
import { redirect } from "next/navigation";
import { sanitizeRelativePath } from "@mcloud/auth/routes";

export default async function MCloudLoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; returnTo?: string; handoff?: string }>;
}) {
  const params = await searchParams;
  // `returnTo` is what the shared auth helpers send; `next` is the older spelling.
  const to = sanitizeRelativePath(params.returnTo ?? params.next, '/org');
  const retry = `https://spiritb.uk/go/mcloud?to=${encodeURIComponent(to)}`;

  // The handoff from spiritb just failed. Redirecting again would mint another ticket and
  // loop back here, so stop and let the person decide.
  if (params.handoff === 'failed') {
    return (
      <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">We couldn&apos;t sign you in</h1>
        <p className="text-sm text-white/70">
          Your sign-in link expired or was already used. Try again, and if it keeps happening,
          sign out of Spiritbulb and back in.
        </p>
        <Link href={retry} className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black">
          Try again
        </Link>
      </main>
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    redirect(`/dev-login?to=${encodeURIComponent(to)}`);
  }
  redirect(retry);
}
