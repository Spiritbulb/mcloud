import { BrandLoader } from '@mcloud/ui/kit/brand-loader'

// Covers the org layouts (session + org lookup) on the way into /org/*, before any shell is on screen.
export default function Loading() {
    return <BrandLoader fullscreen />
}
