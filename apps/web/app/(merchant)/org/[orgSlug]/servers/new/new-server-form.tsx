'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPlanEurPrice } from '@/lib/pricing-dc'
import { cn } from '@mcloud/ui/utils'

type Zone = {
  id: string
  description: string
}

type Plan = {
  name: string
  core_number: number
  memory_amount: number
  storage_size: number
}

type Template = {
  uuid: string
  title: string
  os: string
}

type PlanTier = 'Starter' | 'Premium'

type ZoneMeta = {
  country: string
  city: string
  flag: string
  region?: string
}

const DEFAULT_ZONE = 'nl-ams1'
const KENYA_RECOMMENDED_ZONES = ['nl-ams1', 'de-fra1', 'uk-lon1'] as const

const GREEN_ZONES = new Set([
  'de-fra1',
  'es-mad1',
  'fi-hel1',
  'fi-hel2',
  'dk-cph1',
  'nl-ams1',
  'no-svg1',
  'pl-waw1',
  'se-sto1',
  'sg-sin1',
  'uk-lon1',
])

const ZONE_META: Record<string, ZoneMeta> = {
  'au-syd1': {
    flag: '🇦🇺',
    country: 'Australia',
    city: 'Sydney',
    region: 'Asia-Pacific',
  },
  'de-fra1': {
    flag: '🇩🇪',
    country: 'Germany',
    city: 'Frankfurt',
    region: 'Europe',
  },
  'dk-cph1': {
    flag: '🇩🇰',
    country: 'Denmark',
    city: 'Copenhagen',
    region: 'Europe',
  },
  'es-mad1': {
    flag: '🇪🇸',
    country: 'Spain',
    city: 'Madrid',
    region: 'Europe',
  },
  'fi-hel1': {
    flag: '🇫🇮',
    country: 'Finland',
    city: 'Helsinki',
    region: 'Europe',
  },
  'fi-hel2': {
    flag: '🇫🇮',
    country: 'Finland',
    city: 'Helsinki',
    region: 'Europe',
  },
  'nl-ams1': {
    flag: '🇳🇱',
    country: 'Netherlands',
    city: 'Amsterdam',
    region: 'Europe',
  },
  'no-svg1': {
    flag: '🇳🇴',
    country: 'Norway',
    city: 'Stavanger',
    region: 'Europe',
  },
  'pl-waw1': {
    flag: '🇵🇱',
    country: 'Poland',
    city: 'Warsaw',
    region: 'Europe',
  },
  'se-sto1': {
    flag: '🇸🇪',
    country: 'Sweden',
    city: 'Stockholm',
    region: 'Europe',
  },
  'sg-sin1': {
    flag: '🇸🇬',
    country: 'Singapore',
    city: 'Singapore',
    region: 'Asia-Pacific',
  },
  'uk-lon1': {
    flag: '🇬🇧',
    country: 'United Kingdom',
    city: 'London',
    region: 'Europe',
  },
  'us-chi1': {
    flag: '🇺🇸',
    country: 'United States',
    city: 'Chicago',
    region: 'North America',
  },
  'us-nyc1': {
    flag: '🇺🇸',
    country: 'United States',
    city: 'New York',
    region: 'North America',
  },
  'us-sjo1': {
    flag: '🇺🇸',
    country: 'United States',
    city: 'San Jose',
    region: 'North America',
  },
}



const OS_FAMILIES = [
  {
    key: 'ubuntu',
    label: 'Ubuntu',
    recommended: true,
    icon: '/ubuntu-logo.png',
  },
  {
    key: 'debian',
    label: 'Debian',
    recommended: false,
    icon: '/debian-logo.png',
  },
  {
    key: 'fedora',
    label: 'Fedora',
    recommended: false,
    icon: '/fedora-logo.png',
  },
  {
    key: 'centos',
    label: 'CentOS',
    recommended: false,
    icon: '/centos-logo.png',
  },
  {
    key: 'rocky',
    label: 'Rocky Linux',
    recommended: false,
    icon: '/Rocky-Linux-logo.svg',
  },
  {
    key: 'almalinux',
    label: 'AlmaLinux',
    recommended: false,
    icon: '/almalinux-logo.png',
  },
] as const

const LINUX_KEYWORDS = [
  'ubuntu',
  'debian',
  'fedora',
  'centos',
  'rocky',
  'almalinux',
]

function planTier(name: string): PlanTier | 'Other' {
  if (name.startsWith('PREMIUM-')) return 'Premium'
  if (name.startsWith('STARTER-')) return 'Starter'
  return 'Other'
}

