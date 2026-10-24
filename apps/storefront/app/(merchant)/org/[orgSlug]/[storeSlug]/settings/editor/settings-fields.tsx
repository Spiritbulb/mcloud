'use client'

import { useId } from 'react'
import { Field, Select, Switch, TextArea, TextInput } from '@mcloud/ui/kit/form'
import type { SettingField, SettingValues } from '@mcloud/verticals'
import ImageField, { type PickImage } from './image-field'

/** Families offered for a font field. Any other name can still be typed. */
const FONT_SUGGESTIONS = [
    'Inter', 'DM Sans', 'Poppins', 'Montserrat', 'Lato', 'Open Sans', 'Roboto', 'Nunito', 'Work Sans',
    'Raleway', 'Quicksand', 'Space Grotesk', 'Playfair Display', 'Lora', 'Merriweather',
    'Libre Baskerville', 'Cormorant Garamond', 'EB Garamond', 'Source Serif 4', 'Fraunces',
]

/**
 * Renders a form from a schema. The ONE place a SettingField becomes a control:
 * the theme panel and every section panel use it, so adding a configurable field
 * anywhere is a registry change with no admin code.
 *
 * A blank value means "use the default", so the default is shown as the
 * placeholder rather than pre-filled: clearing a box restores it.
 */
export default function SettingsFields({
    schema,
    values,
    onChange,
    pickImage,
}: {
    schema: readonly SettingField[]
    values: SettingValues
    onChange: (id: string, value: unknown) => void
    pickImage: PickImage
}) {
    if (schema.length === 0) return null
    return (
        <div className="space-y-4">
            {schema.map((f) => (
                <SettingControl key={f.id} field={f} raw={values[f.id]} onChange={(v) => onChange(f.id, v)} pickImage={pickImage} />
            ))}
        </div>
    )
}

function SettingControl({
    field: f,
    raw,
    onChange,
    pickImage,
}: {
    field: SettingField
    raw: unknown
    onChange: (value: unknown) => void
    pickImage: PickImage
}) {
    const id = useId()
    const str = typeof raw === 'string' ? raw : raw === undefined || raw === null ? '' : String(raw)
    const fallback = 'default' in f && f.default !== undefined ? String(f.default) : ''

    switch (f.type) {
        case 'text':
            return (
                <Field label={f.label}>
                    <TextInput value={str} placeholder={f.placeholder ?? fallback} onChange={(e) => onChange(e.target.value)} />
                </Field>
            )
        case 'textarea':
            return (
                <Field label={f.label}>
                    <TextArea value={str} placeholder={f.placeholder ?? fallback} onChange={(e) => onChange(e.target.value)} />
                </Field>
            )
        case 'color':
            return (
                <Field label={f.label} htmlFor={id}>
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            aria-label={`${f.label} colour`}
                            value={/^#[0-9a-fA-F]{6}$/.test(str) ? str : /^#[0-9a-fA-F]{6}$/.test(fallback) ? fallback : '#000000'}
                            onChange={(e) => onChange(e.target.value)}
                            className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-input bg-card p-0.5"
                        />
                        <TextInput
                            id={id}
                            className="font-mono"
                            value={str}
                            placeholder={fallback}
                            spellCheck={false}
                            invalid={str !== '' && !/^#[0-9a-fA-F]{3,8}$/.test(str)}
                            onChange={(e) => onChange(e.target.value)}
                        />
                    </div>
                </Field>
            )
        case 'font':
            return (
                <Field label={f.label} hint={str || fallback ? undefined : 'Pick from the list or type any Google Font name.'}>
                    <TextInput
                        list={`${id}-fonts`}
                        value={str}
                        placeholder={fallback}
                        style={{ fontFamily: `'${str || fallback}', system-ui` }}
                        onChange={(e) => onChange(e.target.value)}
                    />
                    <datalist id={`${id}-fonts`}>
                        {FONT_SUGGESTIONS.map((name) => <option key={name} value={name} />)}
                    </datalist>
                </Field>
            )
        case 'number': {
            const value = str || String(f.default ?? f.min ?? 0)
            return (
                <Field label={<span className="flex items-center justify-between"><span>{f.label}</span><span className="font-mono text-muted-foreground">{value}</span></span>}>
                    <input
                        type="range"
                        className="w-full accent-primary"
                        min={f.min ?? 0}
                        max={f.max ?? 10}
                        step={f.step ?? 1}
                        // A range's value is always a string, so nothing here can write
                        // a number into a string column (font_scale).
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                    />
                </Field>
            )
        }
        case 'select':
            return (
                <Field label={f.label}>
                    <Select value={str || fallback} onChange={(e) => onChange(e.target.value)}>
                        {/* A stored value the options no longer list (an old "Pill" radius) stays selectable. */}
                        {str && !f.options.some((o) => o.value === str) && <option value={str}>{str}</option>}
                        {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                </Field>
            )
        case 'toggle':
            return (
                <Switch
                    label={f.label}
                    checked={raw === undefined ? !!f.default : !!raw}
                    onChange={onChange}
                />
            )
        case 'image':
            return (
                <Field label={f.label} as="div">
                    <ImageField value={str} onChange={onChange} pickImage={pickImage} />
                </Field>
            )
        default:
            return null
    }
}
