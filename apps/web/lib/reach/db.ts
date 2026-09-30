import { createClient } from '@mcloud/db/server'

// One place to swap the client. The reach_* tables have RLS on with no policies,
// so this must be the service-role client (the webhook has no user session at all).
// Typed as any because the reach_* tables aren't in the generated types.
export async function reachDb(): Promise<any> {
    return createClient()
}