import { getSession } from '@/lib/session'
import { ManagerDashboard } from './ManagerDashboard'

export default async function DashboardPage() {
  const session = await getSession()
  return <ManagerDashboard managerName={session?.name || 'Manager'} />
}
