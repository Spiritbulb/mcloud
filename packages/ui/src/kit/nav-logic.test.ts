import { test } from 'node:test'
import assert from 'node:assert/strict'
import { activeNavId, findNavItem, normalizePath, type ShellNavSection } from './nav-logic.ts'

const ORG: ShellNavSection[] = [
    {
        id: 'main',
        items: [
            { id: 'home', label: 'Overview', icon: 'home', href: '/org/acme' },
            { id: 'servers', label: 'Servers', icon: 'dns', href: '/org/acme/servers' },
            { id: 'billing', label: 'Billing', icon: 'credit_card', href: '/org/acme/billing' },
            { id: 'docs', label: 'Docs', icon: 'menu_book', href: 'https://mcloud.co.ke/docs', external: true },
        ],
    },
]

test('normalizePath drops query, hash and trailing slashes', () => {
    assert.equal(normalizePath('/org/acme/'), '/org/acme')
    assert.equal(normalizePath('/org/acme/stores?new=1'), '/org/acme/stores')
    assert.equal(normalizePath('/a#top'), '/a')
    assert.equal(normalizePath('/'), '/')
    assert.equal(normalizePath(''), '/')
})

test('the root item is active only when nothing more specific matches', () => {
    assert.equal(activeNavId(ORG, '/org/acme'), 'home')
    assert.equal(activeNavId(ORG, '/org/acme/'), 'home')
    assert.equal(activeNavId(ORG, '/org/acme/servers'), 'servers')
    assert.equal(activeNavId(ORG, '/org/acme/servers/new'), 'servers')
})

test('a page with its own item is never shown as the overview (the old billing bug)', () => {
    assert.equal(activeNavId(ORG, '/org/acme/billing'), 'billing')
    assert.equal(activeNavId(ORG, '/org/acme/billing?topup=1'), 'billing')
})

test('matching is by whole path segment, not by string prefix', () => {
    const s: ShellNavSection[] = [{ id: 's', items: [
        { id: 'bill', label: 'Bill', icon: 'x', href: '/a/bill' },
        { id: 'root', label: 'Root', icon: 'x', href: '/a' },
    ] }]
    assert.equal(activeNavId(s, '/a/billing'), 'root')
    assert.equal(activeNavId(s, '/a/bill/2'), 'bill')
})

test('unmatched paths use the fallback; external items never match', () => {
    assert.equal(activeNavId(ORG, '/somewhere/else'), undefined)
    assert.equal(activeNavId(ORG, '/somewhere/else', 'home'), 'home')
    assert.equal(activeNavId(ORG, 'https://mcloud.co.ke/docs'), undefined)
})

test('findNavItem looks an id up across sections', () => {
    assert.equal(findNavItem(ORG, 'billing')?.label, 'Billing')
    assert.equal(findNavItem(ORG, 'nope'), undefined)
    assert.equal(findNavItem(ORG, undefined), undefined)
})
