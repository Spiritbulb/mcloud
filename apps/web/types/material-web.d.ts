/**
 * Material Web (M3) — React JSX type declarations
 *
 * Bridges @material/web's HTMLElementTagNameMap registrations into
 * React's IntrinsicElements so custom elements are fully typed without
 * any @ts-ignore. Add new component imports as you adopt them.
 *
     e.g. import '@material/web/menu/menu.js'
 */

import type { CSSProperties, HTMLAttributes } from 'react'

// ─── Shared base ──────────────────────────────────────────────────────────────

/** Allows any --custom-property on style without losing standard CSSProperties */
type ThemableStyle = CSSProperties & { [key: `--${string}`]: string | number }

/** Common attributes every M3 element accepts in JSX */
type MdBase = HTMLAttributes<HTMLElement> & {
    style?: ThemableStyle
    class?: string
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

type MdMenuProps = MdBase & {
    anchor?: string
    open?: boolean
    positioning?: 'absolute' | 'fixed' | 'document' | 'popover'
    'anchor-corner'?: 'start-start' | 'start-end' | 'end-start' | 'end-end'
    'menu-corner'?: 'start-start' | 'start-end' | 'end-start' | 'end-end'
    'has-overflow'?: boolean
    'stay-open-on-outside-click'?: boolean
    'stay-open-on-focusout'?: boolean
    'skip-restore-focus'?: boolean
    'x-offset'?: number
    'y-offset'?: number
    onOpened?: () => void
    onClosed?: () => void
    onOpening?: () => void
    onClosing?: () => void
}

type MdMenuItemProps = MdBase & {
    key?: string
    disabled?: boolean
    type?: 'menuitem' | 'option' | 'button' | 'link'
    href?: string
    target?: string
    'keep-open'?: boolean
    selected?: boolean
    typeaheadText?: string
    onCloseMenu?: (e: CustomEvent) => void
}

type MdSubMenuProps = MdBase & {
    'anchor-corner'?: 'start-start' | 'start-end' | 'end-start' | 'end-end'
    'menu-corner'?: 'start-start' | 'start-end' | 'end-start' | 'end-end'
    'hover-open-delay'?: number
    'hover-close-delay'?: number
}

// ─── Buttons ──────────────────────────────────────────────────────────────────

type MdButtonProps = MdBase & {
    disabled?: boolean
    href?: string
    target?: string
    'trailing-icon'?: boolean
    type?: 'button' | 'submit' | 'reset'
    name?: string
    value?: string
    form?: string
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

type MdCheckboxProps = MdBase & {
    checked?: boolean
    disabled?: boolean
    indeterminate?: boolean
    required?: boolean
    value?: string
    name?: string
}

// ─── Chips ────────────────────────────────────────────────────────────────────

type MdChipSetProps = MdBase

type MdAssistChipProps = MdBase & {
    disabled?: boolean
    elevated?: boolean
    href?: string
    target?: string
    label?: string
}

type MdFilterChipProps = MdBase & {
    disabled?: boolean
    elevated?: boolean
    'remove-only'?: boolean
    selected?: boolean
    label?: string
}

type MdInputChipProps = MdBase & {
    avatar?: boolean
    disabled?: boolean
    href?: string
    target?: string
    'remove-only'?: boolean
    selected?: boolean
    label?: string
}

type MdSuggestionChipProps = MdBase & {
    disabled?: boolean
    elevated?: boolean
    href?: string
    target?: string
    label?: string
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

type MdDialogProps = MdBase & {
    open?: boolean
    quick?: boolean
    returnValue?: string
    type?: 'alert'
    'no-focus-trap'?: boolean
    onOpened?: () => void
    onClosed?: (e: CustomEvent<{ returnValue: string }>) => void
    onOpening?: () => void
    onClosing?: (e: CustomEvent<{ returnValue: string }>) => void
    onCancel?: (e: CustomEvent) => void
}

// ─── Divider ──────────────────────────────────────────────────────────────────

type MdDividerProps = MdBase & {
    inset?: boolean
    'inset-start'?: boolean
    'inset-end'?: boolean
}

// ─── FAB ──────────────────────────────────────────────────────────────────────

type MdFabProps = MdBase & {
    variant?: 'surface' | 'primary' | 'secondary' | 'tertiary'
    size?: 'medium' | 'small' | 'large'
    label?: string
    lowered?: boolean
}

type MdBrandedFabProps = MdBase & {
    variant?: 'surface' | 'primary' | 'secondary' | 'tertiary'
    size?: 'medium' | 'large'
    label?: string
    lowered?: boolean
}

// ─── Icon / Icon Buttons ──────────────────────────────────────────────────────

type MdIconProps = MdBase

type MdIconButtonProps = MdBase & {
    disabled?: boolean
    'flip-icon-in-rtl'?: boolean
    href?: string
    target?: string
    'aria-label-selected'?: string
    toggle?: boolean
    selected?: boolean
    type?: 'button' | 'submit' | 'reset'
    value?: string
    name?: string
    form?: string
}

// ─── List ─────────────────────────────────────────────────────────────────────

type MdListProps = MdBase

type MdListItemProps = MdBase & {
    disabled?: boolean
    type?: 'listitem' | 'button' | 'link' | 'none'
    href?: string
    target?: string
    selected?: boolean
}

// ─── Progress ─────────────────────────────────────────────────────────────────

type MdProgressProps = MdBase & {
    value?: number
    max?: number
    indeterminate?: boolean
    'four-color'?: boolean
}

// ─── Radio ────────────────────────────────────────────────────────────────────

type MdRadioProps = MdBase & {
    checked?: boolean
    disabled?: boolean
    required?: boolean
    value?: string
    name?: string
}

// ─── Select ───────────────────────────────────────────────────────────────────

type MdSelectProps = MdBase & {
    disabled?: boolean
    error?: boolean
    'error-text'?: string
    label?: string
    'menu-positioning'?: 'absolute' | 'fixed' | 'popover'
    'no-asterisk'?: boolean
    required?: boolean
    'supporting-text'?: string
    value?: string
    name?: string
    'clamp-menu-width'?: boolean
}

type MdSelectOptionProps = MdBase & {
    disabled?: boolean
    selected?: boolean
    value?: string
    'display-text'?: string
}

// ─── Slider ───────────────────────────────────────────────────────────────────

type MdSliderProps = MdBase & {
    min?: number
    max?: number
    step?: number
    value?: number
    'value-start'?: number
    'value-end'?: number
    range?: boolean
    disabled?: boolean
    labeled?: boolean
    ticks?: boolean
    name?: string
    'name-start'?: string
    'name-end'?: string
}

// ─── Switch ───────────────────────────────────────────────────────────────────

type MdSwitchProps = MdBase & {
    selected?: boolean
    disabled?: boolean
    icons?: boolean
    'show-only-selected-icon'?: boolean
    required?: boolean
    value?: string
    name?: string
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type MdTabsProps = MdBase & {
    activeTabIndex?: number
    autoActivate?: boolean
}

type MdTabProps = MdBase & {
    active?: boolean
    'has-icon'?: boolean
    'icon-only'?: boolean
    selected?: boolean
    'inline-icon'?: boolean
}

// ─── Text Field ───────────────────────────────────────────────────────────────

type MdTextFieldProps = MdBase & {
    disabled?: boolean
    error?: boolean
    'error-text'?: string
    label?: string
    'no-asterisk'?: boolean
    placeholder?: string
    required?: boolean
    value?: string
    'prefix-text'?: string
    'suffix-text'?: string
    'supporting-text'?: string
    rows?: number
    cols?: number
    inputMode?: string
    max?: string
    maxLength?: number
    min?: string
    minLength?: number
    multiple?: boolean
    name?: string
    pattern?: string
    readOnly?: boolean
    step?: string
    type?: 'email' | 'number' | 'password' | 'search' | 'tel' | 'text' | 'url' | 'textarea'
    autocomplete?: string
}

// ─── Internals ────────────────────────────────────────────────────────────────

type MdFocusRingProps = MdBase & {
    for?: string
    inward?: boolean
}

type MdRippleProps = MdBase & { disabled?: boolean }

type MdElevationProps = MdBase

// ─── JSX IntrinsicElements ────────────────────────────────────────────────────

declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            // Menu
            'md-menu': MdMenuProps
            'md-menu-item': MdMenuItemProps
            'md-sub-menu': MdSubMenuProps

            // Buttons
            'md-filled-button': MdButtonProps
            'md-outlined-button': MdButtonProps
            'md-text-button': MdButtonProps
            'md-elevated-button': MdButtonProps
            'md-filled-tonal-button': MdButtonProps

            // Checkbox
            'md-checkbox': MdCheckboxProps

            // Chips
            'md-chip-set': MdChipSetProps
            'md-assist-chip': MdAssistChipProps
            'md-filter-chip': MdFilterChipProps
            'md-input-chip': MdInputChipProps
            'md-suggestion-chip': MdSuggestionChipProps

            // Dialog
            'md-dialog': MdDialogProps

            // Divider
            'md-divider': MdDividerProps

            // FAB
            'md-fab': MdFabProps
            'md-branded-fab': MdBrandedFabProps

            // Icon
            'md-icon': MdIconProps

            // Icon buttons
            'md-icon-button': MdIconButtonProps
            'md-filled-icon-button': MdIconButtonProps
            'md-filled-tonal-icon-button': MdIconButtonProps
            'md-outlined-icon-button': MdIconButtonProps

            // List
            'md-list': MdListProps
            'md-list-item': MdListItemProps

            // Progress
            'md-circular-progress': MdProgressProps
            'md-linear-progress': MdProgressProps

            // Radio
            'md-radio': MdRadioProps

            // Select
            'md-filled-select': MdSelectProps
            'md-outlined-select': MdSelectProps
            'md-select-option': MdSelectOptionProps

            // Slider
            'md-slider': MdSliderProps

            // Switch
            'md-switch': MdSwitchProps

            // Tabs
            'md-tabs': MdTabsProps
            'md-primary-tab': MdTabProps
            'md-secondary-tab': MdTabProps

            // Text field
            'md-filled-text-field': MdTextFieldProps
            'md-outlined-text-field': MdTextFieldProps

            // Internals
            'md-focus-ring': MdFocusRingProps
            'md-ripple': MdRippleProps
            'md-elevation': MdElevationProps
        }
    }
}

export {}