import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultZone, formatMemory, isValidHostname, osFamilyOf, plansInTier, planTier, sortZones, templatesByFamily } from './new-server-logic.ts'

const z = (id: string) => ({ id, description: id })

test('recommended zones come first in their order, then green ones, then the rest', () => {
    const sorted = sortZones([z('us-nyc1'), z('uk-lon1'), z('se-sto1'), z('nl-ams1'), z('au-syd1'), z('de-fra1')]).map((x) => x.id)
    assert.deepEqual(sorted, ['nl-ams1', 'de-fra1', 'uk-lon1', 'se-sto1', 'au-syd1', 'us-nyc1'])
})

test('Amsterdam is the default zone when offered', () => {
    assert.equal(defaultZone([z('de-fra1'), z('nl-ams1')]), 'nl-ams1')
    assert.equal(defaultZone([z('de-fra1')]), 'de-fra1')
    assert.equal(defaultZone([]), '')
})

test('plans are grouped by tier, priced only, smallest first', () => {
    const p = (name: string, core_number: number, memory_amount: number) => ({ name, core_number, memory_amount, storage_size: 25 })
    const plans = [p('STARTER-2xCPU-4GB', 2, 4096), p('STARTER-1xCPU-1GB', 1, 1024), p('PREMIUM-1xCPU-2GB', 1, 2048), p('STARTER-9xCPU-9GB', 9, 9216)]
    assert.equal(planTier('PREMIUM-1xCPU-2GB'), 'Premium')
    const names = plansInTier(plans, 'Starter', (n) => n !== 'STARTER-9xCPU-9GB').map((x) => x.name)
    assert.deepEqual(names, ['STARTER-1xCPU-1GB', 'STARTER-2xCPU-4GB'])
})

test('templates group by Linux family; others are dropped', () => {
    const t = (title: string) => ({ uuid: title, title, os: 'linux' })
    const groups = templatesByFamily([t('Ubuntu Server 24.04 LTS'), t('Windows Server 2022'), t('Debian GNU/Linux 12'), t('Ubuntu Server 22.04 LTS')])
    assert.deepEqual(groups.ubuntu?.map((x) => x.title), ['Ubuntu Server 24.04 LTS', 'Ubuntu Server 22.04 LTS'])
    assert.equal(groups.debian?.length, 1)
    assert.equal(osFamilyOf('Windows Server 2022'), null)
})

test('memory reads in GB', () => {
    assert.equal(formatMemory(1024), '1 GB')
    assert.equal(formatMemory(1536), '1.5 GB')
})

test('hostnames are validated like UpCloud does', () => {
    assert.ok(isValidHostname('api.example.com'))
    assert.ok(isValidHostname('web-1'))
    assert.ok(!isValidHostname('-web'))
    assert.ok(!isValidHostname('my server'))
    assert.ok(!isValidHostname('api..example.com'))
    assert.ok(!isValidHostname(''))
})
