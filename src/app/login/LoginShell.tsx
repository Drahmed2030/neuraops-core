'use client'

import { useUI } from '@/lib/ui-context'
import { login } from './actions'

function CorporateMark() {
  return <div className="flex items-center gap-3" dir="ltr">
    <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-[13px] border border-[#6657d9]/20 bg-gradient-to-br from-[#f4f5fb] to-[#e8e9f8] shadow-[0_8px_30px_rgba(102,87,217,.12)]">
      <span className="text-[15px] font-black tracking-[-.12em] text-[#08111f]">N<span className="text-[#6657d9]">P</span></span>
      <span className="absolute inset-x-2 bottom-1 h-px bg-gradient-to-r from-[#43c7d9] via-[#8d84f2] to-transparent"/>
    </span>
    <span><span className="block text-[15px] font-extrabold tracking-[-.03em] text-[#08111f]">Neura<span className="text-[#6657d9]">Ops</span></span><span className="block text-[9.5px] font-medium tracking-[.02em] text-[#667080]">Company Operations</span></span>
  </div>
}

export default function LoginShell({ error }: { error?: string }) {
  const { lang, toggleLang, mounted } = useUI()
  const ar = lang === 'ar'
  return <main dir={ar?'rtl':'ltr'} className="relative min-h-screen overflow-hidden bg-[#f5f6fa] text-[#08111f]">
    <div className="pointer-events-none absolute -left-32 -top-40 h-[520px] w-[520px] rounded-full bg-[#8d84f2]/12 blur-3xl"/>
    <div className="pointer-events-none absolute -bottom-48 right-[-8rem] h-[560px] w-[560px] rounded-full bg-[#43c7d9]/10 blur-3xl"/>
    <div className="relative mx-auto grid min-h-screen max-w-[1180px] items-center gap-12 px-5 py-10 lg:grid-cols-[1.08fr_.82fr] lg:px-10">
      <section className="hidden lg:block">
        <div className="mb-10"><CorporateMark/></div>
        <p className="mb-4 text-[11px] font-bold tracking-[.18em] text-[#6657d9]">NEURAOPS / CONTROL</p>
        <h1 className="max-w-[650px] text-[58px] font-extrabold leading-[1.02] tracking-[-.055em]">Operational clarity,<br/><span className="bg-gradient-to-r from-[#6657d9] to-[#43aebf] bg-clip-text text-transparent">without losing control.</span></h1>
        <p className="mt-6 max-w-[570px] text-[15px] leading-7 text-[#667080]">A private operating surface for verified company work, independent QA, evidence, cost and execution gates.</p>
        <div className="mt-10 flex gap-2">{['Verified work','Independent QA','Cost evidence'].map(x=><span key={x} className="rounded-full border border-[#dfe2ec] bg-white/70 px-3 py-2 text-[10.5px] font-semibold text-[#566171]">{x}</span>)}</div>
      </section>
      <section className="w-full max-w-[450px] justify-self-center lg:justify-self-end">
        <div className="mb-5 flex items-center justify-between gap-4 lg:hidden"><CorporateMark/><button type="button" onClick={toggleLang} disabled={!mounted} className="rounded-xl border border-[#dfe2ec] bg-white/70 px-3 py-2 text-[12px] font-semibold disabled:opacity-50">{ar?'EN':'العربية'}</button></div>
        <div className="mb-4 hidden justify-end lg:flex"><button type="button" onClick={toggleLang} disabled={!mounted} className="rounded-xl border border-[#dfe2ec] bg-white/70 px-3 py-2 text-[12px] font-semibold disabled:opacity-50">{ar?'EN':'العربية'}</button></div>
        <div className="rounded-[28px] border border-[#dfe2ec] bg-white/85 p-6 shadow-[0_24px_80px_rgba(8,17,31,.09)] backdrop-blur-xl sm:p-8">
          <div className="mb-7"><div className="mb-3 inline-flex items-center rounded-full border border-[#6657d9]/15 bg-[#6657d9]/[.06] px-2.5 py-1 text-[10.5px] font-bold text-[#6657d9]">{ar?'وصول مؤسسي محمي':'Protected company access'}</div><h2 className="text-[28px] font-extrabold tracking-[-.035em]">{ar?'الدخول إلى NeuraOps Control':'Enter NeuraOps Control'}</h2><p className="mt-2 text-[13px] leading-6 text-[#707988]">{ar?'مساحة خاصة بالمؤسس والمشغلين المخولين فقط.':'Private to the founder and explicitly authorised operators.'}</p></div>
          {error?<div role="alert" className="mb-5 rounded-2xl border border-red-500/15 bg-red-500/[.05] px-4 py-3 text-[12.5px] text-red-600">{ar?'تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.':'Sign-in failed. Check your credentials and try again.'}</div>:null}
          <form action={login} className="space-y-4">
            <div><label htmlFor="email" className="mb-1.5 block text-[12px] font-bold">{ar?'البريد الإلكتروني':'Email'}</label><input id="email" name="email" type="email" autoComplete="email" required dir="ltr" className="w-full rounded-2xl border border-[#d9dde7] bg-[#fafbfc] px-4 py-3.5 text-[14px] outline-none transition focus:border-[#8d84f2] focus:ring-4 focus:ring-[#6657d9]/[.07]" placeholder="name@example.com"/></div>
            <div><label htmlFor="password" className="mb-1.5 block text-[12px] font-bold">{ar?'كلمة المرور':'Password'}</label><input id="password" name="password" type="password" autoComplete="current-password" required dir="ltr" className="w-full rounded-2xl border border-[#d9dde7] bg-[#fafbfc] px-4 py-3.5 text-[14px] outline-none transition focus:border-[#8d84f2] focus:ring-4 focus:ring-[#6657d9]/[.07]"/></div>
            <button type="submit" className="w-full rounded-2xl bg-gradient-to-r from-[#6657d9] via-[#7566e4] to-[#43aebf] px-4 py-3.5 text-[13px] font-extrabold text-white shadow-[0_10px_28px_rgba(102,87,217,.22)] transition hover:brightness-[1.04] active:scale-[.99]">{ar?'دخول آمن':'Secure sign in'}</button>
          </form>
          <div className="mt-5 border-t border-[#e7e9ef] pt-4 text-[10.5px] leading-5 text-[#8a92a0]">{ar?'يتم التحقق من الهوية وصلاحية المشغل قبل إتاحة بيانات الشركة.':'Identity and operator authority are verified before company data is exposed.'}</div>
        </div>
      </section>
    </div>
  </main>
}
