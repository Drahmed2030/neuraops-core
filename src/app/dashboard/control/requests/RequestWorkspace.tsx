'use client'

import { useRef, useState } from 'react'
import { createCompanyTaskRequest, reviewCompanyTask, recordCompanyTaskApproval } from '../approval-actions'

type Review = {
  task_id: string; digest: string; can_approve: boolean
  task: { description: string; agent_id: string; action: string; data_class: string; destination: string; budget_usd: number; expires_at: string; policy_version: number; requester_reference: string }
}
const agents = [
  ['dce3a297-b28c-45b5-96d5-da4a8dc195aa', 'Neura-PM'],
  ['797903d3-3192-4c81-9a24-aff7b30e808b', 'MedPulse-Scout'],
  ['9f02e200-50c5-4a6f-9aba-6c67e04db549', 'MedPulse-Sales'],
  ['2c9aa5a2-ded7-4ffd-b528-3f27f28cb386', 'Neura-CMO'],
  ['9e7ee046-a6c5-4cfe-babb-1231159a49cc', 'MedPulse-Creator'],
  ['3684f69f-ec37-4799-810c-4f0863ae021f', 'Neura-QA'],
]
const field = 'mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white'
const button = 'mt-4 rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40'

export default function RequestWorkspace() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [taskId, setTaskId] = useState('')
  const [review, setReview] = useState<Review | null>(null)
  const createKey = useRef<string | null>(null)
  const approveKey = useRef<string | null>(null)
  async function create(form: FormData) {
    setBusy(true); setMessage('')
    createKey.current ??= crypto.randomUUID()
    try {
      const result = await createCompanyTaskRequest({ agentId: form.get('agent'), description: form.get('description'), actionClass: form.get('action'), budgetCents: Number(form.get('budget')), requestKey: createKey.current })
      if (result.status !== 200 || !('request' in result)) { setMessage('Request could not be recorded. Check access, agent capability and the permitted budget.'); return }
      setTaskId(result.request.task_id); setReview(null)
      setMessage('Request recorded. Share its ID with a different authorised operator for review. Nothing has executed.')
    } catch { setMessage('Connection interrupted. Retry the unchanged request to recover the same receipt.') }
    finally { setBusy(false) }
  }
  async function load() {
    setBusy(true); setReview(null); setMessage(''); approveKey.current = null
    try {
      const result = await reviewCompanyTask(taskId)
      if (result.status !== 200 || !('review' in result)) { setMessage('This request is unavailable for verified review.'); return }
      setReview(result.review as Review)
    } catch { setMessage('Review could not be loaded. Try again.') }
    finally { setBusy(false) }
  }
  async function approve() {
    if (!review || !review.can_approve) return
    setBusy(true); setMessage(''); approveKey.current ??= crypto.randomUUID()
    try {
      const result = await recordCompanyTaskApproval({ taskId: review.task_id, digest: review.digest, requestKey: approveKey.current })
      if (result.status !== 200 || !('receipt' in result)) { setMessage('Approval was not recorded. The request may have changed, expired or reached its budget limit. Reload before reviewing again.'); return }
      setMessage(`Approval recorded: ${result.receipt.approval_id}. Budget reserved; execution remains locked.`)
    } catch { setMessage('Connection interrupted. Retry approval to recover the same receipt.') }
    finally { setBusy(false) }
  }
  return <div className="grid gap-8 md:grid-cols-2">
    <form onSubmit={event => { event.preventDefault(); void create(new FormData(event.currentTarget)) }} onChange={() => { createKey.current = null }} className="rounded-2xl border border-white/10 p-5">
      <h2 className="text-xl font-semibold">Request an internal draft</h2>
      <p className="mt-2 text-sm text-slate-400">No patient information or credentials. A request does not start an agent.</p>
      <fieldset disabled={busy} className="mt-4 space-y-4">
        <label className="block">Agent<select name="agent" className={field}>{agents.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label className="block">Task<textarea name="description" required maxLength={2000} rows={4} className={field}/></label>
        <label className="block">Action<select name="action" className={field}>{['RESEARCH', 'INTERNAL_CREATE', 'REVIEW', 'ASSURANCE'].map(a => <option key={a}>{a}</option>)}</select></label>
        <label className="block">Budget ceiling (US cents)<input name="budget" type="number" min="0" max="5" step="1" defaultValue="0" required className={field}/></label>
        <button className={button} type="submit">Record request</button>
      </fieldset>
    </form>
    <section className="rounded-2xl border border-white/10 p-5">
      <h2 className="text-xl font-semibold">Review an exact request</h2>
      <label className="mt-4 block">Task ID<input value={taskId} disabled={busy} onChange={e => { setTaskId(e.target.value); setReview(null); approveKey.current = null }} className={field}/></label>
      <button type="button" disabled={busy || !taskId} onClick={load} className={button}>Load review</button>
      {review && <div className="mt-5 space-y-3 text-sm">
        <p className="whitespace-pre-wrap break-words">{review.task.description}</p>
        <dl className="space-y-2 break-all">{Object.entries(review.task).filter(([k]) => k !== 'description').map(([k,v]) => <div key={k}><dt className="text-slate-400">{k.replaceAll('_',' ')}</dt><dd>{String(v)}</dd></div>)}</dl>
        <p className="break-all text-xs text-slate-400">Reviewed digest: {review.digest}</p>
        {!review.can_approve && <p className="text-amber-200">This review cannot be approved by this account. The requester must have a different verified reviewer, and the request must remain valid.</p>}
        <button type="button" disabled={busy || !review.can_approve} onClick={approve} className={button}>Record approval only</button>
      </div>}
    </section>
    <p role="status" aria-live="polite" className="break-words text-cyan-100 md:col-span-2">{busy ? 'Checking…' : message}</p>
  </div>
}
