'use client'

import { useState } from 'react'
import { Button } from '@mcloud/ui/kit/button'
import { Icon } from '@mcloud/ui/kit/icon'
import { Field, Switch, TextArea, TextInput } from '@mcloud/ui/kit/form'
import { cn } from '@mcloud/ui/utils'
import { ProGateInline } from '@/components/pro'
import type { Plan } from '@mcloud/merchant/plans'
import ImageField, { type PickImage } from './image-field'
import { listFor, type EditorAction, type Settings } from './editor-state'
import type { ItemOp } from './item-ops'

type RecordField = {
    key: string
    label: string
    kind: 'text' | 'textarea' | 'image' | 'toggle'
    placeholder?: string
    hint?: string
    /** For a toggle the stored value may be missing: what that means. */
    defaultOn?: boolean
    inputMode?: 'numeric' | 'decimal'
}

type ListSpec = {
    list: string
    noun: string
    /** Field whose value names a record in its collapsed header. */
    titleKey: string
    fields: RecordField[]
    /** A hero always keeps one slide. */
    min?: number
}

const LISTS: Record<string, ListSpec> = {
    heroSlides: {
        list: 'heroSlides', noun: 'slide', titleKey: 'title', min: 1,
        fields: [
            { key: 'image', label: 'Background image', kind: 'image' },
            { key: 'accent', label: 'Small label', kind: 'text', placeholder: 'New arrivals' },
            { key: 'title', label: 'Headline', kind: 'text', placeholder: 'Your store name' },
            { key: 'subtitle', label: 'Text', kind: 'textarea' },
            { key: 'buttonText', label: 'Button text', kind: 'text', placeholder: 'Shop now' },
        ],
    },
    programs: {
        list: 'programs', noun: 'program', titleKey: 'title',
        fields: [
            { key: 'title', label: 'Title', kind: 'text', placeholder: 'Wells' },
            { key: 'description', label: 'Description', kind: 'textarea', placeholder: 'What it does' },
            { key: 'image', label: 'Image', kind: 'image' },
        ],
    },
    impactStats: {
        list: 'impactStats', noun: 'stat', titleKey: 'label',
        fields: [
            { key: 'value', label: 'Number', kind: 'text', placeholder: '1,200' },
            { key: 'label', label: 'Label', kind: 'text', placeholder: 'Wells dug' },
        ],
    },
    galleryPhotos: {
        list: 'galleryPhotos', noun: 'photo', titleKey: 'caption',
        fields: [
            { key: 'image', label: 'Photo', kind: 'image' },
            { key: 'caption', label: 'Caption', kind: 'text' },
        ],
    },
    campaigns: {
        list: 'campaigns', noun: 'campaign', titleKey: 'title',
        fields: [
            { key: 'title', label: 'Title', kind: 'text', placeholder: 'Clean water for Kajiado', hint: 'Required. Without it the campaign does not appear on your site.' },
            { key: 'description', label: 'Description', kind: 'textarea' },
            { key: 'image', label: 'Image', kind: 'image' },
            { key: 'goalAmount', label: 'Goal', kind: 'text', inputMode: 'decimal', placeholder: '500000', hint: 'Optional. Shows a progress bar.' },
            { key: 'presets', label: 'Suggested amounts', kind: 'text', placeholder: '500, 1000, 2500', hint: 'Separate with commas.' },
            { key: 'allowCustomAmount', label: 'Allow any amount', kind: 'toggle', defaultOn: true },
            { key: 'minAmount', label: 'Minimum donation', kind: 'text', inputMode: 'decimal', placeholder: 'No minimum' },
        ],
    },
}

/** Which content block a section type edits, beyond its own schema fields. */
const CONTENT_FOR: Record<string, string> = {
    hero: 'heroSlides',
    programs: 'programs',
    impact: 'impactStats',
    gallery: 'galleryPhotos',
    campaigns: 'campaigns',
}

/** NGO content, which the Content screen gated on Hobby+. Kept gated here. */
const GATED = new Set(['mission', 'programs', 'impact', 'contact', 'campaigns'])

/** Does this section type have content (in stores.settings) the sidebar can edit? */
export function hasSectionContent(type: string): boolean {
    return type in CONTENT_FOR || type === 'mission' || type === 'contact'
}

export default function SectionContent({
    type, settings, dispatch, pickImage, plan, onShowRecord,
}: {
    type: string
    settings: Settings
    dispatch: (a: EditorAction) => void
    pickImage: PickImage
    plan: Plan
    /** A record was opened for editing (the preview pages the hero to that slide). */
    onShowRecord?: (list: string, index: number) => void
}) {
    let body: React.ReactNode = null
    if (type === 'mission') body = <MissionFields settings={settings} dispatch={dispatch} />
    else if (type === 'contact') body = <ContactFields settings={settings} dispatch={dispatch} />
    else if (CONTENT_FOR[type]) body = <RecordList spec={LISTS[CONTENT_FOR[type]]} settings={settings} dispatch={dispatch} pickImage={pickImage} onShow={onShowRecord} />
    if (!body) return null

    if (!GATED.has(type)) return body
    return (
        <ProGateInline plan={plan} requires="hobby" feature="Site content" description="Edit your mission, programs, impact and campaigns on the Hobby plan and higher.">
            {body}
        </ProGateInline>
    )
}

const text = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : Array.isArray(v) ? v.join(', ') : '')

