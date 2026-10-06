import { redirect } from 'next/navigation'
import { requireOperationsAccess } from '@/lib/auth/require-operations-access'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type Snapshot = {
  generated_at: string
  agents: Array<{ name: string; status: string }>
  work: { total: number; legacy_pending: number; active: number; waiting_approval: number; held: number; completed: number }
  qa: { reviews: number; pass: number; hold: number; escalate: number; fail: number }
  cost: { receipts: number; total_usd: number | string }
  controls: Record<string,{enabled:boolean}>
  providers: Record<string,{enabled:boolean;max_task_budget_usd:number|string;allowed_data_classes:string[]}>
}

function Gate({ label, enabled }: { label:string; enabled:boolean }) {
  return <div className="flex items-center justify-between border-b border-white/10 py-3 last:border-0"><span className="text-sm text-slate-300">{label}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${enabled?'bg-cyan-300/15 text-cyan-200':'bg-white/7 text-slate-400'}`}>{enabled?'ENABLED':'LOCKED'}</span></div>
}

export default async function CompanyControlPage() {
  const access = await requireOperationsAccess()
  if (!access.ok) {
    if (access.status === 401) redirect('/login')
    if (access.status === 403) return <main className="min-h-screen bg-[#08111f] p-8 text-white"><h1 className="text-2xl font-bold">Access denied</h1><p className="mt-3 text-slate-400">This surface is restricted to authorised NeuraOps operators.</p></main>
    return <main className="min-h-screen bg-[#08111f] p-8 text-white"><h1 className="text-2xl font-bold">Control unavailable</h1><p className="mt-3 text-slate-400">Operator allowlist is not configured. Fail-closed protection is active.</p></main>
  }

  const { data, error } = await supabaseAdmin.rpc('company_control_snapshot')
  if (error || !data) return <main className="min-h-screen bg-[#08111f] p-8 text-white"><h1 className="text-2xl font-bold">Control unavailable</h1><p className="mt-3 text-slate-400">Company snapshot could not be verified.</p></main>
  const s = data as Snapshot
  const spend = Number(s.cost.total_usd || 0)

  return <main className="min-h-screen bg-[#08111f] text-white">
    <div className="mx-auto max-w-[1240px] px-5 py-8 md:px-8 md:py-12">
      <header className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div><div className="mb-3 flex items-center gap-3"><span className="h-3 w-3 rounded-full bg-gradient-to-br from-[#43c7d9] to-[#6657d9]"/><span className="text-xs font-bold tracking-[.16em] text-[#8d84f2]">NEURAOPS CONTROL</span></div><h1 className="text-4xl font-extrabold tracking-[-.04em] md:text-5xl">Company operating pulse.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Read-only operating truth from the Company Operating System. No inferred agent activity.</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-xs text-slate-400">Generated {new Date(s.generated_at).toLocaleString()}</div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Agents',String(s.agents.length),'registered'],
          ['Active work',String(s.work.active),'verified lifecycle'],
          ['QA reviews',String(s.qa.reviews),'immutable evidence'],
          ['Model spend',`$${spend.toFixed(4)}`,`${s.cost.receipts} receipts`],
        ].map(([a,b,c])=><article key={a} className="rounded-2xl border border-white/10 bg-white/[.045] p-5"><p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{a}</p><p className="mt-3 text-3xl font-extrabold tracking-tight">{b}</p><p className="mt-1 text-xs text-slate-500">{c}</p></article>)}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5 md:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold tracking-[.14em] text-[#43c7d9]">AGENTS</p><h2 className="mt-1 text-xl font-bold">Operating roster</h2></div><span className="text-xs text-slate-500">live registry</span></div><div className="grid gap-3 sm:grid-cols-2">{s.agents.map(a=><div key={a.name} className="flex items-center justify-between rounded-xl border border-white/8 bg-[#0b1727] px-4 py-4"><div><p className="font-semibold">{a.name}</p><p className="mt-1 text-xs text-slate-500">No activity inferred</p></div><span className="rounded-full bg-[#6657d9]/15 px-2.5 py-1 text-[11px] font-bold text-[#a99fff]">{a.status}</span></div>)}</div></section>

        <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#171638] to-[#0b1524] p-5 md:p-6"><p className="text-xs font-bold tracking-[.14em] text-[#43c7d9]">SECURITY GATES</p><h2 className="mt-1 mb-4 text-xl font-bold">Execution posture</h2><Gate label="Model execution" enabled={s.controls.MODEL_EXECUTION?.enabled??false}/><Gate label="External actions" enabled={s.controls.EXTERNAL_ACTIONS?.enabled??false}/><Gate label="Production actions" enabled={s.controls.PRODUCTION_ACTIONS?.enabled??false}/><div className="mt-5 border-t border-white/10 pt-4">{Object.entries(s.providers).map(([k,v])=><div key={k} className="mb-3 flex items-center justify-between text-xs"><span className="text-slate-400">{k}</span><span className={v.enabled?'text-cyan-200':'text-slate-500'}>{v.enabled?'READY':'DISABLED'} · max ${Number(v.max_task_budget_usd).toFixed(2)}</span></div>)}</div></section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5 md:p-6"><p className="text-xs font-bold tracking-[.14em] text-[#8d84f2]">WORK</p><h2 className="mt-1 mb-5 text-xl font-bold">Lifecycle truth</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[['Legacy',s.work.legacy_pending],['Active',s.work.active],['Approval',s.work.waiting_approval],['Held',s.work.held],['Completed',s.work.completed],['Total',s.work.total]].map(([k,v])=><div key={String(k)} className="rounded-xl bg-[#0b1727] p-4"><p className="text-xs text-slate-500">{k}</p><p className="mt-2 text-2xl font-bold">{v}</p></div>)}</div></section>
        <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5 md:p-6"><p className="text-xs font-bold tracking-[.14em] text-[#8d84f2]">QA / EVIDENCE</p><h2 className="mt-1 mb-5 text-xl font-bold">Independent review</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Pass',s.qa.pass],['Hold',s.qa.hold],['Escalate',s.qa.escalate],['Fail',s.qa.fail]].map(([k,v])=><div key={String(k)} className="rounded-xl bg-[#0b1727] p-4"><p className="text-xs text-slate-500">{k}</p><p className="mt-2 text-2xl font-bold">{v}</p></div>)}</div><p className="mt-5 text-xs leading-5 text-slate-500">Execution and QA receipts are append-only evidence. This v1 surface does not mutate company state.</p></section>
      </div>
    </div>
  </main>
}
