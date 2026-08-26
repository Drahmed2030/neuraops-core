'use client'

import Link from 'next/link'
import { BrandMark } from '@/components/brand/BrandMark'
import { useUI } from '@/lib/ui-context'
import { useTrialWizard } from '@/lib/use-trial-wizard'
import { StepProgress } from '@/components/ui/StepProgress'
import { Step1StoreType } from '@/components/trial/Step1StoreType'
import { Step2StoreInfo } from '@/components/trial/Step2StoreInfo'
import { Step3Knowledge } from '@/components/trial/Step3Knowledge'
import { Step4Activation } from '@/components/trial/Step4Activation'

export default function TrialPage() {
  const { t, isDark, toggleLang, toggleTheme } = useUI()
  const wizard = useTrialWizard()

  /**
   * Step 2 -> Step 3 transition now actually creates the store
   * record via /api/trial/create-store before advancing. If it
   * fails, the wizard stays on step 2 and shows the real error —
   * it never silently pretends the account was created.
   */
  async function handleStep2Next() {
    const ok = await wizard.createStore()
    if (ok) {
      wizard.goNext()
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-3 backdrop-blur-xl bg-paper-50/85 dark:bg-ink-950/85 border-b border-black/[0.07] dark:border-white/[0.07]" dir="ltr">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink-950/60 dark:text-paper-50/60 hover:text-ink-950 dark:hover:text-paper-50 px-3 py-2 rounded-lg hover:bg-gold/10 transition-all no-underline">
            <span>→</span>
            {t.backLink}
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="relative w-[42px] h-[26px] rounded-full bg-black/10 dark:bg-white/10 border-none cursor-pointer"
          >
            <span
              className="absolute top-[3px] w-5 h-5 rounded-full bg-white dark:bg-ink-800 flex items-center justify-center text-[10px] transition-[left] duration-300 pointer-events-none"
              style={{ left: isDark ? '19px' : '3px' }}
            >
              {isDark ? '🌙' : '☀️'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleLang}
            className="px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-[12px] font-medium text-ink-950/60 dark:text-paper-50/60 hover:border-gold transition-colors font-sans"
          >
            {t.langBtn}
          </button>
          <Link href="/" className="font-semibold no-underline">
            <BrandMark size={30} />
          </Link>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-5 pb-36">
        <StepProgress current={wizard.step} total={wizard.totalSteps} />

        {wizard.step === 1 && (
          <Step1StoreType data={wizard.data} updateData={wizard.updateData} onNext={wizard.goNext} />
        )}
        {wizard.step === 2 && (
          <Step2StoreInfo
            data={wizard.data}
            updateData={wizard.updateData}
            canProceed={wizard.canProceedStep2 && !wizard.creatingStore}
            onNext={handleStep2Next}
            onBack={wizard.goBack}
            submitting={wizard.creatingStore}
            errorMessage={wizard.createStoreError}
          />
        )}
        {wizard.step === 3 && (
          <Step3Knowledge
            data={wizard.data}
            updateData={wizard.updateData}
            toggleTopic={wizard.toggleTopic}
            onNext={wizard.goNext}
            onBack={wizard.goBack}
            storeSlug={wizard.storeSlug}
          />
        )}
        {wizard.step === 4 && (
          <Step4Activation
            data={wizard.data}
            demoSlug={wizard.demoSlug}
            onDone={() => wizard.setActivationDone(true)}
          />
        )}
      </main>
    </div>
  )
}
