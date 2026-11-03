import { BrandLoader } from '@mcloud/ui/kit/brand-loader'

// Covers the org and store-settings layouts (session, picker data, store access) before the
// settings shell is on screen. Moving between settings pages uses settings/loading.tsx instead.
export default function Loading() {
    return <BrandLoader fullscreen />
}
