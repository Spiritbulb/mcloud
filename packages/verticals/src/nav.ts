// Nav model for the merchant admin, derived from the vertical. Pure data (no
// React) so it is unit-testable and so the web app is not the only consumer.
//
// Gate on vertical.commerce, never on id === 'ngo': a future vertical must
// inherit correct behaviour without editing this file.

import type { Vertical } from './index'

export type NavSubTab = { readonly id: string; readonly label: string }

export type NavTab = {
  readonly id: string
  readonly label: string
  readonly icon: string
  readonly beta?: boolean
  readonly pro?: boolean
  readonly subTabs?: readonly NavSubTab[]
}

export type NavSection = {
  readonly id: string
  readonly label: string
  readonly tabs: readonly NavTab[]
}

/** Groups every vertical shows, in order, around the vertical-specific middle. */
const SITE: NavSection = {
  id: 'site',
  label: 'Site',
  tabs: [
    { id: 'home', label: 'Overview', icon: 'home' },
    { id: 'general', label: 'General', icon: 'storefront' },
    // One Editor: theme and content are the same job ("make my site look right").
    // Future customisation surfaces land here as rail entries, not as new nav tabs.
    { id: 'editor', label: 'Editor', icon: 'edit_note' },
  ],
}

const ADVANCED: NavSection = {
  id: 'advanced',
  label: 'Advanced',
  tabs: [
    { id: 'members', label: 'Members', icon: 'group', pro: true },
    { id: 'domain', label: 'Domain', icon: 'language', pro: true },
    {
      id: 'integrations',
      label: 'Integrations',
      icon: 'link',
      pro: true,
      subTabs: [
        { id: 'payments', label: 'Payments' },
        { id: 'notifications', label: 'Notifications' },
        { id: 'social', label: 'Socials' },
      ],
    },
  ],
}

const ACCOUNT: NavSection = {
  id: 'account',
  label: 'Account',
  tabs: [{ id: 'billing', label: 'Billing', icon: 'credit_card' }],
}

/** Commerce verticals: sell things, so they get a catalog and a commerce group. */
const CATALOG: NavSection = {
  id: 'catalog',
  label: 'Catalog',
  tabs: [
    { id: 'products', label: 'Products', icon: 'inventory_2' },
    { id: 'services', label: 'Services', icon: 'home_repair_service' },
  ],
}

const COMMERCE: NavSection = {
  id: 'commerce',
  label: 'Commerce',
  tabs: [
    { id: 'orders', label: 'Orders', icon: 'receipt_long' },
    { id: 'analytics', label: 'Analytics', icon: 'bar_chart' },
    { id: 'customers', label: 'Customers', icon: 'person', beta: true, pro: true },
    { id: 'blog', label: 'Blog', icon: 'article' },
  ],
}

/**
 * Non-commerce verticals: no catalog, no customer accounts. Donations ARE
 * orders (tagged metadata.isDonation), so the orders tab stays, relabelled.
 *
 * There is no separate Content group: content authoring is a rail entry inside
 * the Editor, because "write my mission" and "pick my colours" are one job to a
 * merchant, and splitting them across two tabs made them two.
 */
const DONATIONS: NavSection = {
  id: 'donations',
  label: 'Donations',
  tabs: [
    { id: 'orders', label: 'Donations', icon: 'volunteer_activism' },
    { id: 'analytics', label: 'Analytics', icon: 'bar_chart' },
    { id: 'blog', label: 'Blog', icon: 'article' },
  ],
}

/** The admin nav for a vertical. */
export function sectionsFor(vertical: Vertical): NavSection[] {
  return vertical.commerce
    ? [SITE, CATALOG, COMMERCE, ADVANCED, ACCOUNT]
    : [SITE, DONATIONS, ADVANCED, ACCOUNT]
}

/**
 * Every tab id any vertical can show. Keeps routing/active-tab exhaustive.
 *
 * `appearance` and `content` are no longer in any nav group, but their routes
 * still exist and are still reachable by URL. They stay listed until those pages
 * are retired, so nothing that resolves a tab id from a path falls off the type.
 */
export const ALL_TAB_IDS = [
  'home', 'general', 'appearance', 'editor',
  'products', 'services',
  'orders', 'analytics', 'customers', 'blog',
  'content',
  'members', 'domain', 'integrations',
  'billing',
] as const

export type TabId = (typeof ALL_TAB_IDS)[number]
