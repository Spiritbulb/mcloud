import { redirect } from "next/navigation";
import { sanitizeRelativePath } from "@mcloud/auth/routes";

export default async function MCloudLoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; returnTo?: string }>;
}) {
  
  const params = await searchParams;
  // `returnTo` is what the shared auth helpers send; `next` is the older spelling.
  const to = sanitizeRelativePath(params.returnTo ?? params.next, '/org');
  if (process.env.NODE_ENV !== 'production') {
    redirect (`/dev-login?to=${encodeURIComponent(to)}`);
  }
  redirect(
    `https://spiritb.uk/go/mcloud?to=${encodeURIComponent(to)}`
  );
}