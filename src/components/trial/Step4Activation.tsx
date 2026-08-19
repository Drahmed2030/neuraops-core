'use client'

import { useEffect, useState } from 'react'
import { useUI } from '@/lib/ui-context'
import { Confetti } from '@/components/ui/Confetti'
import type { TrialFormData } from '@/lib/use-trial-wizard'

interface Props {
  data: TrialFormData
  demoSlug: string
  onDone: () => void
}

const CHECKS = [
  { key: 'kb', icon: '⚙️', labelKey: 'check1' },
  { key: 'agents', icon: '🤖', labelKey: 'check2' },
  { key: 'channel', icon: '🔗', labelKey: 'check3' },
  { key: 'test', icon: '🧪', labelKey: 'check4' },
] as const

export function Step4Activation({ data, demoSlug, onDone }: Props) {
  const { t } = useUI()
  const [doneChecks, setDoneChecks] = useState<Set<string>>(new Set())
  const [showSuccess, setShowSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function runSequence() {
      for (const check of CHECKS) {
        await new Promise(r => setTimeout(r, 700 + Math.random() * 500))
        if (cancelled) return
        setDoneChecks(prev => new Set(prev).add(check.key))
      }
      await new Promise(r => setTimeout(r, 500))
      if (!cancelled) {
        setShowSuccess(true)
        onDone()
      }
    }
    runSequence()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const demoUrl = `neuraops.app/demo/${demoSlug}`

  function handleCopy() {
    navigator.clipboard.writeText(demoUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: 'NeuraOps', text: data.storeName, url: `https://${demoUrl}` })
    } else {
      navigator.clipboard.writeText(demoUrl)
    }
  }

  if (!showSuccess) {
    return (
      <section className="animate-fade-slide">
        <div className="text-center py-7 pb-8">
          <div className="text-[12.5px] font-semibold text-gold uppercase tracking-wide mb-2.5 font-sans">
            {t.s4Eyebrow}
          </div>
          <h1 className="text-[clamp(1.5rem,4vw,1.9rem)] font-bold tracking-tight mb-2.5">{t.s4Title}</h1>
          <p className="text-[14.5px] text-ink-950/60 dark:text-paper-50/60">{t.s4Sub}</p>
        </div>

        <div className="flex flex-col gap-2.5">
          {CHECKS.map(check => {
            const isDone = doneChecks.has(check.key)
            return (
              <div
                key={check.key}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-400 ${
                  isDone
                    ? 'border-gold/35 bg-gold/10 opacity-100'
                    : 'border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800 opacity-40'
                }`}
              >
                <div className={`w-[30px] h-[30px] rounded-[9px] flex items-center justify-center text-sm flex-shrink-0 ${
                  isDone ? 'bg-gold' : 'bg-gold/10'
                }`}>
                  {check.icon}
                </div>
                <div className="flex-1 text-[13.5px] font-semibold">
                  {t[check.labelKey as keyof typeof t] as string}
                </div>
                {isDone ? (
                  <span className="text-green-500 font-bold text-[15px]">✓</span>
                ) : (
                  <span className="w-4 h-4 border-2 border-black/15 dark:border-white/15 border-t-gold rounded-full animate-spin" />
                )}
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <section className="animate-fade-slide">
      <Confetti trigger={showSuccess} />

      <div className="text-center py-5">
        <div className="w-[84px] h-[84px] rounded-full bg-gold/10 border-2 border-gold flex items-center justify-center text-[36px] mx-auto mb-6 animate-success-pop">
          ✓
        </div>
        <h1 className="text-[clamp(1.5rem,4vw,1.9rem)] font-bold tracking-tight mb-2.5">{t.successTitle}</h1>
        <p className="text-[14.5px] text-ink-950/60 dark:text-paper-50/60 max-w-[420px] mx-auto">
          {t.successSub}
        </p>
      </div>

      <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800 p-5 mb-3.5">
        <Row label={t.revStore} value={data.storeName || '—'} />
        <Row label={t.revAgents} value={t.revAgentsVal} />
        <Row label={t.revPlan} value={t.revPlanVal} last />
      </div>

      <div className="flex items-center gap-2.5 rounded-xl border-[1.5px] border-gold/35 bg-white dark:bg-ink-800 px-4 py-3 mb-6" dir="ltr">
        <span className="flex-1 text-[13px] font-sans text-ink-950/60 dark:text-paper-50/60 overflow-hidden text-ellipsis whitespace-nowrap">
          {demoUrl}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={`flex-shrink-0 px-3.5 py-2 rounded-lg text-[12.5px] font-bold transition-colors font-sans ${
            copied ? 'bg-green-500 text-white' : 'bg-gold text-ink-950 hover:bg-gold-hover'
          }`}
        >
          {copied ? t.copiedBtn : t.copyBtn}
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => alert('Demo redirect coming soon')}
          className="w-full py-3.5 rounded-xl bg-gold text-ink-950 font-semibold text-[15px] hover:bg-gold-hover hover:-translate-y-0.5 transition-all shadow-gold-glow"
        >
          {t.tryDemoBtn}
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="w-full py-3.5 rounded-xl border-[1.5px] border-black/10 dark:border-white/10 font-medium text-[15px] hover:border-gold transition-colors"
        >
          {t.shareBtn}
        </button>
      </div>

      <div className="flex items-center justify-center gap-4 mt-5 text-[12px] text-ink-950/45 dark:text-paper-50/45 flex-wrap">
        <span>🔒 {t.trust1}</span>
        <span>✅ {t.trust2}</span>
      </div>
    </section>
  )
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between items-start gap-3 py-2.5 ${!last ? 'border-b border-black/[0.07] dark:border-white/[0.07]' : ''}`}>
      <span className="text-[13px] text-ink-950/50 dark:text-paper-50/50 flex-shrink-0">{label}</span>
      <span className="text-[13.5px] font-semibold text-end">{value}</span>
    </div>
  )
}
