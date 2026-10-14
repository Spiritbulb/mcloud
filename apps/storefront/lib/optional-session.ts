// A public route that serves two audiences (shoppers, and managers who see more) asks for the
// session only to decide how much to show. On a custom domain the proxy never prepares the
// AuthKit headers, so getSession() THROWS there ("withAuth ... isn't covered by the middleware").
// For a public route that is just "nobody signed in", not a server error: the 500 it caused
// removed the payment methods from every custom-domain store's checkout.
export async function readOptionalSession<S>(read: () => Promise<S | null | undefined>): Promise<S | null> {
    try {
        return (await read()) ?? null
    } catch (err) {
        console.warn('[storefront] no readable session, treating as anonymous:', err instanceof Error ? err.message : err)
        return null
    }
}
