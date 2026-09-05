'use server'
import { NextRequest } from "next/server";
import DevLoginPage from "./client";
import { redirectToOrgPath } from "../(merchant)/org/_lib/redirect";

export default async function MCloudDevLogin({
  searchParams,
  request
}: {
  searchParams: Promise<{ to?: string }>;
  request: NextRequest;
}) {
  const to = (await searchParams).to ?? '/org';
  
  return(
    <DevLoginPage to={to} />
  )
}