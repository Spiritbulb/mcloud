import { redirect } from "next/navigation";

export default async function MCloudLoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const to = (await searchParams).next ?? "/org";
  redirect(
    `https://spiritb.uk/go/mcloud?to=${encodeURIComponent(to)}`
  );
}