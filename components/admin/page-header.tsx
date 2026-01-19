import { ReactNode } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"

interface PageHeaderProps {
    title: string
    description?: string
    actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
    return (
        <div className="flex items-start justify-between mb-6">
            <div>

                <h1 className="text-headline-large font-montserrat text-on-surface mb-2">
                    <SidebarTrigger className="cursor-pointer" />   {title}
                </h1>
                {description && (
                    <p className="text-body-medium text-on-surface-variant">
                        {description}
                    </p>
                )}
            </div>
            {actions && <div className="flex gap-2">{actions}</div>}
        </div>
    )
}
