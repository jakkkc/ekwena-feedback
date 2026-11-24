import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardNav } from './DashboardNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'manager') redirect('/login')

  return (
    <div className="min-h-dvh bg-beige-light">
      <DashboardNav />
      {children}
    </div>
  )
}
