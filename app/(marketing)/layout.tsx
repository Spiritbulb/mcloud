import { HeaderWrapper } from '@/components/header-wrapper'
import { Footer } from '@/components/footer'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-[#0a0a0a]">
            <HeaderWrapper />
            {children}
            <Footer />
        </div>
    )
}
