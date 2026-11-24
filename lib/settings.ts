import { createServiceClient } from '@/lib/supabase/server'

export type AppSettings = {
  attention_rating_max: number
  attention_nps_enabled: boolean
  attention_nps_max: number
  attention_categories: string[]
  max_responses_per_bill: number
  rate_limit_max: number
  rate_limit_group_max: number
  rate_limit_window_minutes: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  attention_rating_max: 2,
  attention_nps_enabled: true,
  attention_nps_max: 6,
  attention_categories: ['food', 'service', 'ambiance', 'hostess', 'cleanliness', 'value', 'wait_time'],
  max_responses_per_bill: 7,
  rate_limit_max: 20,
  rate_limit_group_max: 200,
  rate_limit_window_minutes: 10,
}

// Reads every setting, falling back to the defaults above if anything goes wrong.
export async function getSettings(): Promise<AppSettings> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase.from('app_settings').select('key, value')
    const out: Record<string, unknown> = { ...DEFAULT_SETTINGS }
    for (const row of data || []) {
      if (row.key in DEFAULT_SETTINGS) out[row.key] = row.value
    }
    return out as AppSettings
  } catch {
    return DEFAULT_SETTINGS
  }
}
