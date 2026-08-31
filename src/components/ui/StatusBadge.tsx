import type { HTMLAttributes, ReactNode } from 'react'

type StatusTone = 'neutral' | 'info' | 'success' | 'attention' | 'critical'

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusTone
  children: ReactNode
}

const toneClasses: Record<StatusTone, string> = {
  neutral: 'border-black/10 bg-black/5 text-ink-950/75 dark:border-white/10 dark:bg-white/10 dark:text-paper-50/75',
  info: 'border-brand-primary/25 bg-brand-primary/10 text-brand-primary dark:text-brand-azure',
  success: 'border-green-600/25 bg-green-600/10 text-green-700 dark:text-green-400',
  attention: 'border-attention/25 bg-attention/10 text-attention-dark dark:text-attention',
  critical: 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400',
}

export function StatusBadge({
  tone = 'neutral',
  className = '',
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold leading-none ${toneClasses[tone]} ${className}`}
      {...props}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}
