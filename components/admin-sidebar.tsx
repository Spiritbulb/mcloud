"use client"

import { useEffect, useState } from "react"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarHeader,
    SidebarFooter,
} from "@/components/ui/sidebar"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Globe,
    DollarSign,
    Headphones,
    User,
    ChevronDown,
    Settings,
    LogOut,
    UserCircle,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { createClient } from '@/lib/client'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface AdminSidebarProps {
    slug: string
    orgName: string
    userId: string
    orgLogo: string
    orgRole: string
}

export function AdminSidebar({ slug, orgName, userId, orgLogo, orgRole }: AdminSidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [openItem, setOpenItem] = useState<string | null>(null)

    const [profile, setProfile] = useState({
        full_name: "",
        email: "",
        avatar_url: "",
    })

    const navItems = orgRole === 'owner' ? [
        {
            id: "dashboard",
            label: "Dashboard",
            icon: Globe,
            href: `/${slug}/a`,
            subItems: [
                { label: "Organizations", href: `/${slug}/a/organizations` },
                { label: "Apps", href: `/${slug}/a/apps` },
                { label: "Analytics", href: `/${slug}/a/analytics` },
            ],
        },
        {
            id: "billing",
            label: "Billing",
            icon: DollarSign,
            href: `/${slug}/a/billing`,
            subItems: [
                { label: "Overview", href: `/${slug}/a/billing` },
                { label: "Invoices", href: `/${slug}/a/billing/invoices` },
                { label: "Subscriptions", href: `/${slug}/a/billing/subscription` },
            ],
        },
        /*  {
              id: "support",
              label: "Support",
              icon: Headphones,
              href: `/${slug}/support`,
              subItems: [
                  { label: "Tickets", href: `/${slug}/support/tickets` },
                  { label: "Documentation", href: `/${slug}/support/docs` },
                  { label: "Contact Us", href: `/${slug}/support/contact` },
                  { label: "FAQ", href: `/${slug}/support/faq` },
              ],
          },*/
        {
            id: "accounts",
            label: "Accounts",
            icon: User,
            href: `/${slug}/a/accounts`,
            subItems: [
                { label: "Profile", href: `/${slug}/a/accounts/profiles` },
                { label: "Security", href: `/${slug}/a/accounts/security` },
                { label: "Preferences", href: `/${slug}/a/accounts/preferences` },
                { label: "Team Members", href: `/${slug}/a/accounts/team` },
            ],
        },
    ] : [
        {
            id: "apps",
            label: "Apps",
            icon: Globe,
            href: `/${slug}/apps`,
            subItems: [
                { label: "Domains", href: `/${slug}/apps/domains` },
                { label: "Analytics", href: `/${slug}/apps/analytics` },
                { label: "Settings", href: `/${slug}/apps/settings` },
            ],
        },
        {
            id: "billing",
            label: "Billing",
            icon: DollarSign,
            href: `/${slug}/billing`,
            subItems: [
                { label: "Overview", href: `/${slug}/billing` },
                { label: "Invoices", href: `/${slug}/billing/invoices` },
                { label: "Subscription", href: `/${slug}/billing/subscription` },
            ],
        },
        /*  {
              id: "support",
              label: "Support",
              icon: Headphones,
              href: `/${slug}/support`,
              subItems: [
                  { label: "Tickets", href: `/${slug}/support/tickets` },
                  { label: "Documentation", href: `/${slug}/support/docs` },
                  { label: "Contact Us", href: `/${slug}/support/contact` },
                  { label: "FAQ", href: `/${slug}/support/faq` },
              ],
          },*/
        {
            id: "account",
            label: "Account",
            icon: User,
            href: `/${slug}/account`,
            subItems: [
                { label: "Profile", href: `/${slug}/account/profile` },
                { label: "Security", href: `/${slug}/account/security` },
                { label: "Preferences", href: `/${slug}/account/preferences` },
                { label: "Team Members", href: `/${slug}/account/team` },
            ],
        },
    ]

    useEffect(() => {
        const activeItem = navItems.find(item => pathname.startsWith(item.href))
        if (activeItem) {
            setOpenItem(activeItem.id)
        }
    }, [pathname])

    useEffect(() => {
        loadProfile()
        console.log(orgLogo)
    }, [userId])

    const loadProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/auth/login')
                return
            }

            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('full_name, avatar_url')
                .eq('id', userId)
                .single()

            setProfile({
                full_name: profileData?.full_name || '',
                email: user.email || '',
                avatar_url: profileData?.avatar_url || '',
            })
        } catch (err: any) {
            console.error('Error loading profile:', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event) => {
                if (event === 'SIGNED_OUT') {
                    router.push('/auth/login')
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [supabase, router])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/auth/login')
    }

    const getUserInitials = () => {
        const name = profile.full_name || profile.email
        return name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'U'
    }

    const isAdmin = orgRole === 'owner'
    const isMember = orgRole === 'member'

    if (loading) {
        return (
            <Sidebar className="bg-surface border-none">
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            </Sidebar>
        )
    }

    return (
        <Sidebar className="border-none bg-background backdrop-blur-sm">
            <SidebarHeader className="px-4 py-4 bg-background">
                <div className="flex items-center justify-between">
                    <Link href={`/${slug}`} className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground">
                            <img src={orgLogo} alt="Logo" className="h-8 w-auto" />
                        </div>
                        <span className="font-montserrat font-semibold text-on-surface">
                            {orgName}
                        </span>
                    </Link>
                </div>
            </SidebarHeader>


            <SidebarContent className="px-3 py-4 bg-background">
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname.startsWith(item.href)
                                const isOpen = openItem === item.id

                                return (
                                    <Collapsible
                                        key={item.id}
                                        open={isOpen}
                                        onOpenChange={(open) => {
                                            setOpenItem(open ? item.id : null)
                                        }}
                                        className="group/collapsible"
                                    >
                                        <SidebarMenuItem>
                                            <CollapsibleTrigger asChild>
                                                <SidebarMenuButton
                                                    tooltip={item.label}
                                                    className={cn(
                                                        "rounded-lg transition-colors duration-200 py-5 cursor-pointer",
                                                        isActive && "bg-surface"
                                                    )}
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        setOpenItem(isOpen ? null : item.id)
                                                        if (item.href) {
                                                            router.push(item.href)
                                                        }
                                                    }}
                                                >
                                                    <div
                                                        className={cn(
                                                            "flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-200",
                                                            isActive
                                                                ? "bg-primary/10"
                                                                : "bg-surface"
                                                        )}
                                                    >
                                                        <Icon
                                                            className={cn(
                                                                "h-5 w-5 transition-colors duration-200",
                                                                isActive
                                                                    ? "text-primary"
                                                                    : "text-on-surface-variant"
                                                            )}
                                                        />
                                                    </div>
                                                    <span className="font-normal text-on-surface">
                                                        {item.label}
                                                    </span>
                                                    <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>

                                            <CollapsibleContent>
                                                <SidebarMenuSub className="border-none">
                                                    {item.subItems.map((subItem) => {
                                                        const isSubActive = pathname === subItem.href

                                                        return (
                                                            <SidebarMenuSubItem key={subItem.href}>
                                                                <SidebarMenuSubButton
                                                                    asChild
                                                                    className={cn(
                                                                        "rounded-md transition-colors duration-200",
                                                                        isSubActive &&
                                                                        "text-primary font-medium border-none underline-offset-4 underline"
                                                                    )}
                                                                >
                                                                    <Link href={subItem.href}>
                                                                        <span>{subItem.label}</span>
                                                                    </Link>
                                                                </SidebarMenuSubButton>
                                                            </SidebarMenuSubItem>
                                                        )
                                                    })}
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </SidebarMenuItem>
                                    </Collapsible>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-outline p-4 bg-background">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-surface-variant transition-colors duration-200 cursor-pointer">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={profile.avatar_url} />
                                <AvatarFallback className="bg-primary text-white text-sm font-medium">
                                    {getUserInitials()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium text-on-surface truncate">
                                    {profile.full_name || profile.email.split('@')[0]}
                                </p>
                                <p className="text-xs text-on-surface-variant truncate">
                                    {profile.email}
                                </p>
                            </div>
                            <ChevronDown className="h-4 w-4 text-on-surface-variant" />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-surface border-outline">
                        <DropdownMenuItem asChild>
                            <Link href={`/${slug}/account/profile`} className="cursor-pointer">
                                <UserCircle className="mr-2 h-4 w-4" />
                                Profile
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/${slug}/account/preferences`} className="cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-outline" />
                        <DropdownMenuItem
                            onClick={handleSignOut}
                            className="cursor-pointer text-on-surface-variant"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
