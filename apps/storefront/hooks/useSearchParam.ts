import { useSyncExternalStore } from 'react'

const subscribeToNothing = () => () => {}

/**
 * A query-string value, read on the client. Empty on the server and during hydration, so a cached
 * static page renders the same HTML for everyone and fills it in afterwards. Used instead of
 * useSearchParams (which forces a Suspense boundary on a static page) and instead of a state set
 * inside an effect (which lints as a cascading render).
 */
export function useSearchParam(name: string): string {
    return useSyncExternalStore(
        subscribeToNothing,
        () => new URLSearchParams(window.location.search).get(name) ?? '',
        () => '',
    )
}
