import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { User, Shield, Settings, Users } from "lucide-react"
import Link from "next/link"

export default function AccountPage() {
    const sections = [
        {
            title: "Profile",
            description: "Manage your personal information",
            icon: User,
            href: "/admin/account/profile",
            color: "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400",
        },
        {
            title: "Security",
            description: "Password and authentication settings",
            icon: Shield,
            href: "/admin/account/security",
            color: "bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400",
        },
        {
            title: "Preferences",
            description: "Customize your experience",
            icon: Settings,
            href: "/admin/account/preferences",
            color: "bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400",
        },
        {
            title: "Team Members",
            description: "Manage team access",
            icon: Users,
            href: "/admin/account/team",
            color: "bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400",
        },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Account Settings"
                description="Manage your account and preferences"
            />

            <div className="grid gap-6 md:grid-cols-2">
                {sections.map((section) => {
                    const Icon = section.icon
                    return (
                        <Link key={section.title} href={section.href}>
                            <Card className="google-card border-outline bg-surface h-full hover:shadow-lg transition-all duration-200">
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${section.color}`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-on-surface mb-1">
                                                {section.title}
                                            </h3>
                                            <p className="text-sm text-on-surface-variant">
                                                {section.description}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
