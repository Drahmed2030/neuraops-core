import type { HTMLAttributes, ReactNode } from 'react'

type AlertTone = 'info' | 'success' | 'attention' | 'critical'

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: AlertTone
  title: ReactNode
  children: ReactNode
}

const toneClasses: Record<AlertTone, string> = {
  info: 'border-brand-primary/25 bg-brand-primary/[0.07] text-brand-primary dark:text-brand-azure',
  success: 'border-green-600/25 bg-green-600/[0.07] text-green-700 dark:text-green-400',
  attention: 'border-attention/25 bg-attention/[0.07] text-attention-dark dark:text-attention',
  critical: 'border-red-500/25 bg-red-500/[0.07] text-red-600 dark:text-red-400',
}

export function Alert({
  tone = 'info',
  title,
  children,
  className = '',
  ...props
}: AlertProps) {
  return (
    <div
      role={tone === 'critical' ? 'alert' : 'status'}
      className={`flex gap-3 rounded-2xl border p-4 ${toneClasses[tone]} ${className}`}
      {...props}
    >
      <span aria-hidden="true" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-current" />
      <div className="min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-[13px] leading-5 text-ink-950/70 dark:text-paper-50/70">{children}</div>
      </div>
    </div>
  )
}
