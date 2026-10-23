import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dnsRecordFor, isValidDomain, normalizeDomain, subdomainOf } from './custom-domain.ts'

test('normalizes what merchants paste', () => {
    assert.equal(normalizeDomain('  https://Shop.Example.com/ '), 'shop.example.com')
    assert.equal(normalizeDomain('http://example.com:443/path?q=1'), 'example.com')
    assert.equal(normalizeDomain('example.com.'), 'example.com')
})

test('accepts hostnames and rejects everything else', () => {
    assert.ok(isValidDomain('example.com'))
    assert.ok(isValidDomain('shop.my-store.co.ke'))
    assert.ok(!isValidDomain('localhost'))
    assert.ok(!isValidDomain('my store.com'))
    assert.ok(!isValidDomain('*.example.com'))
    assert.ok(!isValidDomain('-bad.example.com'))
    assert.ok(!isValidDomain('example.c0m'))
    assert.ok(!isValidDomain(''))
})

test('finds the subdomain, including under two-level suffixes', () => {
    assert.equal(subdomainOf('locdessence.com'), '')
    assert.equal(subdomainOf('shop.example.com'), 'shop')
    assert.equal(subdomainOf('a.b.example.com'), 'a.b')
    assert.equal(subdomainOf('mystore.co.ke'), '')
    assert.equal(subdomainOf('shop.mystore.co.ke'), 'shop')
})

test('apex domains get an A record, subdomains a CNAME', () => {
    assert.deepEqual(dnsRecordFor('locdessence.com'), { type: 'A', name: '@', value: '76.76.21.21' })
    assert.deepEqual(dnsRecordFor('www.locdessence.com'), { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com' })
    assert.deepEqual(dnsRecordFor('shop.mystore.co.ke'), { type: 'CNAME', name: 'shop', value: 'cname.vercel-dns.com' })
})
