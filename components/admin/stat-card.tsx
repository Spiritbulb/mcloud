import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
    title: string
    value: string
    subtitle?: string
    icon: LucideIcon
    colorClass?: string
}

export function StatCard({ title, value, subtitle, icon: Icon, colorClass = "bg-blue-100 dark:bg-blue-950" }: StatCardProps) {
    const iconColorClass = colorClass.replace('bg-', 'text-').replace('100', '600').replace('950', '400')

    return (
        <Card className="google-card border-outline bg-surface">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-on-surface-variant">
                    {title}
                </CardTitle>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${colorClass}`}>
                    <Icon className={`h-5 w-5 ${iconColorClass}`} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-semibold text-on-surface">{value}</div>
                {subtitle && (
                    <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>
                )}
            </CardContent>
        </Card>
    )
}
