'use client'

// One campaign row in the Content editor. Pure presentation: the parent owns the
// draft, this only reports changes back.
//
// The campaign id is NOT editable. Donations are stored as orders carrying
// metadata.campaignId, so editing an id would silently orphan every donation
// that campaign has already received.

import ImageUpload from '@/components/store/image-upload'
import { SettingsField } from '../settings-primitives'
import type { CampaignDraft } from '@/lib/content-draft'

const inputClass =
    'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-[14px] shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

const textareaClass =
    'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-[14px] shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

export default function CampaignCard({
    storeId,
    campaign,
    onChange,
    onRemove,
}: {
    storeId: string
    campaign: CampaignDraft
    onChange: (next: CampaignDraft) => void
    onRemove: () => void
}) {
    const set = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) =>
        onChange({ ...campaign, [key]: value })

    return (
        <div className="rounded-lg border border-[var(--md-sys-color-outline-variant)] p-4 space-y-5">
            <SettingsField label="Title" hint="Required. Without it the campaign will not appear on your site.">
                <input
                    className={inputClass}
                    placeholder="Clean water for Kajiado"
                    value={campaign.title}
                    onChange={(e) => set('title', e.target.value)}
                />
            </SettingsField>

            <SettingsField label="Description">
                <textarea
                    className={textareaClass}
                    rows={2}
                    placeholder="What this campaign funds"
                    value={campaign.description}
                    onChange={(e) => set('description', e.target.value)}
                />
            </SettingsField>

            <ImageUpload
                value={campaign.image}
                onChange={(url) => set('image', url)}
                bucket="store-assets"
                pathPrefix={`${storeId}/campaigns/${campaign.id}`}
                label="Campaign image"
                aspectRatio="wide"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                <SettingsField label="Goal" hint="Optional. Leave blank for no target.">
                    <input
                        className={inputClass}
                        placeholder="100000"
                        value={campaign.goalAmount}
                        onChange={(e) => set('goalAmount', e.target.value)}
                    />
                </SettingsField>
                <SettingsField label="Minimum donation" hint="Optional.">
                    <input
                        className={inputClass}
                        placeholder="100"
                        value={campaign.minAmount}
                        onChange={(e) => set('minAmount', e.target.value)}
                    />
                </SettingsField>
            </div>

            <SettingsField label="Suggested amounts" hint="Separate with commas. These become the donate buttons.">
                <input
                    className={inputClass}
                    placeholder="500, 1000, 2500"
                    value={campaign.presets}
                    onChange={(e) => set('presets', e.target.value)}
                />
            </SettingsField>

            <label className="flex items-center gap-2 text-[13px] text-[var(--md-sys-color-on-surface)]">
                <input
                    type="checkbox"
                    checked={campaign.allowCustomAmount}
                    onChange={(e) => set('allowCustomAmount', e.target.checked)}
                />
                Let people enter their own amount
            </label>

            <button
                type="button"
                className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--md-sys-color-error)] hover:underline underline-offset-4"
                onClick={() => {
                    // Donations are tagged with this campaign id. Removing the
                    // campaign does not delete them, but they stop being
                    // attributable to anything the merchant can see.
                    const ok = window.confirm(
                        `Remove "${campaign.title || 'this campaign'}"?\n\n` +
                        'Donations already received stay in your records, but they will no longer ' +
                        'show against this campaign. This cannot be undone.',
                    )
                    if (ok) onRemove()
                }}
            >
                Remove campaign
            </button>
        </div>
    )
}
