import { HeaderWrapper } from '@/components/header-wrapper'
import { Footer } from '@/components/footer'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-background">
            <HeaderWrapper />
            {children}
            <Footer />
        </div>
    )
}
