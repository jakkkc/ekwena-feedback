import { DashboardNav } from './DashboardNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-beige-light">
      <DashboardNav />
      {children}
    </div>
  )
}
