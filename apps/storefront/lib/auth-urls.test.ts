import test from 'node:test'
import assert from 'node:assert/strict'
import { loginHref, signupHref, safeNext, authOrigin } from './auth-urls'

process.env.NEXT_PUBLIC_WEB_ORIGIN = 'https://mcloud.co.ke'
delete process.env.NEXT_PUBLIC_AUTH_ORIGIN

test('login and signup go to the web app with an encoded return path', () => {
    assert.equal(loginHref('/start'), 'https://mcloud.co.ke/auth/login?returnTo=%2Fstart')
    assert.equal(signupHref('/org/a/b/settings?x=1'), 'https://mcloud.co.ke/auth/sign-up?returnTo=%2Forg%2Fa%2Fb%2Fsettings%3Fx%3D1')
})

test('return paths that could leave the site are replaced', () => {
    for (const bad of ['https://evil.com', '//evil.com', '/\\evil.com', '/%5Cevil.com', '/%2F%2Fevil.com', undefined, 42]) {
        assert.equal(safeNext(bad), '/start', String(bad))
    }
    assert.equal(loginHref('//evil.com'), 'https://mcloud.co.ke/auth/login?returnTo=%2Fstart')
})

test('NEXT_PUBLIC_AUTH_ORIGIN moves sign-in off the web app', () => {
    process.env.NEXT_PUBLIC_AUTH_ORIGIN = 'https://sites.example/anything'
    try {
        assert.equal(authOrigin(), 'https://sites.example')
        assert.equal(loginHref(), 'https://sites.example/auth/login?returnTo=%2Fstart')
    } finally {
        delete process.env.NEXT_PUBLIC_AUTH_ORIGIN
    }
})
