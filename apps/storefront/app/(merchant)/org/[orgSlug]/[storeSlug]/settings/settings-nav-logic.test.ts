import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getVertical, sectionsFor } from '@mcloud/verticals'
import { activeNavId, findNavItem } from '@mcloud/ui/kit/nav-logic'
import { BARE_TABS, UNLISTED_LABELS, settingsPath, settingsSections, tabFromPath } from './settings-nav-logic.ts'

const shop = sectionsFor(getVertical('shop'))

test('settingsPath: the overview is the settings root, every other tab a sub-path', () => {
    assert.equal(settingsPath('acme', 'reach'), '/org/acme/reach/settings')
    assert.equal(settingsPath('acme', 'reach', 'home'), '/org/acme/reach/settings')
    assert.equal(settingsPath('acme', 'reach', 'orders'), '/org/acme/reach/settings/orders')
})

test('tabFromPath reads the first segment after /settings/', () => {
    assert.equal(tabFromPath('/org/acme/reach/settings'), 'home')
    assert.equal(tabFromPath('/org/acme/reach/settings/'), 'home')
    assert.equal(tabFromPath('/org/acme/reach/settings/orders'), 'orders')
    assert.equal(tabFromPath('/org/acme/reach/settings/integrations/payments'), 'integrations')
    assert.equal(tabFromPath('/org/acme/reach/settings/orders?status=paid'), 'orders')
})

test('every shop tab becomes a link under the store, and the URL finds it again', () => {
    const sections = settingsSections(shop, 'acme', 'reach', true)
    const items = sections.flatMap((s) => s.items)
    assert.equal(items.length, shop.flatMap((s) => s.tabs).length)
    for (const item of items) {
        assert.ok(item.href.startsWith('/org/acme/reach/settings'), item.href)
        assert.equal(findNavItem(sections, tabFromPath(item.href))?.id, item.id)
        assert.equal(activeNavId(sections, item.href), item.id)
    }
})

test('Pro badges show only to unpaid stores; Beta always shows', () => {
    const paid = settingsSections(shop, 'a', 's', true).flatMap((s) => s.items)
    const free = settingsSections(shop, 'a', 's', false).flatMap((s) => s.items)
    const badge = (items: typeof paid, id: string) => items.find((i) => i.id === id)?.badge
    assert.equal(badge(free, 'domain'), 'Pro')
    assert.equal(badge(paid, 'domain'), undefined)
    assert.equal(badge(free, 'logistics'), 'Beta')
    assert.equal(badge(paid, 'logistics'), 'Beta')
    assert.equal(badge(free, 'orders'), undefined)
})

test('unlisted and full-bleed routes are not nav items', () => {
    const sections = settingsSections(shop, 'a', 's', true)
    for (const tab of Object.keys(UNLISTED_LABELS)) assert.equal(findNavItem(sections, tab), undefined, tab)
    assert.ok(BARE_TABS.has('editor'))
    assert.ok(findNavItem(sections, 'editor'), 'the editor is in the nav')
})
