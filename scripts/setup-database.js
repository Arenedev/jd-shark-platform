import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function setupDatabase() {
  try {
    console.log('Starting database setup...')

    // Insert default ranks
    const { error: ranksError } = await supabase
      .from('ranks')
      .upsert([
        { rank_name: 'Bronze', rank_order: 1, min_downline: 0, min_turnover: 0, commission_rate: 5.00, bonus_rate: 0.00 },
        { rank_name: 'Silver', rank_order: 2, min_downline: 3, min_turnover: 50000, commission_rate: 7.00, bonus_rate: 1.00 },
        { rank_name: 'Gold', rank_order: 3, min_downline: 10, min_turnover: 200000, commission_rate: 10.00, bonus_rate: 2.00 },
        { rank_name: 'Platinum', rank_order: 4, min_downline: 30, min_turnover: 1000000, commission_rate: 12.00, bonus_rate: 3.00 },
        { rank_name: 'Diamond', rank_order: 5, min_downline: 100, min_turnover: 5000000, commission_rate: 15.00, bonus_rate: 5.00 },
      ], { onConflict: 'rank_name' })

    if (ranksError) {
      console.warn('Ranks insert warning:', ranksError.message)
    } else {
      console.log('✓ Default ranks inserted')
    }

    // Insert system configuration
    const { error: configError } = await supabase
      .from('system_config')
      .upsert([
        { config_key: 'platform_name', config_value: 'JD Shark Platform', description: 'Main platform name' },
        { config_key: 'currency', config_value: 'NGN', description: 'Default currency' },
        { config_key: 'base_commission_rate', config_value: '5', description: 'Base commission rate for new associates' },
        { config_key: 'welcome_bonus', config_value: '5000', description: 'Welcome bonus for new associates' },
      ], { onConflict: 'config_key' })

    if (configError) {
      console.warn('Config insert warning:', configError.message)
    } else {
      console.log('✓ System configuration inserted')
    }

    console.log('\n✅ Database setup completed successfully!')
    console.log('Note: The tables should already exist in your Supabase database.')
    console.log('This script seeded default configuration data (ranks and system config).')
    process.exit(0)
  } catch (error) {
    console.error('❌ Database setup failed:', error.message)
    process.exit(1)
  }
}

setupDatabase()
