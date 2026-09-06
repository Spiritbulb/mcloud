// apps/web/app/org/[orgSlug]/servers/servers-table.tsx
import Link from 'next/link'
import type { UpcloudServerDetail } from '@/lib/upcloud'
import { CopyableIp } from '@/components/copy'

type ServerRow = UpcloudServerDetail

const STATE_STYLES: Record<string, string> = {
    started: 'bg-green-100 text-green-700',
    stopped: 'bg-neutral-200 text-neutral-600',
    maintenance: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
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
        <div className="overflow-hidden">
            <table className="w-full text-sm border border-[var(--md-sys-color-outline-variant)] ">
                <thead className="text-left text-xs uppercase text-[var(--md-sys-color-on-primary)] bg-[var(--md-sys-color-primary)]">
                    <tr>
                        <th className="px-4 py-2 font-medium">Title</th>
                        <th className="px-4 py-2 font-medium">Zone</th>
                        <th className="px-4 py-2 font-medium">Plan</th>
                        <th className="px-4 py-2 font-medium">State</th>
                        <th className="px-4 py-2 font-medium">IP Address</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--md-sys-color-outline-variant)]/50">
                    {servers.map((s) => (
                        <tr key={s.uuid} className="hover:bg-[var(--md-sys-color-surface-variant)] transition-colors">
                            <td className="px-4 py-3 font-medium text-[var(--md-sys-color-on-surface)]">
                                <Link href={`/org/${orgSlug}/servers/${s.uuid}`} className="hover:underline">
                                    {s.title}
                                </Link>
                            </td>
                            <td className="px-4 py-3 text-[var(--md-sys-color-on-surface-variant)]">{s.zone}</td>
                            <td className="px-4 py-3 text-[var(--md-sys-color-on-surface-variant)]">{s.plan}</td>
                            <td className="px-4 py-3">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_STYLES[s.state] ?? 'bg-neutral-100 text-neutral-600'}`}>
                                    {s.state}
                                </span>
                            </td>
                            <td className="px-4 py-3 cursor-pointer">
    {publicIp(s) ? <CopyableIp ip={publicIp(s)!} /> : '—'}
</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}