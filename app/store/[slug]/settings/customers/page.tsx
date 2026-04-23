import CustomersPage from './client'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    return (

        <CustomersPage slug={(await params).slug} />

    )
}
