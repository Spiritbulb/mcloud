// The contract between "what is configurable" and "the form the merchant sees".
// A section (or the theme) DECLARES its settings with these; the admin GENERATES
// the form from the declaration. Adding a configurable field must never require
// writing admin code.

export type SettingField =
  | { id: string; type: 'text';     label: string; default?: string; placeholder?: string }
  | { id: string; type: 'textarea'; label: string; default?: string; placeholder?: string }
  | { id: string; type: 'color';    label: string; default?: string }
  | { id: string; type: 'font';     label: string; default?: string }
  | { id: string; type: 'image';    label: string }
  | { id: string; type: 'number';   label: string; default?: number; min?: number; max?: number; step?: number }
  | { id: string; type: 'select';   label: string; options: { value: string; label: string }[]; default?: string }
  | { id: string; type: 'toggle';   label: string; default?: boolean }

/** The values a schema's fields hold, keyed by field id. */
export type SettingValues = Record<string, unknown>

/** A field's default, or undefined. Used to prefill a form and to fall back on render. */
export function defaultsFor(schema: readonly SettingField[]): SettingValues {
  const out: SettingValues = {}
  for (const f of schema) {
    if ('default' in f && f.default !== undefined) out[f.id] = f.default
  }
  return out
}
