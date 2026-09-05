'use server'
import DevLoginPage from "./client";

export default async function MCloudDevLogin({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const to = (await searchParams).to ?? '/org';
  
  return(
    <DevLoginPage to={to} />
  )
}