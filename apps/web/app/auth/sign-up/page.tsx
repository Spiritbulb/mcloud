import { redirect } from "next/navigation";

export default function MCloudSignUpRedirect({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const to = searchParams.next ?? "/onboarding";
  redirect(
    `https://spiritb.uk/go/mcloud?to=${encodeURIComponent(to)}`
  );
}