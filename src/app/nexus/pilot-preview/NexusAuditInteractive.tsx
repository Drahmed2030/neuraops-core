'use client'

import { FormEvent, useRef, useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { KpiCard } from '@/components/ui/KpiCard'
import { StatusBadge } from '@/components/ui/StatusBadge'

const fields = [
  { key: 'referralVolumePerMonth', label: 'Referral volume / month', placeholder: 'Estimated monthly inbound referrals', step: '1' },
  { key: 'medianReferralResponseHours', label: 'Median referral response time', placeholder: 'Hours from referral to first action', step: '0.1' },
  { key: 'unresolvedReferralBacklog', label: 'Unresolved referral backlog', placeholder: 'Open referrals needing follow-up', step: '1' },
  { key: 'followUpCompletionPercent', label: 'Follow-up completion rate', placeholder: 'Percent completed in expected window', step: '0.1' },
  { key: 'leakagePercent', label: 'No-show / leakage signal', placeholder: 'Approximate percentage lost', step: '0.1' },
  { key: 'locationOrHandoffCount', label: 'Locations / handoff points', placeholder: 'Sites or operational handoffs', step: '1' },
] as const

type MetricKey = (typeof fields)[number]['key']
type FormState = Record<MetricKey, string>
type Gap = { metric: string; title: string; severity: 'critical' | 'attention'; value: number }
type AuditResponse = {
  engagementId: string
  auditRef: string
  result: { policyVersion: string; assessedSignals: number; riskSignals: number; priorityGapCount: number }
  priorityGaps: Gap[]
  version: number
}

const emptyMetrics = fields.reduce((acc, field) => ({ ...acc, [field.key]: '' }), {} as FormState)

function displayMetric(key: MetricKey, value: number) {
  if (key.endsWith('Percent')) return `${value}%`
  if (key === 'medianReferralResponseHours') return `${value}h`
  return String(value)
}

export function NexusAuditInteractive() {
  const [organizationName, setOrganizationName] = useState('')
  const [metrics, setMetrics] = useState<FormState>(emptyMetrics)
  const [submittedMetrics, setSubmittedMetrics] = useState<Record<string, number> | null>(null)
  const [result, setResult] = useState<AuditResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewRequested, setReviewRequested] = useState(false)
  const idempotencyKey = useRef<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setReviewRequested(false)

    const parsed: Record<string, number> = {}
    for (const field of fields) {
      const value = Number(metrics[field.key])
      if (!Number.isFinite(value) || value < 0) {
        setError(`Enter a valid non-negative value for ${field.label}.`)
        return
      }
      if (field.key.endsWith('Percent') && value > 100) {
        setError(`${field.label} must be between 0 and 100.`)
        return
      }
      parsed[field.key] = value
    }

    if (organizationName.trim().length < 2) {
      setError('Enter the organization or practice name.')
      return
    }

    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID()
    setSubmitting(true)
    try {
      const response = await fetch('/api/nexus/audit', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': idempotencyKey.current,
        },
        body: JSON.stringify({ organizationName: organizationName.trim(), metrics: parsed }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Audit request failed.')
        return
      }

      setSubmittedMetrics(parsed)
      setResult(data)
      idempotencyKey.current = null
    } catch {
      setError('Audit service is unavailable. The same request can be retried safely.')
    } finally {
      setSubmitting(false)
    }
  }

  async function requestReview() {
    if (!result || reviewRequested) return
    setError(null)
    setReviewSubmitting(true)
    try {
      const response = await fetch('/api/nexus/audit/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          engagementId: result.engagementId,
          auditRef: result.auditRef,
          contactRoute: 'email',
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Review request failed.')
        return
      }
      setReviewRequested(true)
      setResult(current => current ? { ...current, version: data.version ?? current.version } : current)
    } catch {
      setError('Review request service is unavailable. Please retry safely.')
    } finally {
      setReviewSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <Card
        elevation="elevated"
        title="Operational snapshot"
        description="Enter six aggregate operational signals. This development preview sends no patient data and uses the isolated Control Plane environment only."
      >
        <form onSubmit={submit} className="space-y-6">
          <label className="block text-sm font-semibold">
            Organization / practice name
            <Input
              className="mt-2"
              inputSize="l"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Example: Multi-site ENT practice"
              autoComplete="organization"
              maxLength={160}
              required
            />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            {fields.map((field) => (
              <label key={field.key} className="text-sm font-semibold">
                {field.label}
                <Input
                  className="mt-2"
                  inputSize="l"
                  type="number"
                  min="0"
                  max={field.key.endsWith('Percent') ? '100' : undefined}
                  step={field.step}
                  value={metrics[field.key]}
                  onChange={(event) => setMetrics(current => ({ ...current, [field.key]: event.target.value }))}
                  placeholder={field.placeholder}
                  helperText="Aggregate operational estimate only"
                  required
                />
              </label>
            ))}
          </div>

          {error ? <Alert tone="critical" title="Request could not be completed">{error}</Alert> : null}

          <div className="flex flex-col gap-3 border-t border-black/[0.06] pt-5 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs opacity-50">Development environment · no PHI · idempotent submission</p>
            <Button size="l" type="submit" disabled={submitting}>
              {submitting ? 'Generating audit…' : 'Generate my audit'}
            </Button>
          </div>
        </form>
      </Card>

      {result && submittedMetrics ? (
        <section className="space-y-5 border-t border-black/10 pt-8 dark:border-white/10" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Audit result</div>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Priority operational signals</h2>
              <p className="mt-2 text-sm opacity-60">Policy: {result.result.policyVersion} · Control Plane v{result.version}</p>
            </div>
            <StatusBadge tone={reviewRequested ? 'success' : result.priorityGaps.length ? 'attention' : 'success'}>
              {reviewRequested ? 'Review requested' : result.priorityGaps.length ? 'Review recommended' : 'No configured risk threshold crossed'}
            </StatusBadge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Referral response" value={displayMetric('medianReferralResponseHours', submittedMetrics.medianReferralResponseHours)} meta="Submitted aggregate" />
            <KpiCard label="Open backlog" value={displayMetric('unresolvedReferralBacklog', submittedMetrics.unresolvedReferralBacklog)} meta="Submitted aggregate" />
            <KpiCard label="Follow-up completion" value={displayMetric('followUpCompletionPercent', submittedMetrics.followUpCompletionPercent)} meta="Submitted aggregate" />
            <KpiCard label="Priority gaps" value={String(result.result.priorityGapCount)} meta={`${result.result.riskSignals} risk signals`} tone={result.priorityGaps.length ? 'attention' : 'positive'} />
          </div>

          <div>
            <h3 className="mb-3 text-lg font-bold">Priority gaps</h3>
            {result.priorityGaps.length ? (
              <div className="grid gap-4 md:grid-cols-3">
                {result.priorityGaps.map((gap) => (
                  <Card
                    key={gap.metric}
                    elevation="elevated"
                    title={gap.title}
                    description={`Configured ${gap.severity} signal · submitted value ${gap.value}`}
                  />
                ))}
              </div>
            ) : (
              <Alert tone="success" title="No configured priority gap">
                None of the configured development-policy thresholds were crossed. This is not a clinical assessment.
              </Alert>
            )}
          </div>

          <div className="rounded-[24px] bg-brand-primary p-6 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-extrabold">Operational review</h3>
                <p className="mt-1 text-sm text-white/80">
                  Request a review of this persisted audit. Booking itself remains the next integration gate.
                </p>
              </div>
              <Button
                variant="secondary"
                size="l"
                type="button"
                disabled={reviewSubmitting || reviewRequested}
                onClick={requestReview}
              >
                {reviewRequested ? 'Review requested' : reviewSubmitting ? 'Requesting…' : 'Request operational review'}
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
