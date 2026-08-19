'use client'

import { useUI } from '@/lib/ui-context'

interface StepProgressProps {
  current: number
  total: number
}

export function StepProgress({ current, total }: StepProgressProps) {
  const { t } = useUI()
  const stepNameKey = `stepName${current}` as keyof typeof t
  const pct = (current / total) * 100

  return (
    <div className="pt-8 pb-2">
      <div className="h-1 rounded-full bg-black/[0.07] dark:bg-white/[0.07] overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold to-gold-hover transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[12.5px] font-medium text-ink-950/45 dark:text-paper-50/45" dir="ltr">
        <span>
          <span className="text-gold font-bold">{current}</span> / {total}
        </span>
        <span>{t[stepNameKey] as string}</span>
      </div>
    </div>
  )
}
