import { HeaderWrapper } from '@/components/header-wrapper'
import { Footer } from '@/components/footer'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <HeaderWrapper />
            {children}
            <Footer />
        </>
    )
}
