// lib/liquid.ts — kept as a stable import path; the engine now lives in the
// shared @mcloud/liquid package so storefront and web share one engine + themes.
export { engine, renderTemplate, themeFiles } from '@mcloud/liquid'
