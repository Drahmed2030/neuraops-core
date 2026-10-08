import type { Metadata } from 'next'
import RecoveryForm from './RecoveryForm'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Recover your account — NeuraOps',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}
export default function RecoveryPage() { return <RecoveryForm /> }
