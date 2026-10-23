// types/globals.d.ts
export { };

declare global {
    interface Window {
        /** Pushes its `arguments` onto dataLayer (see lib/analytics.ts). */
        gtag: (...args: unknown[]) => void;
        dataLayer: unknown[];
    }
}
