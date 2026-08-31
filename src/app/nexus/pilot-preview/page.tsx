import type { Metadata } from 'next'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { KpiCard } from '@/components/ui/KpiCard'
import { StatusBadge } from '@/components/ui/StatusBadge'

export const metadata: Metadata = {
  title: 'Nexus Pilot Composite Preview',
  robots: { index: false, follow: false },
}

const auditInputs = [
  ['Referral volume / month', 'Estimated monthly inbound referrals'],
  ['Median referral response time', 'Typical time from referral to first action'],
  ['Unresolved referral backlog', 'Approximate open referrals needing follow-up'],
  ['Follow-up completion rate', 'Percent completed within your expected window'],
  ['No-show / leakage signal', 'Approximate percentage lost before completion'],
  ['Locations / handoff points', 'Number of sites or operational handoffs'],
] as const

const priorityGaps = [
  {
    title: 'Referral handoff delay',
    description: 'Ownership is unclear after referral receipt, increasing response time and follow-up variance.',
  },
  {
    title: 'Backlog visibility',
    description: 'Open referrals are not surfaced by age and urgency, so work is handled reactively.',
  },
  {
    title: 'Follow-up completion',
    description: 'Completion is measured too late to intervene before referrals leak or stall.',
  },
] as const

const plan = [
  ['Day 1 · Baseline', 'Confirm the workflow, owner, baseline KPI, and exact measurement rule.'],
  ['Day 2–6 · Implement', 'Apply one focused workflow change and track exceptions instead of expanding scope.'],
  ['Day 7 · Checkpoint', 'Review progress, blockers, and early signal. Escalate only when intervention is needed.'],
  ['Day 8–14 · Measure', 'Complete the cycle, record before/after result, and decide renew, stop, or extend.'],
] as const

export default function NexusPilotPreviewPage() {
  return (
    <main className="min-h-screen bg-paper-50 px-4 py-8 text-ink-950 dark:bg-ink-950 dark:text-paper-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-5 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-primary">Nexus KPI Audit</div>
            <div className="flex items-center gap-2">
              <StatusBadge tone="info">No patient data</StatusBadge>
              <StatusBadge>Internal preview</StatusBadge>
            </div>
          </div>

          <div className="max-w-4xl space-y-3">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Free operational diagnostic</div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Find the operational gaps that deserve attention first.
            </h1>
            <p className="max-w-3xl text-base leading-7 opacity-60 sm:text-lg">
              Six operational inputs. Three priority gaps. One focused 14-day action plan. No clinical decisions and no patient data required.
            </p>
          </div>
        </header>

        <Alert tone="info" title="Privacy by design">
          Use operational metrics only. Do not enter patient information, credentials, API keys, or payment-card data.
        </Alert>

        <Card
          elevation="elevated"
          title="Operational snapshot"
          description="Enter the six signals below to generate a focused operational review. This route is a non-production product scaffold and does not submit data yet."
        >
          <div className="grid gap-5 md:grid-cols-2">
            {auditInputs.map(([label, placeholder]) => (
              <label key={label} className="text-sm font-semibold">
                {label}
                <Input
                  className="mt-2"
                  inputSize="l"
                  placeholder={placeholder}
                  helperText="Operational estimate is enough"
                  disabled
                />
              </label>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-black/[0.06] pt-5 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs opacity-50">Expected completion time: under 3 minutes</p>
            <Button size="l" disabled>Generate my audit</Button>
          </div>
        </Card>

        <section className="space-y-5 border-t border-black/10 pt-8 dark:border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Audit result</div>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Your three highest-priority operational gaps</h2>
            </div>
            <StatusBadge tone="attention">Review recommended</StatusBadge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Referral response" value="36h" meta="Needs attention" tone="attention" />
            <KpiCard label="Open backlog" value="42" meta="Priority" tone="critical" />
            <KpiCard label="Follow-up completion" value="71%" meta="Current baseline" />
            <KpiCard label="14-day focus" value="1" meta="Workflow" tone="positive" />
          </div>

          <div>
            <h3 className="mb-3 text-lg font-bold">Priority gaps</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {priorityGaps.map((gap) => (
                <Card key={gap.title} elevation="elevated" title={gap.title} description={gap.description} />
              ))}
            </div>
          </div>
        </section>

        <Card
          title="Your focused 14-day action plan"
          description="One operational gap. One accountable owner. One measurable before/after KPI."
          className="bg-black/[0.015] dark:bg-white/[0.025]"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plan.map(([title, description]) => (
              <Card key={title} title={title} description={description} className="p-5" />
            ))}
          </div>
        </Card>

        <section className="rounded-[24px] bg-brand-primary p-7 text-white sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-extrabold">Want to validate this with your real workflow?</h2>
              <p className="mt-2 text-sm leading-6 text-white/80">
                Book a 30-minute operational review. If there is no measurable problem, we will not recommend a pilot.
              </p>
            </div>
            <Button variant="secondary" size="l" disabled>Book operational review</Button>
          </div>
        </section>

        <Alert tone="attention" title="Backend contract intentionally not wired">
          The preview does not create audits, bookings, pilots, payments, or entitlements. Those transitions will be implemented through the shared Control Plane after the composite contract is validated.
        </Alert>
      </div>
    </main>
  )
}
