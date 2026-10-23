import { Badge, type BadgeTone } from '@mcloud/ui/kit/badge'

const PLAN_TONE: Record<string, BadgeTone> = { pro: 'info', hobby: 'success' }

/** A store's plan as a badge, the same on Overview, Stores and Billing. Unknown or missing is Free. */
export function PlanBadge({ plan }: { plan: string | null | undefined }) {
    const key = plan === 'pro' || plan === 'hobby' ? plan : 'free'
    return <Badge tone={PLAN_TONE[key] ?? 'neutral'}>{key[0].toUpperCase() + key.slice(1)}</Badge>
}
