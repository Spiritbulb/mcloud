'use client'

import ImageUpload from '@/components/store/image-upload'
import type { SettingField, SettingValues } from '@mcloud/verticals'

const inputCls =
    'w-full h-9 rounded-lg border border-[var(--md-sys-color-outline-variant)] ' +
    'bg-[var(--md-sys-color-surface)] px-3 text-[13px] text-[var(--md-sys-color-on-surface)] ' +
    'focus:outline-none focus:border-[var(--md-sys-color-primary)]'

/**
 * Renders a form from a schema. The ONE place a SettingField becomes a control.
 * Both the theme rail and every section rail use this, so adding a configurable
 * field anywhere is a registry change with no admin code.
 */
export default function SettingsFields({
    schema,
    values,
    onChange,
    storeId,
    pathPrefix,
}: {
    schema: readonly SettingField[]
    values: SettingValues
    onChange: (id: string, value: unknown) => void
    storeId: string
    pathPrefix: string
}) {
    if (schema.length === 0) {
        return (
            <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)]">
                Nothing to configure here yet.
            </p>
        )
    }

    return (
        <div className="space-y-4">
            {schema.map((f) => {
                // A blank value means "use the default", so show the default as the
                // placeholder rather than pre-filling it. The merchant sees what the
                // site says today, and clearing the box restores it.
                const raw = values[f.id]
                const str = typeof raw === 'string' ? raw : raw === undefined ? '' : String(raw)

                return (
                    <label key={f.id} className="block">
                        <span className="block text-[12px] font-medium text-[var(--md-sys-color-on-surface)] mb-1.5">
                            {f.label}
                        </span>

                        {f.type === 'text' && (
                            <input
                                className={inputCls}
                                value={str}
                                placeholder={f.placeholder ?? f.default ?? ''}
                                onChange={(e) => onChange(f.id, e.target.value)}
                            />
                        )}

                        {f.type === 'textarea' && (
                            <textarea
                                className={inputCls.replace('h-9', 'min-h-20 py-2')}
                                rows={3}
                                value={str}
                                placeholder={f.placeholder ?? f.default ?? ''}
                                onChange={(e) => onChange(f.id, e.target.value)}
                            />
                        )}

                        {f.type === 'color' && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={str || f.default || '#000000'}
                                    onChange={(e) => onChange(f.id, e.target.value)}
                                    className="w-9 h-9 rounded-lg border border-[var(--md-sys-color-outline-variant)] cursor-pointer bg-transparent p-0"
                                />
                                <input
                                    className={inputCls + ' font-mono flex-1'}
                                    value={str}
                                    placeholder={f.default ?? ''}
                                    spellCheck={false}
                                    onChange={(e) => onChange(f.id, e.target.value)}
                                />
                            </div>
                        )}

                        {f.type === 'font' && (
                            <input
                                className={inputCls}
                                value={str}
                                placeholder={f.default ?? ''}
                                onChange={(e) => onChange(f.id, e.target.value)}
                            />
                        )}

                        {f.type === 'number' && (
                            <input
                                type="range"
                                className="w-full"
                                min={f.min ?? 0}
                                max={f.max ?? 10}
                                step={f.step ?? 1}
                                // The range's value is always a string, so nothing here
                                // can write a number into a string column (font_scale).
                                value={str || String(f.default ?? f.min ?? 0)}
                                onChange={(e) => onChange(f.id, e.target.value)}
                            />
                        )}

                        {f.type === 'select' && (
                            <select
                                className={inputCls}
                                value={str || f.default || ''}
                                onChange={(e) => onChange(f.id, e.target.value)}
                            >
                                {f.options.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        )}

                        {f.type === 'toggle' && (
                            <input
                                type="checkbox"
                                checked={raw === undefined ? !!f.default : !!raw}
                                onChange={(e) => onChange(f.id, e.target.checked)}
                            />
                        )}

                        {f.type === 'image' && (
                            <ImageUpload
                                value={str}
                                onChange={(url) => onChange(f.id, url)}
                                bucket="store-assets"
                                pathPrefix={`${storeId}/${pathPrefix}/${f.id}`}
                                aspectRatio="wide"
                            />
                        )}
                    </label>
                )
            })}
        </div>
    )
}
