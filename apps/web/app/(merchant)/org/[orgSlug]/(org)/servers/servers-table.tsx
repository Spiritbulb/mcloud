// apps/web/app/org/[orgSlug]/servers/servers-table.tsx
import Link from 'next/link'
import { Badge, type BadgeTone } from '@mcloud/ui/kit/badge'
import { Table, Td, Th, Tr } from '@mcloud/ui/kit/table'
import type { UpcloudServerDetail } from '@/lib/upcloud'
import { CopyableIp } from '@/components/copy'

type ServerRow = UpcloudServerDetail

const STATE_TONE: Record<string, BadgeTone> = {
    started: 'success',
    stopped: 'neutral',
    maintenance: 'warning',
    error: 'danger',
}

function publicIp(server: ServerRow) {
    return server.ip_addresses?.ip_address.find((ip) => ip.access === 'public' && ip.family === 'IPv4')?.address
}

export default function ServersTable({
    orgSlug,
    servers,
}: {
    orgSlug: string
    servers: ServerRow[]
    canManage: boolean
}) {
    return (
        <Table>
            <thead>
                <tr>
                    <Th>Server</Th>
                    <Th>Zone</Th>
                    <Th>Plan</Th>
                    <Th>State</Th>
                    <Th>IP address</Th>
                </tr>
            </thead>
            <tbody>
                {servers.map((s) => {
                    const ip = publicIp(s)
                    return (
                        <Tr key={s.uuid}>
                            <Td>
                                <Link href={`/org/${orgSlug}/servers/${s.uuid}`} className="font-medium hover:underline">
                                    {s.title}
                                </Link>
                            </Td>
                            <Td label="Zone" muted>{s.zone}</Td>
                            <Td label="Plan" muted>{s.plan}</Td>
                            <Td label="State"><Badge tone={STATE_TONE[s.state] ?? 'neutral'}>{s.state}</Badge></Td>
                            <Td label="IP address">{ip ? <CopyableIp ip={ip} /> : '—'}</Td>
                        </Tr>
                    )
                })}
            </tbody>
        </Table>
    )
}
