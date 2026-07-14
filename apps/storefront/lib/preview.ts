// lib/preview.ts
// The preview token is a HANDSHAKE: the admin mints it (apps/web) and the
// storefront verifies it (here). Both ends must run the same algorithm against
// the same secret, so the implementation moved to @mcloud/verticals/preview
// rather than being duplicated. This file stays as the storefront's import site
// so nothing here has to know where it lives.

export { signPreview, verifyPreview, isSafeCssValue } from '@mcloud/verticals/preview'
