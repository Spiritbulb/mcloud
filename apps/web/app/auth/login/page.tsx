import { redirect } from "next/navigation";

export default function MCloudLoginRedirect({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const to = searchParams.next ?? "/admin/settings";
  redirect(
    `https://spiritb.uk/go/mcloud?to=${encodeURIComponent(to)}`
  );
}