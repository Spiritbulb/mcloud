import { getPickerData } from '@/app/(merchant)/org/pick/actions'
import { OrgContextProvider } from './org-context'

export default async function OrgLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ orgSlug: string }>
}) {
    const { orgSlug } = await params
    const { stores } = await getPickerData().catch(() => ({ stores: [], orgs: [], userName: null }))

    return (
        <OrgContextProvider stores={stores} orgSlug={orgSlug}>
            {children}
        </OrgContextProvider>
    )
}
