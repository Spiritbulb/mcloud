'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS']
const TIMEZONES = [
    'Africa/Nairobi',
    'Africa/Lagos',
    'Africa/Johannesburg',
    'Africa/Cairo',
    'UTC',
    'Europe/London',
    'America/New_York',
]

interface GeneralSettingsProps {
    store: any
    activeTab: string
    setActiveTab: (tab: string) => void
    TABS: any[]
    // Lifted state from StoreSettings
    name: string
    setName: (v: string) => void
    description: string
    setDescription: (v: string) => void
    currency: string
    setCurrency: (v: string) => void
    timezone: string
    setTimezone: (v: string) => void
    isActive: boolean
    setIsActive: (v: boolean) => void
    logoUrl: string
    setLogoUrl: (v: string) => void
}

export default function GeneralSettings({
    store,
    name, setName,
    description, setDescription,
    currency, setCurrency,
    timezone, setTimezone,
    isActive, setIsActive,
}: GeneralSettingsProps) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-base font-semibold text-foreground">General</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Basic store information</p>
            </div>

            <div className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                    <Label htmlFor="store-name">Store name</Label>
                    <Input
                        id="store-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell customers what you sell…"
                        rows={3}
                        className="resize-none"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label>Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {CURRENCIES.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label>Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {TIMEZONES.map((tz) => (
                                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <p className="text-sm font-medium text-foreground">Store active</p>
                        <p className="text-xs text-muted-foreground">
                            When off, your store shows a coming soon page
                        </p>
                    </div>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
            </div>
        </div>
    )
}