'use client'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@mcloud/ui/dropdown-menu'
import { Icon } from '@mcloud/ui/kit/icon'
import { UpgradeChip } from '@/components/pro'
import { webUrl } from '@/lib/host'

const ICON_BUTTON =
    'flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'

const MORE_LINKS = [
    { href: 'https://mcloud.co.ke/docs', icon: 'menu_book', label: 'Documentation' },
    { href: 'https://mcloud.co.ke/changelog', icon: 'new_releases', label: 'Changelog' },
    { href: 'https://status.mcloud.co.ke', icon: 'monitor_heart', label: 'System status' },
]

/** Right side of the store settings header: upgrade (free plans only), help, and a "more" menu. */
export function SettingsHeaderActions({ isPro, orgSlug }: { isPro: boolean; orgSlug: string }) {
    return (
        <>
            {!isPro && <UpgradeChip />}

            <a href="https://mcloud.co.ke/support" target="_blank" rel="noopener noreferrer" title="Support" aria-label="Support" className={`${ICON_BUTTON} max-md:hidden`}>
                <Icon name="help" size={18} />
            </a>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button type="button" aria-label="More" className={ICON_BUTTON}>
                        <Icon name="more_horiz" size={18} />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-lg border border-border bg-popover p-1 shadow-lg">
                    {MORE_LINKS.map((l) => (
                        <DropdownMenuItem key={l.label} asChild className="cursor-pointer gap-2 rounded-md text-[13px]">
                            <a href={l.href} target="_blank" rel="noopener noreferrer">
                                <Icon name={l.icon} size={16} className="text-muted-foreground" />
                                {l.label}
                            </a>
                        </DropdownMenuItem>
                    ))}
                    {!isPro && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-md text-[13px]">
                                {/* Plans are bought from the org wallet in Billing; there is no app-store purchase. */}
                                <a href={webUrl(`/org/${orgSlug}/billing`)}>
                                    <Icon name="workspace_premium" size={16} className="text-primary" />
                                    <span className="font-medium text-primary">Upgrade plan</span>
                                </a>
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}
