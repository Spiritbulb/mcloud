import CustomersPage from './client'

export default async function Page({ params }: { params: Promise<{ orgSlug: string; storeSlug: string }> }) {
    return (

        <CustomersPage slug={(await params).storeSlug} />

    )
}
