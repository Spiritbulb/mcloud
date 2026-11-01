import { redirect } from "next/navigation";
import { sanitizeRelativePath } from "@mcloud/auth/routes";

export default async function MCloudSignUpRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  // /org, not /org/onboarding: people with an account use "Get started" too, and /org
  // only sends someone to onboarding when they have no org yet.
  const to = sanitizeRelativePath(params.returnTo ?? params.next, "/org");
  redirect(
    `https://spiritb.uk/go/mcloud?to=${encodeURIComponent(to)}`
  );
}