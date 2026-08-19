'use client'

import { useUI } from '@/lib/ui-context'
import type { TrialFormData } from '@/lib/use-trial-wizard'

interface Props {
  data: TrialFormData
  updateData: (patch: Partial<TrialFormData>) => void
  canProceed: boolean
  onNext: () => void
  onBack: () => void
}

const PHONE_CODES = [
  { value: '+966', label: '🇸🇦 +966' },
  { value: '+971', label: '🇦🇪 +971' },
  { value: '+965', label: '🇰🇼 +965' },
  { value: '+973', label: '🇧🇭 +973' },
  { value: '+974', label: '🇶🇦 +974' },
  { value: '+968', label: '🇴🇲 +968' },
  { value: '+20', label: '🇪🇬 +20' },
  { value: '+1', label: '🇺🇸 +1' },
]

const inputClass =
  'w-full px-4 py-3 rounded-xl border-[1.5px] border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800 text-[14.5px] outline-none transition-all focus:border-gold focus:shadow-[0_0_0_3px_rgba(201,169,97,0.14)]'

export function Step2StoreInfo({ data, updateData, canProceed, onNext, onBack }: Props) {
  const { t } = useUI()

  return (
    <section className="animate-fade-slide">
      <div className="text-center py-7 pb-8">
        <div className="text-[12.5px] font-semibold text-gold uppercase tracking-wide mb-2.5 font-sans">
          {t.s2Eyebrow}
        </div>
        <h1 className="text-[clamp(1.5rem,4vw,1.9rem)] font-bold tracking-tight mb-2.5">{t.s2Title}</h1>
        <p className="text-[14.5px] text-ink-950/60 dark:text-paper-50/60 max-w-[420px] mx-auto leading-relaxed">
          {t.s2Sub}
        </p>
      </div>

      <div className="mb-[18px]">
        <label className="block text-[13.5px] font-semibold mb-2">{t.fStoreName}</label>
        <input
          type="text"
          className={inputClass}
          placeholder={t.fStoreNamePh}
          value={data.storeName}
          onChange={e => updateData({ storeName: e.target.value })}
        />
      </div>

      <div className="mb-[18px]">
        <label className="block text-[13.5px] font-semibold mb-2">{t.fPhone}</label>
        <div className="flex gap-2" dir="ltr">
          <select
            className="w-[92px] px-2.5 py-3 rounded-xl border-[1.5px] border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800 text-[14px] text-center font-semibold outline-none"
            value={data.phoneCode}
            onChange={e => updateData({ phoneCode: e.target.value })}
          >
            {PHONE_CODES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input
            type="tel"
            className={`${inputClass} flex-1 text-left`}
            placeholder="5X XXX XXXX"
            value={data.phone}
            onChange={e => updateData({ phone: e.target.value })}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-[13.5px] font-semibold mb-2">{t.fCity}</label>
          <select
            className={inputClass}
            value={data.city}
            onChange={e => updateData({ city: e.target.value })}
          >
            <option value="">{t.fCityChoose}</option>
            <option value="buraidah">{t.cBuraidah}</option>
            <option value="unaizah">{t.cUnaizah}</option>
            <option value="riyadh">{t.cRiyadh}</option>
            <option value="jeddah">{t.cJeddah}</option>
            <option value="dammam">{t.cDammam}</option>
            <option value="dubai">{t.cDubai}</option>
            <option value="other">{t.cOther}</option>
          </select>
        </div>
        <div>
          <label className="block text-[13.5px] font-semibold mb-2">{t.fChannel}</label>
          <select
            className={inputClass}
            value={data.channel}
            onChange={e => updateData({ channel: e.target.value })}
          >
            <option value="">{t.fChannelChoose}</option>
            <option value="whatsapp">{t.chWhats}</option>
            <option value="instagram">{t.chInsta}</option>
            <option value="both">{t.chBoth}</option>
            <option value="web">{t.chWeb}</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2.5 mt-7">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3.5 rounded-xl border-[1.5px] border-black/10 dark:border-white/10 font-medium text-[15px] hover:border-gold transition-colors"
        >
          {t.backBtn}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="flex-1 py-3.5 rounded-xl bg-gold text-ink-950 font-semibold text-[15px] disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-gold-hover enabled:hover:-translate-y-0.5 transition-all shadow-gold-glow"
        >
          {t.nextBtn}
        </button>
      </div>
    </section>
  )
}
