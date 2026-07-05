import { getSession } from '@/lib/session'
import { WaiterFeedbackForm } from './WaiterFeedbackForm'

const BRANCH_NAMES: Record<string, string> = {
  cottages: 'Hunters Paradise Cottages',
  tuuti: 'Hunters Paradise Tuuti',
}

const OUTLET_NAMES: Record<string, string> = {
  ekwena_restaurant: 'Ekwena Restaurant',
  duma_bar: 'Duma Bar',
  eswara_conference_hall: 'Eswara Conference Hall',
  ekwena_gardens: 'Ekwena Gardens',
}

export default async function WaiterPage() {
  const session = await getSession()
  const branchName = session?.branch ? BRANCH_NAMES[session.branch] : ''
  const outletName = session?.outlet ? OUTLET_NAMES[session.outlet] : ''

  return (
    <WaiterFeedbackForm
      branchName={branchName}
      outletName={outletName}
      collectedByName={session?.collectedBy || ''}
    />
  )
}
