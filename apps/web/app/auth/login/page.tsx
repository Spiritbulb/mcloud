import { redirect } from "next/navigation";

export default async function MCloudLoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  
  const to = (await searchParams).next ?? '/org';
  if (process.env.NODE_ENV !== 'production') {
    redirect (`/dev-login?to=${encodeURIComponent(to)}`);
  }
  redirect(
    `https://spiritb.uk/go/mcloud?to=${encodeURIComponent(to)}`
  );
}