function MissionFields({ settings, dispatch }: { settings: Settings; dispatch: (a: EditorAction) => void }) {
    return (
        <div className="space-y-4">
            <Field label="Headline">
                <TextInput
                    value={text(settings.missionHeadline)}
                    placeholder="Clean water for every village"
                    onChange={(e) => dispatch({ type: 'setting', key: 'missionHeadline', value: e.target.value })}
                />
            </Field>
            <Field label="Mission" hint="What your organisation is for, in a sentence or two.">
                <TextArea
                    rows={4}
                    value={text(settings.mission)}
                    placeholder="We dig wells in communities that walk hours for water."
                    onChange={(e) => dispatch({ type: 'setting', key: 'mission', value: e.target.value })}
                />
            </Field>
        </div>
    )
}

function ContactFields({ settings, dispatch }: { settings: Settings; dispatch: (a: EditorAction) => void }) {
    const contact = (settings.contact && typeof settings.contact === 'object' ? settings.contact : {}) as Record<string, unknown>
    const set = (key: string, value: string) => dispatch({ type: 'setting', key: 'contact', value: { ...contact, [key]: value } })
    return (
        <div className="space-y-4">
            <Field label="Address"><TextInput value={text(contact.address)} placeholder="Nairobi, Kenya" onChange={(e) => set('address', e.target.value)} /></Field>
            <Field label="Email"><TextInput type="email" value={text(contact.email)} placeholder="hello@example.org" onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Phone"><TextInput type="tel" value={text(contact.phone)} placeholder="+254 700 000 000" onChange={(e) => set('phone', e.target.value)} /></Field>
        </div>
    )
}

function RecordList({
    spec, settings, dispatch, pickImage, onShow,
}: {
    spec: ListSpec
    settings: Settings
    dispatch: (a: EditorAction) => void
    pickImage: PickImage
    onShow?: (list: string, index: number) => void
}) {
    const items = listFor(spec.list, settings)
    // The record just added opens, so the merchant can type into it straight away.
    const [open, setOpen] = useState<number | null>(items.length === 1 ? 0 : null)
    const op = (o: ItemOp) => dispatch({ type: 'item-op', list: spec.list, op: o })
    const min = spec.min ?? 0

    return (
        <div className="space-y-2">
            {items.map((raw, i) => {
                const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
                const title = text(item[spec.titleKey]).trim() || `${capitalise(spec.noun)} ${i + 1}`
                const expanded = open === i
                return (
                    <div key={i} className="rounded-md border border-border bg-card">
                        <div className="flex items-center gap-1 pl-2 pr-1">
                            <button
                                type="button"
                                aria-expanded={expanded}
                                onClick={() => {
                                    setOpen(expanded ? null : i)
                                    if (!expanded) onShow?.(spec.list, i)
                                }}
                                className="flex h-9 min-w-0 flex-1 items-center gap-1.5 text-left text-[13px] font-medium"
                            >
                                <Icon name={expanded ? 'expand_more' : 'chevron_right'} size={16} className="text-muted-foreground" />
                                <span className="truncate">{title}</span>
                            </button>
                            <IconAction icon="arrow_upward" label={`Move ${spec.noun} up`} disabled={i === 0} onClick={() => { op({ op: 'move', index: i, to: i - 1 }); if (expanded) setOpen(i - 1) }} />
                            <IconAction icon="arrow_downward" label={`Move ${spec.noun} down`} disabled={i === items.length - 1} onClick={() => { op({ op: 'move', index: i, to: i + 1 }); if (expanded) setOpen(i + 1) }} />
                            <IconAction icon="content_copy" label={`Duplicate ${spec.noun}`} onClick={() => op({ op: 'duplicate', index: i })} />
                            <IconAction icon="delete" label={`Remove ${spec.noun}`} disabled={items.length <= min} onClick={() => { op({ op: 'delete', index: i }); setOpen(null) }} />
                        </div>
                        {expanded && (
                            <div className="space-y-4 border-t border-border p-3">
                                {spec.fields.map((f) => (
                                    <RecordControl
                                        key={f.key}
                                        field={f}
                                        value={item[f.key]}
                                        pickImage={pickImage}
                                        onChange={(value) => dispatch({ type: 'item-edit', list: spec.list, index: i, key: f.key, value })}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )
            })}
            <Button
                className="w-full"
                onClick={() => { op({ op: 'add', index: items.length, list: spec.list }); setOpen(items.length) }}
            >
                <Icon name="add" size={16} />
                Add {spec.noun}
            </Button>
        </div>
    )
}

function RecordControl({
    field: f, value, onChange, pickImage,
}: {
    field: RecordField
    value: unknown
    onChange: (v: unknown) => void
    pickImage: PickImage
}) {
    if (f.kind === 'toggle') {
        return <Switch label={f.label} checked={value === undefined ? !!f.defaultOn : value !== false} onChange={onChange} />
    }
    if (f.kind === 'image') {
        return <Field label={f.label} as="div"><ImageField value={text(value)} onChange={onChange} pickImage={pickImage} /></Field>
    }
    return (
        <Field label={f.label} hint={f.hint}>
            {f.kind === 'textarea' ? (
                <TextArea value={text(value)} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
            ) : (
                <TextInput value={text(value)} placeholder={f.placeholder} inputMode={f.inputMode} onChange={(e) => onChange(e.target.value)} />
            )}
        </Field>
    )
}

export function IconAction({
    icon, label, onClick, disabled, className,
}: {
    icon: string
    label: string
    onClick: () => void
    disabled?: boolean
    className?: string
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={(e) => { e.stopPropagation(); onClick() }}
            className={cn(
                'grid h-7 w-7 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-30',
                className,
            )}
        >
            <Icon name={icon} size={16} />
        </button>
    )
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