function osFamilyOf(title: string) {
  const normalizedTitle = title.toLowerCase()

  return (
    OS_FAMILIES.find((family) => normalizedTitle.includes(family.key))?.key ??
    null
  )
}

function formatMemory(memoryInMb: number) {
  const memoryInGb = memoryInMb / 1024

  return `${memoryInGb.toFixed(memoryInMb % 1024 === 0 ? 0 : 1)} GB`
}

function formatKes(amount?: number) {
  if (!amount) return '—'

  return `KSh ${amount.toLocaleString()}`
}

function planUseCase(plan: Plan) {
  const memoryInGb = plan.memory_amount / 1024

  if (plan.core_number <= 1 && memoryInGb <= 1) {
    return 'Small sites, test environments, and bots'
  }

  if (plan.core_number <= 2 && memoryInGb <= 4) {
    return 'Production websites, APIs, and business apps'
  }

  if (plan.core_number <= 4 && memoryInGb <= 8) {
    return 'Growing applications, workers, and databases'
  }

  return 'Demanding workloads and high-traffic services'
}

function MSO({
  icon,
  className,
}: {
  icon: string
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'material-symbols-outlined select-none leading-none',
        className,
      )}
    >
      {icon}
    </span>
  )
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--md-sys-color-surface-variant)]">
        <MSO
          icon={icon}
          className="text-[15px] text-[var(--md-sys-color-on-surface-variant)]"
        />
      </span>

      <div className="min-w-0">
        <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
          {label}
        </p>
        <p className="truncate text-[13px] font-medium text-[var(--md-sys-color-on-surface)]">
          {value}
        </p>
      </div>
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string
  title: string
  description?: string
  aside?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--md-sys-color-on-surface)]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--md-sys-color-on-surface-variant)]">
            {description}
          </p>
        )}
      </div>

      {aside}
    </div>
  )
}

