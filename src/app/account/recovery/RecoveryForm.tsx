'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { createRecoveryController } from '@/lib/auth/password-recovery'
import { useUI } from '@/lib/ui-context'

export default function RecoveryForm() {
  const { lang, toggleLang } = useUI()
  const ar = lang === 'ar'
  const controller = useRef<ReturnType<typeof createRecoveryController> | null>(null)
  const initialization = useRef<Promise<boolean> | null>(null)
  const [status, setStatus] = useState('checking')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    if (!initialization.current) {
      // Scrub both query and fragment before constructing any Auth client.
      const fragment = window.location.hash
      window.history.replaceState(null, '', '/account/recovery')
      initialization.current = (async () => {
        try {
          const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'implicit', storageKey: 'neuraops-recovery-memory' },
          })
          controller.current = createRecoveryController(client.auth)
          return await controller.current.begin(fragment)
        } catch { return false }
      })()
    }
    initialization.current.then(valid => { if (active) setStatus(valid ? 'ready' : 'invalid_link') })
    return () => { active = false }
  }, [])
  const messages: Record<string, string> = ar ? {
    checking: 'جارٍ التحقق من رابط الاستعادة…', invalid_link: 'الرابط غير صالح أو انتهت صلاحيته. اطلب رابط استعادة جديدًا.',
    password_short: 'استخدم 12 حرفًا على الأقل.', password_mismatch: 'كلمتا المرور غير متطابقتين.',
    update_failed: 'تعذر تحديث كلمة المرور. حاول مرة أخرى أو اطلب رابطًا جديدًا.',
    signout_failed: 'تم تحديث كلمة المرور، لكن تعذر تأكيد إنهاء الجلسة. أغلق هذه الصفحة وسجّل الدخول من جديد.',
  } : {
    checking: 'Checking your recovery link…', invalid_link: 'This recovery link is invalid or expired. Request a new recovery email.',
    password_short: 'Use at least 12 characters.', password_mismatch: 'The passwords do not match.',
    update_failed: 'Could not update your password. Try again or request a new recovery link.',
    signout_failed: 'Password updated, but session sign-out could not be confirmed. Close this page and sign in again.',
  }
  const usable = ['ready', 'password_short', 'password_mismatch', 'update_failed'].includes(status)
  return <main dir={ar ? 'rtl' : 'ltr'} className="grid min-h-screen place-items-center bg-[#f5f6fa] px-5 text-[#08111f]">
    <section className="w-full max-w-md rounded-[28px] border border-[#dfe2ec] bg-white p-8 shadow-xl">
      <div className="mb-6 flex items-center justify-between"><span className="text-xl font-bold">NeuraOps</span><button type="button" onClick={toggleLang}>{ar ? 'EN' : 'العربية'}</button></div>
      <h1 className="text-2xl font-bold">{ar ? 'تعيين كلمة مرور جديدة' : 'Set a new password'}</h1>
      <p className="my-4 text-sm text-[#667080]">{ar ? 'اختر كلمة مرور خاصة بك من 12 حرفًا على الأقل، ثم سجّل الدخول بالطريقة المعتادة.' : 'Choose your own password with at least 12 characters, then sign in normally.'}</p>
      {messages[status] && <p role={status === 'checking' ? 'status' : 'alert'} className="my-4 text-sm">{messages[status]}</p>}
      {usable && <form className="space-y-4" onSubmit={async event => {
        event.preventDefault()
        if (busy || !controller.current) return
        const form = event.currentTarget
        const data = new FormData(form)
        setBusy(true)
        const result = await controller.current.complete(String(data.get('password') ?? ''), String(data.get('confirmation') ?? ''), () => { form.reset(); data.delete('password'); data.delete('confirmation') })
        setBusy(false)
        if (result === 'complete') { form.reset(); window.location.replace('/login'); return }
        if (result === 'signout_failed' || result === 'invalid_link') form.reset()
        setStatus(result)
      }}>
        <label className="block text-sm">{ar ? 'كلمة المرور الجديدة' : 'New password'}<input name="password" type="password" minLength={12} required autoComplete="new-password" dir="ltr" className="mt-2 w-full rounded-xl border border-[#d9dde7] p-3" /></label>
        <label className="block text-sm">{ar ? 'تأكيد كلمة المرور' : 'Confirm password'}<input name="confirmation" type="password" minLength={12} required autoComplete="new-password" dir="ltr" className="mt-2 w-full rounded-xl border border-[#d9dde7] p-3" /></label>
        <button disabled={busy} className="w-full rounded-xl bg-[#6657d9] p-3 font-semibold text-white disabled:opacity-50">{busy ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : (ar ? 'حفظ والعودة لتسجيل الدخول' : 'Save and return to sign in')}</button>
      </form>}
      <a href="/login" className="mt-6 block text-sm text-[#6657d9]">{ar ? 'العودة لتسجيل الدخول' : 'Back to sign in'}</a>
    </section>
  </main>
}
