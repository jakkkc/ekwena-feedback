import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const staffToCreate = [
    { name: 'Manager', role: 'manager', branch: null, pin: '1234' },
    { name: 'Waiter - Cottages', role: 'waiter', branch: 'cottages', pin: '1111' },
    { name: 'Waiter - Tuuti', role: 'waiter', branch: 'tuuti', pin: '2222' },
  ]

  for (const s of staffToCreate) {
    const pin_hash = await bcrypt.hash(s.pin, 10)
    const { error } = await supabase
      .from('staff')
      .insert({ name: s.name, role: s.role, branch: s.branch, pin_hash })

    if (error) console.error(`Failed to create ${s.name}:`, error.message)
    else console.log(`✅ Created ${s.name} with PIN ${s.pin}`)
  }
}

main()
