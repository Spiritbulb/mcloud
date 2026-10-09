import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-background">
            <Header />
            {children}
            <Footer />
        </div>
    )
}
