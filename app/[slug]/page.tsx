import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Globe, DollarSign, Headphones, User } from "lucide-react"

export default function AdminPage() {
    const stats = [
        {
            title: "Total Apps",
            value: "12",
            subtitle: "+2 from last month",
            icon: Globe,
            color: "bg-blue-100 dark:bg-blue-950",
            iconColor: "text-blue-600 dark:text-blue-400",
        },
        {
            title: "Revenue",
            value: "KES 45,231",
            subtitle: "+12% from last month",
            icon: DollarSign,
            color: "bg-green-100 dark:bg-green-950",
            iconColor: "text-green-600 dark:text-green-400",
        },
        {
            title: "Support Tickets",
            value: "8",
            subtitle: "3 pending review",
            icon: Headphones,
            color: "bg-purple-100 dark:bg-purple-950",
            iconColor: "text-purple-600 dark:text-purple-400",
        },
        {
            title: "Active Users",
            value: "2,350",
            subtitle: "+18% from last month",
            icon: User,
            color: "bg-orange-100 dark:bg-orange-950",
            iconColor: "text-orange-600 dark:text-orange-400",
        },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-headline-large font-montserrat text-on-surface mb-2">
                    <SidebarTrigger /> Dashboard
                </h1>
                <p className="text-body-medium text-on-surface-variant">
                    Welcome back! Here's what's happening with your platform.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <Card
                            key={stat.title}
                            className="google-card border-outline bg-surface"
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-on-surface-variant">
                                    {stat.title}
                                </CardTitle>
                                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${stat.color}`}>
                                    <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-semibold text-on-surface">
                                    {stat.value}
                                </div>
                                <p className="text-xs text-on-surface-variant mt-1">
                                    {stat.subtitle}
                                </p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="google-card border-outline bg-surface">
                    <CardHeader>
                        <CardTitle className="text-headline-small text-on-surface">
                            Recent Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                {
                                    title: "New app deployed",
                                    description: "Nuru v2.1.0 is now live",
                                    time: "2h ago",
                                },
                                {
                                    title: "New user registered",
                                    description: "45 new signups today",
                                    time: "5h ago",
                                },
                                {
                                    title: "Payment received",
                                    description: "KES 12,500 from subscription",
                                    time: "1d ago",
                                },
                            ].map((activity, i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-4 pb-4 last:pb-0 border-b last:border-0 border-outline"
                                >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-variant flex-shrink-0">
                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium text-on-surface">
                                            {activity.title}
                                        </p>
                                        <p className="text-sm text-on-surface-variant">
                                            {activity.description}
                                        </p>
                                    </div>
                                    <div className="text-xs text-on-surface-variant">
                                        {activity.time}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="google-card border-outline bg-surface">
                    <CardHeader>
                        <CardTitle className="text-headline-small text-on-surface">
                            Quick Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <button className="google-button-primary w-full py-3 px-4 text-body-medium">
                            Deploy New App
                        </button>
                        <button className="google-button-secondary w-full py-3 px-4 text-body-medium">
                            View All Apps
                        </button>
                        <button className="google-button-secondary w-full py-3 px-4 text-body-medium">
                            Manage Team
                        </button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