export default function NewServerForm({ orgSlug }: { orgSlug: string }) {
  const router = useRouter()

  const [zones, setZones] = useState<Zone[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [kesPrices, setKesPrices] = useState<Record<string, number>>({})

  const [loadingOptions, setLoadingOptions] = useState(true)
  const [optionsError, setOptionsError] = useState('')

  const [title, setTitle] = useState('')
  const [hostname, setHostname] = useState('')
  const [zone, setZone] = useState('')
  const [planTierTab, setPlanTierTab] = useState<PlanTier>('Starter')
  const [plan, setPlan] = useState('')
  const [osFamily, setOsFamily] = useState<string | null>(null)
  const [templateUuid, setTemplateUuid] = useState('')

  const [showAllLocations, setShowAllLocations] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [revealKey, setRevealKey] = useState<{
    key: string
    hostname: string
  } | null>(null)

  const [copied, setCopied] = useState(false)
  const [copiedSshCommand, setCopiedSshCommand] = useState(false)
  const TIER_META: Record<
  PlanTier,
  {
    description: string
    startingPrice: string
    icon: string
  }
> = {
  Starter: {
    description: 'For sites, APIs, bots, and development workloads',
    startingPrice: formatKes(kesPrices['STARTER-1xCPU-1GB'] || 0) + ' /mo',
    icon: 'rocket_launch',
  },
  Premium: {
    description: 'For growing production workloads and databases',
    startingPrice: formatKes(kesPrices['PREMIUM-1xCPU-1GB'] || 0) + ' /mo',
    icon: 'bolt',
  },
}

  const osTemplates = useMemo(
    () =>
      templates.filter((template) =>
        LINUX_KEYWORDS.some((keyword) =>
          template.title.toLowerCase().includes(keyword),
        ),
      ),
    [templates],
  )

  const templatesByFamily = useMemo(() => {
    const groups: Record<string, Template[]> = {}

    for (const template of osTemplates) {
      const family = osFamilyOf(template.title)

      if (!family) continue

      groups[family] = groups[family] ?? []
      groups[family].push(template)
    }

    return groups
  }, [osTemplates])

  const versionsForFamily = useMemo(() => {
    if (!osFamily) return []

    return templatesByFamily[osFamily] ?? []
  }, [osFamily, templatesByFamily])

  const sortedZones = useMemo(() => {
    return [...zones].sort((a, b) => {
      const aRecommendedIndex = KENYA_RECOMMENDED_ZONES.indexOf(
        a.id as (typeof KENYA_RECOMMENDED_ZONES)[number],
      )
      const bRecommendedIndex = KENYA_RECOMMENDED_ZONES.indexOf(
        b.id as (typeof KENYA_RECOMMENDED_ZONES)[number],
      )

      const aIsRecommended = aRecommendedIndex !== -1
      const bIsRecommended = bRecommendedIndex !== -1

      if (aIsRecommended && bIsRecommended) {
        return aRecommendedIndex - bRecommendedIndex
      }

      if (aIsRecommended) return -1
      if (bIsRecommended) return 1

      const greenDifference =
        Number(GREEN_ZONES.has(b.id)) - Number(GREEN_ZONES.has(a.id))

      if (greenDifference !== 0) return greenDifference

      return a.id.localeCompare(b.id)
    })
  }, [zones])

  const recommendedZones = useMemo(
    () =>
      sortedZones.filter((currentZone) =>
        KENYA_RECOMMENDED_ZONES.includes(
          currentZone.id as (typeof KENYA_RECOMMENDED_ZONES)[number],
        ),
      ),
    [sortedZones],
  )

  const otherZones = useMemo(
    () =>
      sortedZones.filter(
        (currentZone) =>
          !KENYA_RECOMMENDED_ZONES.includes(
            currentZone.id as (typeof KENYA_RECOMMENDED_ZONES)[number],
          ),
      ),
    [sortedZones],
  )

  const plansInTab = useMemo(() => {
    return plans
      .filter((currentPlan) => planTier(currentPlan.name) === planTierTab)
      .filter((currentPlan) => getPlanEurPrice(currentPlan.name) !== null)
      .sort(
        (a, b) =>
          a.core_number - b.core_number ||
          a.memory_amount - b.memory_amount ||
          a.storage_size - b.storage_size,
      )
  }, [plans, planTierTab])

  const selectedZone = useMemo(
    () => zones.find((currentZone) => currentZone.id === zone),
    [zone, zones],
  )

  const selectedZoneMeta = zone ? ZONE_META[zone] : undefined

  const selectedPlan = useMemo(
    () => plans.find((currentPlan) => currentPlan.name === plan),
    [plan, plans],
  )

  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => template.uuid === templateUuid),
    [templateUuid, templates],
  )

  const derivedStorage = selectedPlan?.storage_size ?? 0
  const monthlyPrice = selectedPlan ? kesPrices[selectedPlan.name] : undefined

  const formIsComplete = Boolean(
    title && hostname && zone && plan && templateUuid,
  )

  useEffect(() => {
    const controller = new AbortController()

    async function loadOptions() {
      try {
        const [zonesResponse, plansResponse, templatesResponse, pricesResponse] =
          await Promise.all([
            fetch('/api/upcloud/zones', { signal: controller.signal }),
            fetch('/api/upcloud/plans', { signal: controller.signal }),
            fetch('/api/upcloud/templates', { signal: controller.signal }),
            fetch('/api/upcloud/plans/kes', { signal: controller.signal }),
          ])

        if (
          !zonesResponse.ok ||
          !plansResponse.ok ||
          !templatesResponse.ok ||
          !pricesResponse.ok
        ) {
          throw new Error('Failed to load creation options')
        }

        const [zonesData, plansData, templatesData, pricesData] =
          await Promise.all([
            zonesResponse.json(),
            plansResponse.json(),
            templatesResponse.json(),
            pricesResponse.json(),
          ])

        setZones(zonesData.zones ?? [])
        setPlans(plansData.plans ?? [])
        setTemplates(templatesData.templates ?? [])
        setKesPrices(pricesData.prices ?? {})
      } catch (caughtError) {
        if (
          caughtError instanceof DOMException &&
          caughtError.name === 'AbortError'
        ) {
          return
        }

        setOptionsError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Failed to load creation options',
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoadingOptions(false)
        }
      }
    }

    void loadOptions()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (zone || !zones.length) return

    if (zones.some((currentZone) => currentZone.id === DEFAULT_ZONE)) {
      setZone(DEFAULT_ZONE)
      return
    }

    setZone(zones[0].id)
  }, [zone, zones])

  useEffect(() => {
    if (osFamily || !templatesByFamily.ubuntu?.length) return

    const ubuntuTemplate = templatesByFamily.ubuntu[0]

    setOsFamily('ubuntu')
    setTemplateUuid(ubuntuTemplate.uuid)
  }, [osFamily, templatesByFamily])

  useEffect(() => {
    if (!plan) return

    const planStillExists = plansInTab.some(
      (currentPlan) => currentPlan.name === plan,
    )

    if (!planStillExists) {
      setPlan('')
    }
  }, [plan, plansInTab])

  function selectOsFamily(family: string) {
    const firstTemplate = templatesByFamily[family]?.[0]

    setOsFamily(family)

    if (firstTemplate) {
      setTemplateUuid(firstTemplate.uuid)
    }
  }

  function selectPlanTier(tier: PlanTier) {
    setPlanTierTab(tier)
    setPlan('')
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submitting) return

    if (!formIsComplete) {
      setError('Complete all required server settings before creating the server.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/org/${orgSlug}/servers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          hostname,
          zone,
          plan,
          templateUuid,
          storageSize: derivedStorage,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to create server')
      }

      setRevealKey({
        key: data.privateKey,
        hostname: data.server.hostname,
      })
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to create server',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function downloadKey() {
    if (!revealKey) return

    const blob = new Blob([revealKey.key], {
      type: 'text/plain',
    })

    const blobUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = blobUrl
    anchor.download = `${revealKey.hostname}.pem`
    anchor.click()

    URL.revokeObjectURL(blobUrl)
  }

  async function copyKey() {
    if (!revealKey) return

    await navigator.clipboard.writeText(revealKey.key)

    setCopied(true)

    window.setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  async function copySshCommand() {
    if (!revealKey) return

    await navigator.clipboard.writeText(`ssh root@${revealKey.hostname}`)

    setCopiedSshCommand(true)

    window.setTimeout(() => {
      setCopiedSshCommand(false)
    }, 2000)
  }

  if (revealKey) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="overflow-hidden rounded-3xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] shadow-sm">
          <div className="border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-primary-container)] px-6 py-7 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-sm">
              <MSO icon="key" className="text-[24px]" />
            </div>

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--md-sys-color-on-primary-container)]">
              Server created
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--md-sys-color-on-primary-container)]">
              Save your private key
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-[var(--md-sys-color-on-primary-container)]/80">
              This private key is shown only once. Download it before you
              continue so you can access your server securely.
            </p>
          </div>

          <div className="space-y-5 p-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12px] leading-relaxed text-amber-900">
              <div className="flex items-start gap-2">
                <MSO icon="warning" className="mt-0.5 text-[17px]" />
                <p>
                  Store this key in a password manager or secure local folder.
                  It cannot be displayed again after you leave this page.
                </p>
              </div>
            </div>

            <pre className="max-h-56 overflow-auto rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)] p-4 text-[11px] leading-relaxed whitespace-pre-wrap break-all text-[var(--md-sys-color-on-surface)]">
              {revealKey.key}
            </pre>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={downloadKey}
                className="flex items-center justify-center gap-2 rounded-xl bg-[var(--md-sys-color-primary)] px-4 py-3 text-[13px] font-semibold text-[var(--md-sys-color-on-primary)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:ring-offset-2"
              >
                <MSO icon="download" className="text-[17px]" />
                Download .pem key
              </button>

              <button
                type="button"
                onClick={copyKey}
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] px-4 py-3 text-[13px] font-medium text-[var(--md-sys-color-on-surface)] transition-colors hover:bg-[var(--md-sys-color-surface-variant)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:ring-offset-2"
              >
                <MSO
                  icon={copied ? 'check' : 'content_copy'}
                  className="text-[17px]"
                />
                {copied ? 'Key copied' : 'Copy private key'}
              </button>
            </div>

            <div className="rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--md-sys-color-on-surface-variant)]">
                    Connect with SSH
                  </p>
                  <code className="mt-2 block text-[13px] text-[var(--md-sys-color-on-surface)]">
                    ssh root@{revealKey.hostname}
                  </code>
                </div>

                <button
                  type="button"
                  onClick={copySshCommand}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[var(--md-sys-color-primary)] transition-colors hover:bg-[var(--md-sys-color-primary-container)]"
                >
                  <MSO
                    icon={copiedSshCommand ? 'check' : 'content_copy'}
                    className="text-[15px]"
                  />
                  {copiedSshCommand ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/org/${orgSlug}/servers`)}
              className="w-full rounded-xl px-4 py-2.5 text-center text-[13px] font-medium text-[var(--md-sys-color-on-surface-variant)] transition-colors hover:bg-[var(--md-sys-color-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]"
            >
              I have saved my key — continue to servers
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loadingOptions) {
    return (
      <div className="mx-auto flex min-h-[360px] max-w-md flex-col items-center justify-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--md-sys-color-primary-container)]">
          <MSO
            icon="progress_activity"
            className="animate-spin text-[24px] text-[var(--md-sys-color-primary)]"
          />
        </span>
        <p className="mt-4 text-sm font-medium text-[var(--md-sys-color-on-surface)]">
          Preparing server options
        </p>
        <p className="mt-1 text-[13px] text-[var(--md-sys-color-on-surface-variant)]">
          Loading locations, plans, and operating systems…
        </p>
      </div>
    )
  }

  if (optionsError) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
          <MSO icon="error" className="text-[21px] text-red-700" />
        </span>
        <h2 className="mt-3 text-sm font-semibold text-red-900">
          We could not load server options
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-red-700">
          {optionsError}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-red-700 px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-6xl pb-28 lg:pb-8"
    >

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-10">
          <section className="rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-5 sm:p-6">
            <SectionHeading
              eyebrow="01 · Server details"
              title="Name your server"
              description="Use a recognizable title for your team and a hostname that you will use to connect."
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="server-title"
                  className="mb-1.5 block text-[13px] font-medium text-[var(--md-sys-color-on-surface)]"
                >
                  Server title
                </label>

                <input
                  id="server-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  placeholder="Production API"
                  autoComplete="off"
                  className="w-full rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] px-3.5 py-2.5 text-[14px] text-[var(--md-sys-color-on-surface)] outline-none transition-colors placeholder:text-[var(--md-sys-color-on-surface-variant)]/70 focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15"
                />

                <p className="mt-1.5 text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                  Visible to members of this organisation.
                </p>
              </div>

              <div>
                <label
                  htmlFor="server-hostname"
                  className="mb-1.5 block text-[13px] font-medium text-[var(--md-sys-color-on-surface)]"
                >
                  Hostname
                </label>

                <input
                  id="server-hostname"
                  value={hostname}
                  onChange={(event) => setHostname(event.target.value)}
                  required
                  placeholder="api.example.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] px-3.5 py-2.5 text-[14px] text-[var(--md-sys-color-on-surface)] outline-none transition-colors placeholder:text-[var(--md-sys-color-on-surface-variant)]/70 focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15"
                />

                <p className="mt-1.5 text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                  For example, <code>api.example.com</code>.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-5 sm:p-6">
            <SectionHeading
              eyebrow="02 · Location"
              title="Choose where your server runs"
              description="Start with the closest recommended region for Kenya, or select another location based on your customers, services, or compliance needs."
              aside={
                <span className="hidden items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700 sm:flex">
                  <MSO icon="eco" className="text-[14px]" />
                  Green
                </span>
              }
            />

            <div className="mt-6">
              <div className="grid gap-3 sm:grid-cols-3">
                {recommendedZones.map((currentZone) => {
                  const meta = ZONE_META[currentZone.id]
                  const isSelected = zone === currentZone.id
                  const isKenyaDefault = currentZone.id === DEFAULT_ZONE
                  const isFrankfurt = currentZone.id === 'de-fra1'

                  return (
                    <button
                      key={currentZone.id}
                      type="button"
                      onClick={() => setZone(currentZone.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        'relative min-h-[144px] rounded-2xl border p-4 text-left transition-all',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:ring-offset-2',
                        isSelected
                          ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary-container)] shadow-sm'
                          : 'border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] hover:-translate-y-0.5 hover:border-[var(--md-sys-color-primary)]/60 hover:shadow-sm',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-2xl leading-none">
                          {meta?.flag ?? '🌍'}
                        </span>

                        <span
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-full border-2',
                            isSelected
                              ? 'border-[var(--md-sys-color-primary)]'
                              : 'border-[var(--md-sys-color-outline-variant)]',
                          )}
                        >
                          {isSelected && (
                            <span className="h-2.5 w-2.5 rounded-full bg-[var(--md-sys-color-primary)]" />
                          )}
                        </span>
                      </div>

                      <p className="mt-4 text-sm font-semibold text-[var(--md-sys-color-on-surface)]">
                        {meta?.city ?? currentZone.description}
                      </p>

                      <p className="mt-0.5 text-[12px] text-[var(--md-sys-color-on-surface-variant)]">
                        {meta?.country ?? currentZone.id.toUpperCase()}
                      </p>

                      <div className="mt-3">
                        {isKenyaDefault ? (
                          <span className="inline-flex rounded-full bg-[var(--md-sys-color-primary)] px-2 py-1 text-[10px] font-semibold text-[var(--md-sys-color-on-primary)]">
                            Recommended for Kenya
                          </span>
                        ) : isFrankfurt ? (
                          <span className="inline-flex rounded-full bg-[var(--md-sys-color-secondary-container)] px-2 py-1 text-[10px] font-semibold text-[var(--md-sys-color-on-secondary-container)]">
                            Fast alternative
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-[var(--md-sys-color-surface-variant)] px-2 py-1 text-[10px] font-medium text-[var(--md-sys-color-on-surface-variant)]">
                            Europe option
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 rounded-xl bg-[var(--md-sys-color-surface-variant)]/60 p-3.5">
                <div className="flex items-start gap-2.5">
                  <MSO
                    icon="info"
                    className="mt-0.5 text-[17px] text-[var(--md-sys-color-primary)]"
                  />
                  <p className="text-[12px] leading-relaxed text-[var(--md-sys-color-on-surface-variant)]">
                    Amsterdam is the recommended default for Kenyan workloads.
                    Frankfurt is a strong alternative and can be comparable for
                    some ISP routes. Actual latency depends on the network your
                    users use.
                  </p>
                </div>
              </div>

              {otherZones.length > 0 && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowAllLocations((current) => !current)}
                    aria-expanded={showAllLocations}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-[var(--md-sys-color-primary)] transition-colors hover:bg-[var(--md-sys-color-primary-container)]"
                  >
                    <MSO
                      icon={
                        showAllLocations ? 'expand_less' : 'expand_more'
                      }
                      className="text-[17px]"
                    />
                    {showAllLocations
                      ? 'Hide other locations'
                      : `Show all ${otherZones.length} other locations`}
                  </button>

                  {showAllLocations && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {otherZones.map((currentZone) => {
                        const meta = ZONE_META[currentZone.id]
                        const isSelected = zone === currentZone.id
                        const isGreen = GREEN_ZONES.has(currentZone.id)

                        return (
                          <button
                            key={currentZone.id}
                            type="button"
                            onClick={() => setZone(currentZone.id)}
                            aria-pressed={isSelected}
                            className={cn(
                              'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:ring-offset-2',
                              isSelected
                                ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary-container)]'
                                : 'border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)]/60 hover:bg-[var(--md-sys-color-surface-variant)]',
                            )}
                          >
                            <span className="text-xl leading-none">
                              {meta?.flag ?? '🌍'}
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--md-sys-color-on-surface)]">
                                {meta?.city ?? currentZone.id.toUpperCase()}
                                {isGreen && (
                                  <MSO
                                    icon="eco"
                                    className="text-[13px] text-green-600"
                                  />
                                )}
                              </span>
                              <span className="block truncate text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                                {meta?.country ?? currentZone.description}
                              </span>
                            </span>

                            {isSelected && (
                              <MSO
                                icon="check_circle"
                                className="text-[18px] text-[var(--md-sys-color-primary)]"
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-5 sm:p-6">
            <SectionHeading
              eyebrow="03 · Compute"
              title="Choose a server plan"
              description="Start small and scale as your application grows. Storage is included with every plan."
            />

            <div
              className="mt-6 grid grid-cols-2 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/40 p-1"
              role="tablist"
              aria-label="Plan tier"
            >
              {(['Starter', 'Premium'] as PlanTier[]).map((tier) => {
                const isActive = planTierTab === tier
                const meta = TIER_META[tier]

                return (
                  <button
                    key={tier}
                    id={`${tier.toLowerCase()}-plans-tab`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`${tier.toLowerCase()}-plans-panel`}
                    onClick={() => selectPlanTier(tier)}
                    className={cn(
                      'rounded-lg px-3 py-2.5 text-left transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)]',
                      isActive
                        ? 'bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] shadow-sm'
                        : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]',
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                      <MSO icon={meta.icon} className="text-[16px]" />
                      {tier}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-normal opacity-75">
                      {meta.startingPrice}
                    </span>
                  </button>
                )
              })}
            </div>

            <div
              id={`${planTierTab.toLowerCase()}-plans-panel`}
              role="tabpanel"
              aria-labelledby={`${planTierTab.toLowerCase()}-plans-tab`}
              className="mt-5"
            >
              <p className="mb-3 text-[12px] text-[var(--md-sys-color-on-surface-variant)]">
                {TIER_META[planTierTab].description}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {plansInTab.map((currentPlan) => {
                  const isSelected = plan === currentPlan.name
                  const price = kesPrices[currentPlan.name]

                  return (
                    <button
                      key={currentPlan.name}
                      type="button"
                      onClick={() => setPlan(currentPlan.name)}
                      aria-pressed={isSelected}
                      className={cn(
                        'relative min-h-[190px] rounded-2xl border p-4 text-left transition-all',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:ring-offset-2',
                        isSelected
                          ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary-container)] shadow-sm'
                          : 'border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] hover:-translate-y-0.5 hover:border-[var(--md-sys-color-primary)]/60 hover:shadow-sm',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[14px] font-semibold text-[var(--md-sys-color-on-surface)]">
                            {currentPlan.name.replace(
                              /^(STARTER|PREMIUM)-/,
                              '',
                            )}
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-[var(--md-sys-color-on-surface-variant)]">
                            {planUseCase(currentPlan)}
                          </p>
                        </div>

                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                            isSelected
                              ? 'border-[var(--md-sys-color-primary)]'
                              : 'border-[var(--md-sys-color-outline-variant)]',
                          )}
                        >
                          {isSelected && (
                            <span className="h-2.5 w-2.5 rounded-full bg-[var(--md-sys-color-primary)]" />
                          )}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2 border-y border-[var(--md-sys-color-outline-variant)]/70 py-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-[var(--md-sys-color-on-surface-variant)]">
                            CPU
                          </p>
                          <p className="mt-0.5 text-[12px] font-semibold text-[var(--md-sys-color-on-surface)]">
                            {currentPlan.core_number} vCPU
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-[var(--md-sys-color-on-surface-variant)]">
                            Memory
                          </p>
                          <p className="mt-0.5 text-[12px] font-semibold text-[var(--md-sys-color-on-surface)]">
                            {formatMemory(currentPlan.memory_amount)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-[var(--md-sys-color-on-surface-variant)]">
                            Storage
                          </p>
                          <p className="mt-0.5 text-[12px] font-semibold text-[var(--md-sys-color-on-surface)]">
                            {currentPlan.storage_size} GB
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-end justify-between gap-3">
                        <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                          Billed monthly
                        </span>
                        <span className="text-right text-[17px] font-bold tracking-tight text-[var(--md-sys-color-on-surface)]">
                          {formatKes(price)}
                          <span className="ml-1 text-[11px] font-normal text-[var(--md-sys-color-on-surface-variant)]">
                            / mo
                          </span>
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {plansInTab.length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--md-sys-color-outline-variant)] px-4 py-8 text-center">
                  <MSO
                    icon="inventory_2"
                    className="text-[22px] text-[var(--md-sys-color-on-surface-variant)]"
                  />
                  <p className="mt-2 text-[13px] text-[var(--md-sys-color-on-surface-variant)]">
                    No plans are currently available in this tier.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-5 sm:p-6">
            <SectionHeading
              eyebrow="04 · Operating system"
              title="Choose your operating system"
              description="Ubuntu LTS is the recommended choice for most websites, APIs, and application workloads."
            />

            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {OS_FAMILIES.filter(
                (family) => templatesByFamily[family.key]?.length,
              ).map((family) => {
                const isSelected = osFamily === family.key

                return (
                  <button
                    key={family.key}
                    type="button"
                    onClick={() => selectOsFamily(family.key)}
                    aria-pressed={isSelected}
                    className={cn(
                      'relative flex min-h-[96px] flex-col items-start rounded-xl border p-3 text-left transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:ring-offset-2',
                      isSelected
                        ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary-container)]'
                        : 'border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] hover:border-[var(--md-sys-color-primary)]/60 hover:bg-[var(--md-sys-color-surface-variant)]',
                    )}
                  >
                    <img
                      src={family.icon}
                      alt=""
                      className="h-7 w-7 object-contain"
                    />

                    <span className="mt-auto text-[12px] font-semibold text-[var(--md-sys-color-on-surface)]">
                      {family.label}
                    </span>

                    {family.recommended && (
                      <span className="mt-1 text-[10px] text-green-700">
                        Recommended
                      </span>
                    )}

                    {isSelected && (
                      <MSO
                        icon="check_circle"
                        className="absolute right-2.5 top-2.5 text-[18px] text-[var(--md-sys-color-primary)]"
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {osFamily && versionsForFamily.length > 1 && (
              <div className="mt-4">
                <label
                  htmlFor="template-version"
                  className="mb-1.5 block text-[12px] font-medium text-[var(--md-sys-color-on-surface)]"
                >
                  Version
                </label>

                <select
                  id="template-version"
                  value={templateUuid}
                  onChange={(event) => setTemplateUuid(event.target.value)}
                  className="w-full rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] px-3.5 py-2.5 text-[13px] text-[var(--md-sys-color-on-surface)] outline-none transition-colors focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15"
                >
                  {versionsForFamily.map((template) => (
                    <option key={template.uuid} value={template.uuid}>
                      {template.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-5 flex items-start gap-2 rounded-xl bg-[var(--md-sys-color-surface-variant)]/60 p-3.5">
              <MSO
                icon="vpn_key"
                className="mt-0.5 text-[16px] text-[var(--md-sys-color-primary)]"
              />
              <p className="text-[12px] leading-relaxed text-[var(--md-sys-color-on-surface-variant)]">
                A secure SSH private key is generated automatically. You will
                be able to download it once immediately after creating the server.
              </p>
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800"
            >
              <MSO icon="error" className="mt-0.5 text-[18px] text-red-700" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !formIsComplete}
            className="hidden w-full items-center justify-center gap-2 rounded-xl bg-[var(--md-sys-color-primary)] px-5 py-3.5 text-[14px] font-semibold text-[var(--md-sys-color-on-primary)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 lg:flex"
          >
            <MSO
              icon={submitting ? 'progress_activity' : 'add_circle'}
              className={cn('text-[19px]', submitting && 'animate-spin')}
            />
            {submitting ? 'Creating server…' : 'Create server'}
          </button>
        </div>

        <aside className="hidden w-full lg:sticky lg:top-6 lg:block">
          <div className="overflow-hidden rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] shadow-sm">
            <div className="bg-[var(--md-sys-color-primary-container)] px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--md-sys-color-on-primary-container)]/70">
                    Your configuration
                  </p>
                  <p className="mt-1 truncate text-[15px] font-semibold text-[var(--md-sys-color-on-primary-container)]">
                    {title || 'New server'}
                  </p>
                </div>

                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]">
                  <MSO icon="dns" className="text-[20px]" />
                </span>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <SummaryRow
                icon="location_on"
                label="Location"
                value={
                  selectedZoneMeta
                    ? `${selectedZoneMeta.city}, ${selectedZoneMeta.country}`
                    : selectedZone?.description ?? 'Choose a location'
                }
              />

              <SummaryRow
                icon="memory"
                label="Compute"
                value={
                  selectedPlan
                    ? `${selectedPlan.core_number} vCPU · ${formatMemory(selectedPlan.memory_amount)} RAM`
                    : 'Choose a plan'
                }
              />

              <SummaryRow
                icon="storage"
                label="Storage"
                value={
                  selectedPlan
                    ? `${selectedPlan.storage_size} GB included`
                    : 'Included with plan'
                }
              />

              <SummaryRow
                icon="terminal"
                label="Operating system"
                value={selectedTemplate?.title ?? 'Choose an operating system'}
              />

              <SummaryRow
                icon="language"
                label="Hostname"
                value={hostname || 'Not set'}
              />
            </div>

            <div className="border-t border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/45 p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)]">
                    Monthly total
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                    No setup fee
                  </p>
                </div>

                <p className="text-right text-xl font-bold tracking-tight text-[var(--md-sys-color-on-surface)]">
                  {formatKes(monthlyPrice)}
                  <span className="ml-1 text-[11px] font-normal text-[var(--md-sys-color-on-surface-variant)]">
                    / mo
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-4">
            <div className="flex gap-2.5">
              <MSO
                icon="verified_user"
                className="mt-0.5 text-[18px] text-[var(--md-sys-color-primary)]"
              />
              <div>
                <p className="text-[12px] font-semibold text-[var(--md-sys-color-on-surface)]">
                  Secure by default
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--md-sys-color-on-surface-variant)]">
                  Your server is created with key-based SSH access. Backup
                  and firewall controls can be added later.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)]/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
              {selectedPlan
                ? `${selectedPlan.core_number} vCPU · ${formatMemory(selectedPlan.memory_amount)} · ${selectedPlan.storage_size} GB`
                : 'Choose a plan to continue'}
            </p>
            <p className="text-[16px] font-bold tracking-tight text-[var(--md-sys-color-on-surface)]">
              {formatKes(monthlyPrice)}
              <span className="ml-1 text-[11px] font-normal text-[var(--md-sys-color-on-surface-variant)]">
                / mo
              </span>
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || !formIsComplete}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--md-sys-color-primary)] px-4 py-3 text-[13px] font-semibold text-[var(--md-sys-color-on-primary)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MSO
              icon={submitting ? 'progress_activity' : 'add_circle'}
              className={cn('text-[18px]', submitting && 'animate-spin')}
            />
            {submitting ? 'Creating…' : 'Create server'}
          </button>
        </div>
      </div>
    </form>
  )
}