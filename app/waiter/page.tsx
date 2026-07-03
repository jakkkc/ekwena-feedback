import { getSession } from '@/lib/session'
import { WaiterFeedbackForm } from './WaiterFeedbackForm'

const BRANCH_NAMES: Record<string, string> = {
  cottages: 'Hunters Paradise Cottages',
  tuuti: 'Hunters Paradise Tuuti',
}

export default async function WaiterPage() {
  const session = await getSession()
  const branchName = session?.branch ? BRANCH_NAMES[session.branch] : ''

  return <WaiterFeedbackForm staffName={session?.name || ''} branchName={branchName} />
}
