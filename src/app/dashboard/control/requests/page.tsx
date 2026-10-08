import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireOperationsAccess } from '@/lib/auth/require-operations-access'
import RequestWorkspace from './RequestWorkspace'
export const dynamic = 'force-dynamic'
export default async function CompanyRequestsPage() {
  const access = await requireOperationsAccess()
  if (!access.ok) {
    if (access.status === 401) redirect('/login')
    return <main className="p-8"><h1>Access unavailable</h1><p>Verified operator access is required.</p></main>
  }
  const enabled = process.env.COMPANY_APPROVAL_RECORDING_ENABLED === 'true'
  return <main className="min-h-screen bg-[#08111f] p-5 text-white md:p-10"><div className="mx-auto max-w-5xl">
    <Link href="/dashboard/control" className="text-cyan-200">Back to Company Control</Link>
    <h1 className="mt-5 text-3xl font-semibold">Task requests and review</h1>
    <p className="mb-8 mt-3 text-slate-400">Internal draft requests, independent review and recorded budget reservations. Execution remains locked.</p>
    {enabled ? <RequestWorkspace/> : <p role="status">Request recording is not activated in this environment.</p>}
  </div></main>
}
