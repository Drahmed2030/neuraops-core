import type { Metadata } from 'next'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { NexusAuditInteractive } from './NexusAuditInteractive'

export const metadata: Metadata = {
  title: 'Nexus Pilot Composite Preview',
  robots: { index: false, follow: false },
}

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
              <StatusBadge>Development preview</StatusBadge>
            </div>
          </div>

          <div className="max-w-4xl space-y-3">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Free operational diagnostic</div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Find the operational gaps that deserve attention first.
            </h1>
            <p className="max-w-3xl text-base leading-7 opacity-60 sm:text-lg">
              Six aggregate operational inputs. Policy-driven priority signals. One focused 14-day action path. No clinical decisions and no patient data required.
            </p>
          </div>
        </header>

        <Alert tone="info" title="Privacy by design">
          Use operational metrics only. Do not enter patient information, credentials, API keys, payment-card data, or other sensitive information.
        </Alert>

        <NexusAuditInteractive />

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
                The next development gate wires the review-request flow. If there is no measurable operational problem, the system should not recommend a pilot.
              </p>
            </div>
            <Button variant="secondary" size="l" disabled>Book operational review · next gate</Button>
          </div>
        </section>

        <Alert tone="attention" title="Non-production integration">
          Audit submission and result persistence are now wired only for the isolated Control Plane development environment. Booking, live payments, and production activation remain intentionally disabled.
        </Alert>
      </div>
    </main>
  )
}
