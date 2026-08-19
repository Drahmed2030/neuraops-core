'use client'

import { useUI } from '@/lib/ui-context'
import type { TrialFormData } from '@/lib/use-trial-wizard'

interface Props {
  data: TrialFormData
  updateData: (patch: Partial<TrialFormData>) => void
  onNext: () => void
}

const TYPES = [
  { id: 'cafe', icon: '☕', nameKey: 'type1Name', descKey: 'type1Desc' },
  { id: 'restaurant', icon: '🍽️', nameKey: 'type2Name', descKey: 'type2Desc' },
  { id: 'retail', icon: '🛍️', nameKey: 'type3Name', descKey: 'type3Desc' },
  { id: 'other', icon: '⚙️', nameKey: 'other', descKey: 'type4Desc' },
] as const

export function Step1StoreType({ data, updateData, onNext }: Props) {
  const { t } = useUI()

  function selectType(id: string) {
    updateData({ type: id })
    setTimeout(onNext, 280)
  }

  return (
    <section className="animate-fade-slide">
      <div className="text-center py-7 pb-8">
        <div className="text-[12.5px] font-semibold text-gold uppercase tracking-wide mb-2.5 font-sans">
          {t.s1Eyebrow}
        </div>
        <h1 className="text-[clamp(1.5rem,4vw,1.9rem)] font-bold tracking-tight mb-2.5">{t.s1Title}</h1>
        <p className="text-[14.5px] text-ink-950/60 dark:text-paper-50/60 max-w-[420px] mx-auto leading-relaxed">
          {t.s1Sub}
        </p>
      </div>

      <div className="grid gap-3 mb-2">
        {TYPES.map(type => {
          const isSelected = data.type === type.id
          const name = type.id === 'other' ? t.type4Name : (t[type.nameKey as keyof typeof t] as string)
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => selectType(type.id)}
              className={`flex items-center gap-4 p-[18px] rounded-2xl border-[1.5px] text-start transition-all ${
                isSelected
                  ? 'border-gold bg-gold/10 ring-1 ring-gold'
                  : 'border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800 hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-lg'
              }`}
            >
              <div className={`w-12 h-12 rounded-[13px] flex items-center justify-center text-[22px] flex-shrink-0 ${
                isSelected ? 'bg-gold' : 'bg-gold/10'
              }`}>
                {type.icon}
              </div>
              <div className="flex-1">
                <div className="text-[15.5px] font-bold mb-0.5">{name}</div>
                <div className="text-[13px] text-ink-950/50 dark:text-paper-50/50">
                  {t[type.descKey as keyof typeof t] as string}
                </div>
              </div>
              <div className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all ${
                isSelected ? 'bg-gold border-gold text-ink-950' : 'border-black/15 dark:border-white/15'
              }`}>
                {isSelected && '✓'}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
