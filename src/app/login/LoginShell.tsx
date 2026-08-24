'use client'

import { useUI } from '@/lib/ui-context'
import { login } from './actions'

export default function LoginShell({ error }: { error?: string }) {
  const { lang, toggleLang, mounted } = useUI()
  const ar = lang === 'ar'

  return (
    <main
      dir={ar ? 'rtl' : 'ltr'}
      className="min-h-screen flex items-center justify-center px-5 py-10 bg-paper-50 text-ink-950 dark:bg-ink-950 dark:text-paper-50"
    >
      <section className="w-full max-w-[440px]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl border border-gold/30 bg-gold/10 flex items-center justify-center font-extrabold text-gold">
              N
            </div>
            <div>
              <div className="text-[15px] font-extrabold tracking-tight">NeuraOps</div>
              <div className="text-[11px] text-ink-950/45 dark:text-paper-50/45">
                {ar ? 'لوحة العمليات الآمنة' : 'Secure operations console'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleLang}
            disabled={!mounted}
            className="rounded-xl border border-black/10 dark:border-white/10 px-3 py-2 text-[12px] font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.05] disabled:opacity-50"
          >
            {ar ? 'EN' : 'العربية'}
          </button>
        </div>

        <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-ink-900 shadow-sm p-6 sm:p-8">
          <div className="mb-7">
            <div className="mb-2 inline-flex items-center rounded-full border border-gold/25 bg-gold/[0.08] px-2.5 py-1 text-[10.5px] font-bold text-gold">
              {ar ? 'وصول إداري محمي' : 'Protected admin access'}
            </div>
            <h1 className="text-[26px] sm:text-[30px] font-extrabold tracking-tight">
              {ar ? 'تسجيل الدخول إلى NeuraOps' : 'Sign in to NeuraOps'}
            </h1>
            <p className="mt-2 text-[13px] leading-6 text-ink-950/55 dark:text-paper-50/55">
              {ar
                ? 'هذه البوابة مخصصة فقط لمسؤولي المتاجر المصرّح لهم.'
                : 'This portal is restricted to authorized store administrators.'}
            </p>
          </div>

          {error ? (
            <div
              role="alert"
              className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400"
            >
              {ar
                ? 'تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور ثم حاول مرة أخرى.'
                : 'Sign-in failed. Check your email and password, then try again.'}
            </div>
          ) : null}

          <form action={login} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[12px] font-bold">
                {ar ? 'البريد الإلكتروني' : 'Email'}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                dir="ltr"
                className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] px-4 py-3 text-[14px] outline-none transition focus:border-gold/60 focus:ring-2 focus:ring-gold/10"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-[12px] font-bold">
                {ar ? 'كلمة المرور' : 'Password'}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                dir="ltr"
                className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] px-4 py-3 text-[14px] outline-none transition focus:border-gold/60 focus:ring-2 focus:ring-gold/10"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-gold px-4 py-3 text-[13px] font-extrabold text-ink-950 transition hover:opacity-90 active:scale-[0.99]"
            >
              {ar ? 'دخول آمن' : 'Secure sign in'}
            </button>
          </form>

          <div className="mt-5 border-t border-black/[0.06] dark:border-white/[0.06] pt-4 text-[10.5px] leading-5 text-ink-950/40 dark:text-paper-50/40">
            {ar
              ? 'يتم التحقق من الهوية وصلاحية الوصول إلى المتجر قبل السماح باستخدام لوحة التحكم.'
              : 'Identity and store access are verified before dashboard access is granted.'}
          </div>
        </div>
      </section>
    </main>
  )
}
