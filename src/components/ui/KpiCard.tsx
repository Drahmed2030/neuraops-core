import type { HTMLAttributes, ReactNode } from 'react'

type KpiTone = 'neutral' | 'positive' | 'attention' | 'critical'

type KpiCardProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode
  value: ReactNode
  meta?: ReactNode
  tone?: KpiTone
}

const toneClasses: Record<KpiTone, string> = {
  neutral: 'text-brand-primary',
  positive: 'text-green-600 dark:text-green-400',
  attention: 'text-attention-dark dark:text-attention',
  critical: 'text-red-600 dark:text-red-400',
}

export function KpiCard({
  label,
  value,
  meta,
  tone = 'neutral',
  className = '',
  ...props
}: KpiCardProps) {
  return (
    <section
      className={`rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-ink-800 p-5 ${className}`}
      {...props}
    >
      <div className="text-xs text-ink-950/55 dark:text-paper-50/55">{label}</div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight text-ink-950 dark:text-paper-50">{value}</div>
      {meta && <div className={`mt-2 text-xs font-semibold ${toneClasses[tone]}`}>{meta}</div>}
    </section>
  )
}
