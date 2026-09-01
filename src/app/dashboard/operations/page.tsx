import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DashboardMobileNav } from '@/components/dashboard/DashboardMobileNav'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { Header } from '@/components/layout/Header'
import { OperationsConsole } from '@/components/operations/OperationsConsole'
import { requireOperationsAccess } from '@/lib/auth/require-operations-access'
import { emitRuntimeIncident } from '@/lib/reliability/runtime-sensor.mjs'
import type { OperationsReadModel } from '@/lib/trust/contracts'
import { buildOperationsConsoleView } from '@/lib/trust/operations-console.mjs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Unified Trust & Operations Console | NeuraOps',
  robots: {
    index: false,
    follow: false,
  },
}

function reportProjectionFailure(error: unknown) {
  emitRuntimeIncident({
    service: 'ntrp-operations-console',
    operation: 'render-snapshot',
    route: '/dashboard/operations',
    status: 503,
    error,
    phase: 'console-projection',
  })
}

export default async function OperationsPage() {
  const access = await requireOperationsAccess()
  const view = buildOperationsConsoleView({
    access,
    onError: reportProjectionFailure,
  })

  if (view.kind === 'authentication-required') redirect('/login')

  const consoleProps = view.kind === 'ready'
    ? { view: 'ready' as const, snapshot: view.snapshot as OperationsReadModel }
    : { view: view.kind === 'access-denied' ? 'access-denied' as const : 'unavailable' as const }

  return (
    <div className="min-h-screen">
      <Header variant="app" />
      <DashboardMobileNav activeSection="operations" />
      <DashboardSidebar activeTab="operations" />
      <main className="md:ps-60">
        <OperationsConsole {...consoleProps} />
      </main>
    </div>
  )
}
