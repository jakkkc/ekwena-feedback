import { notFound } from 'next/navigation'
import { BRANCH_LABELS, OUTLET_LABELS, isBranch, isOutlet } from '@/lib/venues'
import { PublicFeedbackForm } from './PublicFeedbackForm'

export const metadata = {
  title: 'Share Your Experience',
  robots: { index: false, follow: false },
}

export default async function PublicFeedbackPage({
  params,
}: {
  params: Promise<{ branch: string; outlet: string }>
}) {
  const { branch, outlet } = await params
  if (!isBranch(branch) || !isOutlet(outlet)) notFound()

  return (
    <PublicFeedbackForm
      branch={branch}
      outlet={outlet}
      branchName={BRANCH_LABELS[branch]}
      outletName={OUTLET_LABELS[outlet]}
    />
  )
}
