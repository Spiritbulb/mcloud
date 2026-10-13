import { redirect } from "next/navigation";
import { sanitizeRelativePath } from "@mcloud/auth/routes";

export default async function MCloudSignUpRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const to = sanitizeRelativePath(params.returnTo ?? params.next, "/org/onboarding");
  redirect(
    `https://spiritb.uk/go/mcloud?to=${encodeURIComponent(to)}`
  );
}