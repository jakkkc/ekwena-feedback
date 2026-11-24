import { createServiceClient } from '@/lib/supabase/server'

type Actor = { staffId?: string | null; name?: string | null } | null

// Records a management action. Never throws, so logging can't break the action itself.
export async function logActivity(
  actor: Actor,
  action: string,
  target?: string | null,
  details?: Record<string, unknown>
) {
  try {
    const supabase = createServiceClient()
    await supabase.from('activity_log').insert({
      actor_id: actor?.staffId ?? null,
      actor_name: actor?.name ?? null,
      action,
      target: target ?? null,
      details: details ?? null,
    })
  } catch {}
}
