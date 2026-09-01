'use client'

import type {
  IncidentLineageProjectedPhase,
  IncidentReplayStepProjection,
  OperationsReadModel,
  RecoveryObjectiveProjection,
  TrustProduct,
} from '@/lib/trust/contracts'
import { useUI } from '@/lib/ui-context'

type OperationsConsoleProps =
  | { view: 'ready'; snapshot: OperationsReadModel }
  | { view: 'access-denied' | 'unavailable'; snapshot?: never }

type Locale = 'ar-SA' | 'en-US'

const PRODUCT_ORDER: TrustProduct[] = ['shared', 'neuraops', 'cliniverse']

function formatTimestamp(value: string | null, locale: Locale) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function readinessClasses(readiness: RecoveryObjectiveProjection['readiness']) {
  if (readiness === 'verified') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  if (readiness === 'gap') return 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300'
  return 'border-attention/30 bg-attention/10 text-attention-dark dark:text-attention'
}

function productClasses(product: TrustProduct) {
  if (product === 'cliniverse') return 'border-brand-violet/25 bg-brand-violet/10 text-brand-violet dark:text-violet-300'
  if (product === 'neuraops') return 'border-brand-primary/25 bg-brand-primary/10 text-brand-primary dark:text-brand-azure'
  return 'border-black/10 bg-black/[0.04] text-ink-950/65 dark:border-white/10 dark:bg-white/[0.06] dark:text-paper-50/65'
}

function replayStatusClasses(status: 'complete' | 'partial') {
  return status === 'complete'
    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    : 'border-attention/30 bg-attention/10 text-attention-dark dark:text-attention'
}

function shortRef(value: string) {
  return `${value.slice(0, 12)}…`
}

