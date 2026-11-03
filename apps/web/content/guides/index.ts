// Loaders for guide bodies, keyed by slug. Listed explicitly (not a template-string
// import) so both bundlers resolve them. Metadata lives in lib/guides.ts;
// guides.test.ts checks that every guide has a loader and an .mdx file.

import type { MDXContent } from "mdx/types"

export const GUIDE_BODIES: Record<string, () => Promise<{ default: MDXContent }>> = {
    "accept-mpesa-payments-on-your-website": () => import("./accept-mpesa-payments-on-your-website.mdx"),
    "start-an-online-shop-in-kenya": () => import("./start-an-online-shop-in-kenya.mdx"),
    "custom-domain-for-your-business-website": () => import("./custom-domain-for-your-business-website.mdx"),
    "collect-donations-online-for-your-ngo": () => import("./collect-donations-online-for-your-ngo.mdx"),
}
