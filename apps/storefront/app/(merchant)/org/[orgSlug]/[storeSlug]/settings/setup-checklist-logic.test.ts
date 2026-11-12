import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DOC_PATHS } from '../../../../../../lib/help-links.ts'
import {
    checklistProgress,
    checklistSteps,
    mergeChecklistState,
    parseChecklistState,
    readChecklistState,
    runChecklistSave,
    stepLabels,
    type ChecklistInput,
} from './setup-checklist-logic.ts'

const empty: ChecklistInput = {
    productCount: 0,
    campaignCount: 0,
    paymentsEnabled: false,
    deliveryZoneCount: 0,
    hasLogo: false,
    orderCount: 0,
    customDomainSet: false,
    linkShared: false,
}

test('a shop gets product, payments, delivery, logo and share steps', () => {
    assert.deepEqual(checklistSteps(empty, true).map((s) => s.id), ['product', 'payments', 'delivery', 'logo', 'share'])
})

test('a non-profit gets campaign, payments, logo, share and an optional domain step', () => {
    const steps = checklistSteps(empty, false)
    assert.deepEqual(steps.map((s) => s.id), ['campaign', 'payments', 'logo', 'share', 'domain'])
    assert.deepEqual(steps.filter((s) => s.optional).map((s) => s.id), ['domain'])
})

test('steps tick from the store data', () => {
    const done = (input: Partial<ChecklistInput>, commerce = true) =>
        checklistSteps({ ...empty, ...input }, commerce).filter((s) => s.done).map((s) => s.id)
    assert.deepEqual(done({ productCount: 2 }), ['product'])
    assert.deepEqual(done({ paymentsEnabled: true }), ['payments'])
    assert.deepEqual(done({ deliveryZoneCount: 1 }), ['delivery'])
    assert.deepEqual(done({ hasLogo: true }), ['logo'])
    assert.deepEqual(done({ campaignCount: 1 }, false), ['campaign'])
    assert.deepEqual(done({ customDomainSet: true }, false), ['domain'])
})

test('sharing counts as done after a first order or a copied link', () => {
    const share = (input: Partial<ChecklistInput>) => checklistSteps({ ...empty, ...input }, true).find((s) => s.id === 'share')!.done
    assert.equal(share({}), false)
    assert.equal(share({ orderCount: 1 }), true)
    assert.equal(share({ linkShared: true }), true)
})

test('progress leaves optional steps out', () => {
    const all = { ...empty, campaignCount: 1, paymentsEnabled: true, hasLogo: true, linkShared: true }
    assert.deepEqual(checklistProgress(checklistSteps(all, false)), { done: 4, total: 4, complete: true })
    assert.deepEqual(checklistProgress(checklistSteps(empty, true)), { done: 0, total: 5, complete: false })
})

test('every step links to a settings page or action and a real doc', () => {
    for (const commerce of [true, false]) {
        for (const s of checklistSteps(empty, commerce)) {
            assert.ok(DOC_PATHS.includes(s.docPath), `${s.id}: ${s.docPath}`)
            assert.ok(s.id === 'share' ? s.tab === null : typeof s.tab === 'string', s.id)
            assert.ok(s.title && s.description, s.id)
        }
    }
})

test('the wording never says NGO', () => {
    for (const s of [...checklistSteps(empty, true), ...checklistSteps(empty, false)]) {
        assert.doesNotMatch(`${s.title} ${s.description}`, /\bNGO/)
    }
})

test('checklist state reads safely from any settings value', () => {
    assert.deepEqual(readChecklistState(null), {})
    assert.deepEqual(readChecklistState({ setup_checklist: 'x' }), {})
    assert.deepEqual(readChecklistState({ setup_checklist: { hidden: true, link_shared: 'yes' } }), { hidden: true })
})

test('merging keeps the other settings and earlier flags', () => {
    assert.deepEqual(mergeChecklistState(null, { hidden: true }), { setup_checklist: { hidden: true } })
    const settings = { themeId: 'classic-2', setup_checklist: { link_shared: true } }
    assert.deepEqual(mergeChecklistState(settings, { hidden: true }), {
        themeId: 'classic-2',
        setup_checklist: { link_shared: true, hidden: true },
    })
})

test('each step has a screen-reader status and distinct link names', () => {
    const [product] = checklistSteps({ ...empty, productCount: 1 }, true)
    const [, payments] = checklistSteps(empty, true)
    assert.equal(stepLabels(product).status, 'Done')
    assert.equal(stepLabels(payments).status, 'To do')
    assert.equal(stepLabels(payments).start, 'Start: Set up payments')
    assert.equal(stepLabels(payments).learn, 'Learn how: Set up payments (opens in a new tab)')
})

test('hiding reports an error whether the save fails or throws', async () => {
    assert.equal(await runChecklistSave(async () => ({ ok: true })), null)
    assert.equal(await runChecklistSave(async () => ({ ok: false, error: 'No permission' })), 'No permission')
    assert.match(String(await runChecklistSave(async () => { throw new Error('network') })), /Could not save/)
})

test('the overview hands over the stored flags themselves, and they are read as such', () => {
    // getStoreOverview returns settings.setup_checklist (the inner object), not the whole settings.
    assert.deepEqual(parseChecklistState({ link_shared: true }), { link_shared: true })
    assert.deepEqual(parseChecklistState({ hidden: true, link_shared: 'yes' }), { hidden: true })
    assert.deepEqual(parseChecklistState(null), {})
})