function ConsoleGate({ view, isArabic }: { view: 'access-denied' | 'unavailable'; isArabic: boolean }) {
  const denied = view === 'access-denied'

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="rounded-3xl border border-black/[0.08] bg-white p-6 shadow-card-light dark:border-white/[0.08] dark:bg-ink-800 dark:shadow-card-dark sm:p-9">
        <div className="mb-5 inline-flex rounded-full border border-attention/25 bg-attention/[0.08] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-attention-dark dark:text-attention">
          {isArabic ? 'بوابة أمان مغلقة' : 'Security gate closed'}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {isArabic ? 'وحدة تحكم الثقة والعمليات' : 'Unified Trust & Operations Console'}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-950/60 dark:text-paper-50/60">
          {denied
            ? (isArabic
                ? 'لم يُمنح هذا الحساب صلاحية مشغّل NTRP. لم يتم عرض أي snapshot أو بيانات تشغيلية.'
                : 'This account has not been granted NTRP operator access. No snapshot or operational data was displayed.')
            : (isArabic
                ? 'التحقق من الصلاحية أو إسقاط القراءة غير متاح حاليًا. بقيت البوابة مغلقة ولم تُمنح أي صلاحية بديلة.'
                : 'Authorization verification or the read projection is currently unavailable. The gate stayed closed and no fallback access was granted.')}
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-black/[0.07] bg-black/[0.02] p-4 dark:border-white/[0.07] dark:bg-white/[0.03]">
            <div className="text-xs font-bold">{isArabic ? 'الوضع' : 'Mode'}</div>
            <div className="mt-1 text-sm text-ink-950/55 dark:text-paper-50/55">{isArabic ? 'قراءة فقط، مغلق افتراضيًا' : 'Read-only, fail closed'}</div>
          </div>
          <div className="rounded-2xl border border-black/[0.07] bg-black/[0.02] p-4 dark:border-white/[0.07] dark:bg-white/[0.03]">
            <div className="text-xs font-bold">{isArabic ? 'حد Cliniverse' : 'Cliniverse boundary'}</div>
            <div className="mt-1 text-sm text-ink-950/55 dark:text-paper-50/55">{isArabic ? 'لا توجد بيانات سريرية في Trust Fabric' : 'No clinical data enters Trust Fabric'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function IncidentLineageSection({
  lineage,
  isArabic,
  locale,
  productLabels,
}: {
  lineage: OperationsReadModel['incidentLineage']
  isArabic: boolean
  locale: Locale
  productLabels: Record<TrustProduct, string>
}) {
  const summary = lineage.summary
  const phaseLabels: Record<IncidentLineageProjectedPhase, string> = {
    detected: isArabic ? 'اكتشاف' : 'Detected',
    triaged: isArabic ? 'فرز' : 'Triaged',
    contained: isArabic ? 'احتواء' : 'Contained',
    recovered: isArabic ? 'استعادة' : 'Recovered',
    verified: isArabic ? 'مثبت' : 'Verified',
    'verification-pending': isArabic ? 'بانتظار الإثبات' : 'Verification pending',
  }
  const predecessorLabels: Record<IncidentReplayStepProjection['predecessor'], string> = {
    root: isArabic ? 'بداية السجل' : 'Replay root',
    linked: isArabic ? 'مرتبط' : 'Linked',
    unresolved: isArabic ? 'غير محلول' : 'Unresolved',
    'scope-mismatch': isArabic ? 'تعارض نطاق' : 'Scope mismatch',
  }
  const eventLabels: Record<IncidentReplayStepProjection['event'], string> = {
    'not-referenced': isArabic ? 'غير مشار إليه' : 'Not referenced',
    resolved: isArabic ? 'محلول' : 'Resolved',
    unresolved: isArabic ? 'غير محلول' : 'Unresolved',
    'scope-mismatch': isArabic ? 'تعارض نطاق' : 'Scope mismatch',
  }
  const cards = [
    { label: isArabic ? 'الحوادث' : 'Incidents', value: summary.totalIncidents },
    { label: isArabic ? 'خطوات السجل' : 'Lineage steps', value: summary.totalSteps },
    { label: isArabic ? 'Replay مكتمل' : 'Complete replays', value: summary.completeReplays },
    { label: isArabic ? 'مثبت بالدليل' : 'Evidence-verified', value: summary.verifiedReplays },
  ]
  const unresolvedRefs = summary.unresolvedPredecessorRefs
    + summary.unresolvedEventRefs
    + summary.unresolvedEvidenceRefs
  const crossScopeRefs = summary.crossScopePredecessorRefs
    + summary.crossProductEventRefs
    + summary.crossProductEvidenceRefs

  return (
    <section aria-labelledby="incident-lineage" className="mb-7 overflow-hidden rounded-2xl border border-black/[0.08] bg-white dark:border-white/[0.08] dark:bg-ink-800">
      <div className="border-b border-black/[0.07] p-5 dark:border-white/[0.07] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 id="incident-lineage" className="text-lg font-extrabold">{isArabic ? 'إعادة عرض الحوادث ومسار البيانات' : 'Incident replay & data lineage'}</h2>
            <p className="mt-1 max-w-3xl text-xs leading-6 text-ink-950/50 dark:text-paper-50/50">
              {isArabic
                ? 'إعادة بناء زمنية لبيانات وصفية منزوعة الحساسية فقط. لا تعيد تشغيل الأحداث ولا تستدعي أي إجراء أو side effect.'
                : 'A chronological reconstruction of sanitized metadata only. Replay never re-executes events, invokes an action, or produces side effects.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.12em]">
            <span className="rounded-full border border-brand-primary/25 bg-brand-primary/10 px-3 py-1.5 text-brand-primary dark:text-brand-azure">{isArabic ? 'بيانات وصفية فقط' : 'Metadata only'}</span>
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-emerald-700 dark:text-emerald-300">{isArabic ? 'التنفيذ معطل' : 'Execution disabled'}</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
              <div className="text-[11px] text-ink-950/50 dark:text-paper-50/50">{card.label}</div>
              <div className="mt-1 text-2xl font-extrabold">{card.value}</div>
            </div>
          ))}
        </div>
      </div>

      {lineage.replays.length === 0 ? (
        <div className="p-5 sm:p-6">
          <div className="rounded-2xl border border-dashed border-black/15 bg-black/[0.015] p-6 text-center dark:border-white/15 dark:bg-white/[0.02]">
            <div className="text-sm font-extrabold">{isArabic ? 'لا توجد سجلات lineage تشغيلية حتى الآن' : 'No runtime lineage records yet'}</div>
            <p className="mx-auto mt-2 max-w-2xl text-xs leading-6 text-ink-950/50 dark:text-paper-50/50">
              {isArabic
                ? 'العقد والإسقاط جاهزان، لكن لا يوجد persistence adapter مفعّل. لن تعرض الوحدة حوادث أو أدلة مصطنعة.'
                : 'The contract and projection are ready, but no persistence adapter is enabled. The console will not fabricate incidents or evidence.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-black/[0.07] dark:divide-white/[0.07]">
          {lineage.replays.map((replay) => (
            <article key={replay.incidentRef} className="p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold" title={replay.incidentRef}>{isArabic ? 'حادث' : 'Incident'} {shortRef(replay.incidentRef)}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${productClasses(replay.product)}`}>{productLabels[replay.product]}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${replayStatusClasses(replay.status)}`}>
                      {replay.status === 'complete' ? (isArabic ? 'مكتمل' : 'Complete') : (isArabic ? 'جزئي' : 'Partial')}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-ink-950/45 dark:text-paper-50/45">
                    {formatTimestamp(replay.startedAt, locale)} → {formatTimestamp(replay.latestOccurredAt, locale)}
                  </div>
                </div>
                <div className="text-[11px] text-ink-950/50 dark:text-paper-50/50">
                  {isArabic ? 'الدليل المحلول' : 'Resolved evidence'}: {replay.evidence.resolved}/{replay.evidence.referenced}
                </div>
              </div>

              <ol className="mt-5 grid gap-3 lg:grid-cols-2">
                {replay.steps.map((step) => (
                  <li key={step.lineageRef} className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary text-[10px] font-extrabold text-white">{step.sequence}</span>
                        <strong className="text-xs">{phaseLabels[step.phase]}</strong>
                      </div>
                      <time dateTime={step.occurredAt} className="text-[10px] text-ink-950/45 dark:text-paper-50/45">{formatTimestamp(step.occurredAt, locale)}</time>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <div className="text-ink-950/40 dark:text-paper-50/40">{isArabic ? 'السابق' : 'Previous'}</div>
                        <div className="mt-1 font-semibold">{predecessorLabels[step.predecessor]}</div>
                      </div>
                      <div>
                        <div className="text-ink-950/40 dark:text-paper-50/40">{isArabic ? 'الحدث' : 'Event'}</div>
                        <div className="mt-1 font-semibold">{eventLabels[step.event]}</div>
                      </div>
                      <div>
                        <div className="text-ink-950/40 dark:text-paper-50/40">{isArabic ? 'الدليل' : 'Evidence'}</div>
                        <div className="mt-1 font-semibold">{step.evidence.resolved}/{step.evidence.referenced}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1 border-t border-black/[0.07] bg-black/[0.015] px-5 py-3 text-[10px] text-ink-950/45 dark:border-white/[0.07] dark:bg-white/[0.02] dark:text-paper-50/45 sm:flex-row sm:justify-between">
        <span>{isArabic ? `روابط غير محلولة: ${unresolvedRefs}` : `Unresolved refs: ${unresolvedRefs}`}</span>
        <span>{isArabic ? `تعارضات النطاق: ${crossScopeRefs}` : `Scope mismatches: ${crossScopeRefs}`}</span>
      </div>
    </section>
  )
}

export function OperationsConsole(props: OperationsConsoleProps) {
  const { lang } = useUI()
  const isArabic = lang === 'ar'
  const locale: Locale = isArabic ? 'ar-SA' : 'en-US'

  if (props.view !== 'ready') return <ConsoleGate view={props.view} isArabic={isArabic} />

  const { snapshot } = props
  const summary = snapshot.recovery.summary
  const productCounts = Object.fromEntries(
    PRODUCT_ORDER.map((product) => [
      product,
      snapshot.recovery.objectives.filter((objective) => objective.product === product).length,
    ])
  ) as Record<TrustProduct, number>

  const cards = [
    { label: isArabic ? 'أهداف الاسترداد' : 'Recovery targets', value: summary.total, tone: 'text-brand-primary dark:text-brand-azure' },
    { label: isArabic ? 'مثبتة بالدليل' : 'Evidence-verified', value: summary.verified, tone: 'text-emerald-700 dark:text-emerald-300' },
    { label: isArabic ? 'جاهزية جزئية' : 'Partial readiness', value: summary.partial, tone: 'text-attention-dark dark:text-attention' },
    { label: isArabic ? 'فجوات ظاهرة' : 'Visible gaps', value: summary.gaps, tone: 'text-red-700 dark:text-red-300' },
  ]

  const productLabels: Record<TrustProduct, string> = {
    shared: isArabic ? 'مشترك' : 'Shared',
    neuraops: 'NeuraOps',
    cliniverse: 'Cliniverse',
  }

  const readinessLabels: Record<RecoveryObjectiveProjection['readiness'], string> = {
    verified: isArabic ? 'مثبت' : 'Verified',
    partial: isArabic ? 'جزئي' : 'Partial',
    gap: isArabic ? 'فجوة' : 'Gap',
  }

  return (
    <div className="min-h-screen bg-paper-50 px-4 py-7 text-ink-950 dark:bg-ink-950 dark:text-paper-50 sm:px-6 sm:py-9" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-primary dark:text-brand-azure">NTRP · Trust control plane</div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                {isArabic ? 'وحدة تحكم الثقة والعمليات' : 'Unified Trust & Operations Console'}
              </h1>
              <span className="rounded-full border border-brand-primary/25 bg-brand-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-primary dark:text-brand-azure">
                {isArabic ? 'قراءة فقط' : 'Read only'}
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-950/60 dark:text-paper-50/60">
              {isArabic
                ? 'عرض موحّد لحالة التعافي وأدلة Trust Fabric المسموح بها. القيم المستهدفة لا تُعرض كقدرات مثبتة دون دليل صالح.'
                : 'A unified view of recovery posture and allowlisted Trust Fabric evidence. Targets are never presented as proven capability without valid evidence.'}
            </p>
          </div>
          <div className="rounded-2xl border border-black/[0.07] bg-white px-4 py-3 text-start dark:border-white/[0.07] dark:bg-ink-800">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-950/40 dark:text-paper-50/40">{isArabic ? 'وقت الإسقاط · UTC' : 'Projection time · UTC'}</div>
            <time dateTime={snapshot.generatedAt} className="mt-1 block text-sm font-semibold">
              {formatTimestamp(snapshot.generatedAt, locale)}
            </time>
          </div>
        </header>

        <section aria-labelledby="privacy-boundary" className="mb-7 rounded-2xl border border-brand-cyan/25 bg-brand-cyan/[0.07] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 id="privacy-boundary" className="text-sm font-extrabold text-cyan-800 dark:text-cyan-200">
                {isArabic ? 'حد الخصوصية فعّال' : 'Privacy boundary active'}
              </h2>
              <p className="mt-1 text-xs leading-6 text-ink-950/60 dark:text-paper-50/60">
                {isArabic
                  ? 'Cliniverse ظاهر كنطاق control-plane فقط؛ لا مرضى، ولا ملاحظات أو رسائل أو prompts أو payloads سريرية.'
                  : 'Cliniverse appears only as a control-plane scope; no patients, clinical notes, messages, prompts, or clinical payloads.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-bold">
              {[isArabic ? 'لا payloads خام' : 'No raw payloads', isArabic ? 'لا attributes للأحداث' : 'No event attributes', isArabic ? 'لا معرّفات مباشرة' : 'No direct identifiers', isArabic ? 'لا بيانات سريرية' : 'No clinical data'].map((label) => (
                <span key={label} className="rounded-full border border-brand-cyan/25 bg-white/60 px-3 py-1.5 text-cyan-800 dark:bg-ink-950/30 dark:text-cyan-200">{label}</span>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="recovery-summary" className="mb-7">
          <h2 id="recovery-summary" className="sr-only">{isArabic ? 'ملخص التعافي' : 'Recovery summary'}</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-ink-800 sm:p-5">
                <div className="text-xs text-ink-950/50 dark:text-paper-50/50">{card.label}</div>
                <div className={`mt-1 text-3xl font-extrabold ${card.tone}`}>{card.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="source-posture" className="mb-7 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-black/[0.08] bg-white p-5 dark:border-white/[0.08] dark:bg-ink-800 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="source-posture" className="text-base font-extrabold">{isArabic ? 'حالة مصادر الثقة' : 'Trust source posture'}</h2>
                <p className="mt-1 text-xs leading-6 text-ink-950/50 dark:text-paper-50/50">
                  {isArabic ? 'الإسقاط الحالي صادق بشأن موصلات البيانات التشغيلية غير المفعّلة.' : 'The current projection is explicit about runtime data adapters that are not yet active.'}
                </p>
              </div>
              <span className="rounded-full border border-attention/25 bg-attention/[0.08] px-3 py-1 text-[11px] font-bold text-attention-dark dark:text-attention">
                {isArabic ? 'لا ادعاءات مفبركة' : 'No fabricated claims'}
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
                <div className="text-xs text-ink-950/50 dark:text-paper-50/50">Trust Events</div>
                <div className="mt-1 text-2xl font-extrabold">{snapshot.trust.totalEvents}</div>
                <div className="mt-2 text-[11px] text-ink-950/45 dark:text-paper-50/45">{isArabic ? 'آخر حدث:' : 'Latest:'} {formatTimestamp(snapshot.trust.latestOccurredAt, locale)}</div>
              </div>
              <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
                <div className="text-xs text-ink-950/50 dark:text-paper-50/50">Evidence Records</div>
                <div className="mt-1 text-2xl font-extrabold">{snapshot.evidence.total}</div>
                <div className="mt-2 text-[11px] text-ink-950/45 dark:text-paper-50/45">{isArabic ? 'آخر دليل:' : 'Latest:'} {formatTimestamp(snapshot.evidence.latestGeneratedAt, locale)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/[0.08] bg-white p-5 dark:border-white/[0.08] dark:bg-ink-800 sm:p-6">
            <h2 className="text-base font-extrabold">{isArabic ? 'حدود المنتجات' : 'Product boundaries'}</h2>
            <p className="mt-1 text-xs leading-6 text-ink-950/50 dark:text-paper-50/50">
              {isArabic ? 'عدد أهداف التعافي في كل نطاق، دون دمج سلطات البيانات.' : 'Recovery objectives per scope, without combining data authority.'}
            </p>
            <div className="mt-4 space-y-2">
              {PRODUCT_ORDER.map((product) => (
                <div key={product} className="flex items-center justify-between rounded-xl border border-black/[0.06] px-3 py-2.5 dark:border-white/[0.06]">
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${productClasses(product)}`}>{productLabels[product]}</span>
                  <strong>{productCounts[product]}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <IncidentLineageSection
          lineage={snapshot.incidentLineage}
          isArabic={isArabic}
          locale={locale}
          productLabels={productLabels}
        />

        <section aria-labelledby="recovery-matrix" className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white dark:border-white/[0.08] dark:bg-ink-800">
          <div className="border-b border-black/[0.07] p-5 dark:border-white/[0.07] sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="recovery-matrix" className="text-lg font-extrabold">{isArabic ? 'مصفوفة الاسترداد' : 'Recovery matrix'}</h2>
                <p className="mt-1 text-xs leading-6 text-ink-950/50 dark:text-paper-50/50">
                  {isArabic ? 'RTO وRPO أهداف داخلية ما لم تكن الحالة مثبتة ومدعومة بالدليل.' : 'RTO and RPO are internal targets unless the status is verified and evidence-backed.'}
                </p>
              </div>
              <div className="text-[11px] text-ink-950/45 dark:text-paper-50/45">
                {isArabic ? `مراجع غير محلولة: ${summary.unresolvedEvidenceRefs}` : `Unresolved evidence refs: ${summary.unresolvedEvidenceRefs}`}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-start text-xs">
              <caption className="sr-only">{isArabic ? 'أهداف التعافي وحالة الإثبات' : 'Recovery objectives and evidence status'}</caption>
              <thead className="bg-black/[0.025] text-ink-950/50 dark:bg-white/[0.025] dark:text-paper-50/50">
                <tr>
                  <th scope="col" className="px-5 py-3 text-start font-bold">{isArabic ? 'الخدمة والنطاق' : 'Service & scope'}</th>
                  <th scope="col" className="px-4 py-3 text-start font-bold">{isArabic ? 'الطبقة' : 'Tier'}</th>
                  <th scope="col" className="px-4 py-3 text-start font-bold">RTO / RPO</th>
                  <th scope="col" className="px-4 py-3 text-start font-bold">{isArabic ? 'الجاهزية' : 'Readiness'}</th>
                  <th scope="col" className="px-4 py-3 text-start font-bold">{isArabic ? 'الدليل' : 'Evidence'}</th>
                  <th scope="col" className="px-5 py-3 text-start font-bold">{isArabic ? 'الوضع المتدهور الآمن' : 'Safe degraded mode'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {snapshot.recovery.objectives.map((objective) => (
                  <tr key={objective.service} className="align-top">
                    <td className="px-5 py-4">
                      <div className="font-mono text-[12px] font-bold">{objective.service}</div>
                      <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${productClasses(objective.product)}`}>{productLabels[objective.product]}</span>
                    </td>
                    <td className="px-4 py-4 font-bold">T{objective.tier}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div><span className="text-ink-950/45 dark:text-paper-50/45">RTO</span> {objective.rtoMinutes}m</div>
                      <div className="mt-1"><span className="text-ink-950/45 dark:text-paper-50/45">RPO</span> {objective.rpoMinutes}m</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${readinessClasses(objective.readiness)}`}>{readinessLabels[objective.readiness]}</span>
                      <div className="mt-2 text-[10px] text-ink-950/45 dark:text-paper-50/45">
                        {objective.objectiveStatus === 'verified' ? (isArabic ? 'مثبت' : 'Verified') : (isArabic ? 'هدف' : 'Target')}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold">{objective.evidence.resolved}/{objective.evidence.referenced} {isArabic ? 'محلول' : 'resolved'}</div>
                      <div className="mt-1 text-[10px] text-ink-950/45 dark:text-paper-50/45">{isArabic ? `تمرين كل ${objective.restoreDrillCadenceDays} يومًا` : `Drill every ${objective.restoreDrillCadenceDays}d`}</div>
                    </td>
                    <td className="max-w-md px-5 py-4 leading-5 text-ink-950/60 dark:text-paper-50/60">{objective.degradedMode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="mt-5 flex flex-col gap-1 px-1 text-[11px] leading-5 text-ink-950/45 dark:text-paper-50/45 sm:flex-row sm:justify-between">
          <span>{isArabic ? 'لا توجد إجراءات replay أو remediation أو نشر أو entitlement في هذه الواجهة.' : 'This surface exposes no replay, remediation, deployment, or entitlement actions.'}</span>
          <span>{isArabic ? 'المصدر: NTRP Operations Read Model v1' : 'Source: NTRP Operations Read Model v1'}</span>
        </footer>
      </div>
    </div>
  )
}
