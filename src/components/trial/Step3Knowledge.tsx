'use client'

import { useRef, useState } from 'react'
import { useUI } from '@/lib/ui-context'
import type { TrialFormData } from '@/lib/use-trial-wizard'

interface Props {
  data: TrialFormData
  updateData: (patch: Partial<TrialFormData>) => void
  toggleTopic: (tag: string) => void
  onNext: () => void
  onBack: () => void
  storeSlug: string | null
}

const TOPICS = [
  { tag: 'prices', key: 'tag1' },
  { tag: 'hours', key: 'tag2' },
  { tag: 'shipping', key: 'tag3' },
  { tag: 'returns', key: 'tag4' },
  { tag: 'stock', key: 'tag5' },
  { tag: 'payment', key: 'tag6' },
  { tag: 'location', key: 'tag7' },
  { tag: 'offers', key: 'tag8' },
] as const

export function Step3Knowledge({ data, updateData, toggleTopic, onNext, onBack, storeSlug }: Props) {
  const { t } = useUI()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activating, setActivating] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      updateData({ fileUploaded: true })
    }
  }

  /**
   * This is the real moment the 7-day proof clock starts: activating
   * the chosen channel via /api/trial/activate-channel. If storeSlug
   * is somehow missing (create-store failed silently upstream), we
   * still proceed to step 4 since the chat itself will also trigger
   * the clock on first real message as a fallback.
   */
  async function handleActivate() {
    setActivating(true)
    if (storeSlug) {
      try {
        await fetch('/api/trial/activate-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId: storeSlug,
            channel: data.channel || 'web_widget',
          }),
        })
      } catch {
        // Non-fatal: /api/chat's first-message fallback still starts
        // the clock if this call fails for any reason.
      }
    }
    setActivating(false)
    onNext()
  }

  return (
    <section className="animate-fade-slide">
      <div className="text-center py-7 pb-8">
        <div className="text-[12.5px] font-semibold text-gold uppercase tracking-wide mb-2.5 font-sans">
          {t.s3Eyebrow}
        </div>
        <h1 className="text-[clamp(1.5rem,4vw,1.9rem)] font-bold tracking-tight mb-2.5">{t.s3Title}</h1>
        <p className="text-[14.5px] text-ink-950/60 dark:text-paper-50/60 max-w-[420px] mx-auto leading-relaxed">
          {t.s3Sub}
        </p>
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={`w-full border-[1.5px] border-dashed rounded-2xl p-7 text-center transition-all mb-5 ${
          data.fileUploaded
            ? 'border-solid border-green-500 bg-green-500/[0.06]'
            : 'border-black/15 dark:border-white/15 bg-white dark:bg-ink-800 hover:border-gold hover:bg-gold/10'
        }`}
      >
        <div className="text-[28px] mb-2.5">📄</div>
        <div className="text-[14px] font-semibold mb-1">
          {data.fileUploaded ? t.uploadedFile : t.uploadTitle}
        </div>
        <div className="text-[12.5px] text-ink-950/50 dark:text-paper-50/50">{t.uploadHint}</div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          onChange={handleFileChange}
        />
      </button>

      <div className="flex items-center gap-3.5 my-5 text-[12.5px] font-medium text-ink-950/40 dark:text-paper-50/40">
        <span className="flex-1 h-px bg-black/10 dark:bg-white/10" />
        {t.orDivider}
        <span className="flex-1 h-px bg-black/10 dark:bg-white/10" />
      </div>

      <div className="mb-5">
        <label className="block text-[13.5px] font-semibold mb-2">
          {t.fTopics} <span className="font-normal text-ink-950/40 dark:text-paper-50/40 text-[12.5px]">{t.optional}</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map(topic => {
            const isSelected = data.topics.includes(topic.tag)
            return (
              <button
                key={topic.tag}
                type="button"
                onClick={() => toggleTopic(topic.tag)}
                className={`px-4 py-2 rounded-full border-[1.5px] text-[13px] font-medium transition-all ${
                  isSelected
                    ? 'bg-gold border-gold text-ink-950 font-semibold'
                    : 'border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800 text-ink-950/60 dark:text-paper-50/60 hover:border-gold/40'
                }`}
              >
                {t[topic.key as keyof typeof t] as string}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mb-[18px]">
        <label className="block text-[13.5px] font-semibold mb-2">
          {t.fHours} <span className="font-normal text-ink-950/40 dark:text-paper-50/40 text-[12.5px]">{t.optional}</span>
        </label>
        <input
          type="text"
          className="w-full px-4 py-3 rounded-xl border-[1.5px] border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800 text-[14.5px] outline-none focus:border-gold focus:shadow-[0_0_0_3px_rgba(201,169,97,0.14)] transition-all"
          placeholder={t.fHoursPh}
          value={data.hours}
          onChange={e => updateData({ hours: e.target.value })}
        />
      </div>

      <div className="flex gap-2.5 mt-7">
        <button
          type="button"
          onClick={onBack}
          disabled={activating}
          className="px-6 py-3.5 rounded-xl border-[1.5px] border-black/10 dark:border-white/10 font-medium text-[15px] hover:border-gold transition-colors disabled:opacity-40"
        >
          {t.backBtn}
        </button>
        <button
          type="button"
          onClick={handleActivate}
          disabled={activating}
          className="flex-1 py-3.5 rounded-xl bg-gold text-ink-950 font-semibold text-[15px] enabled:hover:bg-gold-hover enabled:hover:-translate-y-0.5 transition-all shadow-gold-glow disabled:opacity-60"
        >
          {t.nextBtnActivate}
        </button>
      </div>
    </section>
  )
}
