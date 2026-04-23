// types/globals.d.ts
export { };

declare global {
    interface Window {
        gtag: (
            command: "config" | "event" | "js" | "set",
            targetId: string | Date,
            config?: Record<string, unknown>
        ) => void;
        dataLayer: unknown[];
    }
}