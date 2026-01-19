import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Book, Code, Zap, Shield } from "lucide-react"

export default function DocsPage() {
    const categories = [
        {
            title: "Getting Started",
            description: "Learn the basics of using the platform",
            icon: Book,
            articles: 12,
        },
        {
            title: "API Reference",
            description: "Complete API documentation",
            icon: Code,
            articles: 45,
        },
        {
            title: "Best Practices",
            description: "Tips for optimal performance",
            icon: Zap,
            articles: 8,
        },
        {
            title: "Security",
            description: "Keep your apps secure",
            icon: Shield,
            articles: 6,
        },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Documentation"
                description="Browse our comprehensive guides and resources"
            />

            <div className="grid gap-6 md:grid-cols-2">
                {categories.map((category) => {
                    const Icon = category.icon
                    return (
                        <Card key={category.title} className="google-card border-outline bg-surface hover:shadow-lg transition-all duration-200 cursor-pointer">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                        <Icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-on-surface mb-1">
                                            {category.title}
                                        </h3>
                                        <p className="text-sm text-on-surface-variant mb-2">
                                            {category.description}
                                        </p>
                                        <p className="text-xs text-primary font-medium">
                                            {category.articles} articles
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
