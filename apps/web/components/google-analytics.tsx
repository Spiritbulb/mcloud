"use client";
// Google Analytics 4 for the web app. Replaces the inline snippet that used to live in layout.tsx
// and components/analytics.tsx. Behaviour, and why:
//  - production only: dev and preview traffic must not land in the live property;
//  - one measurement id from lib/analytics-logic.ts (env override, production fallback);
//  - page views are sent here, once per navigation, with a sanitised URL (no tokens, codes or
//    emails), and never for admin, auth or invite pages;
//  - afterInteractive, not lazyOnload: lazy loading drops visits that bounce before idle.
import Script from "next/script";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { isTrackablePath, reportedLocation, resolveGaId } from "@/lib/analytics-logic";
import { pageView, startAnalytics } from "@/lib/analytics";

const ID = resolveGaId(process.env.NEXT_PUBLIC_GA_ID);
const ENABLED = ID !== null && process.env.NODE_ENV === "production";

export default function GoogleAnalytics() {
    const pathname = usePathname();
    const search = useSearchParams();

    useEffect(() => {
        if (!ENABLED || !ID || !isTrackablePath(pathname)) return;
        startAnalytics(ID);
        const { path, location } = reportedLocation(pathname, search.toString(), window.location.origin);
        pageView(path, location);
    }, [pathname, search]);

    if (!ENABLED || !ID) return null;
    return <Script id="ga-src" src={`https://www.googletagmanager.com/gtag/js?id=${ID}`} strategy="afterInteractive" />;
}
