import type { Metadata } from "next"
import DocsClient from "@/components/docs-client"

export const metadata: Metadata = {
    title: "Docs — Menengai Cloud",
    description: "Learn how to configure and manage your Menengai Cloud store. Step-by-step guides for every settings section.",
}

export default async function DocsPage({ searchParams }: { searchParams: { page?: string } }) {
    const { page } = await searchParams
    return <DocsClient page={page} />
}
