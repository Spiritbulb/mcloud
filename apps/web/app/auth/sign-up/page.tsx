import { redirect } from "next/navigation";

export default async function MCloudSignUpRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const to = (await searchParams).next ?? "/org/onboarding";
  redirect(
    `https://spiritb.uk/go/mcloud?to=${encodeURIComponent(to)}`
  );
}