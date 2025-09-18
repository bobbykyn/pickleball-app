// Quick script to enable notifications for all users
// Run this in your browser console on your app

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_SUPABASE_URL', // Replace with your actual URL
  'YOUR_SUPABASE_ANON_KEY' // Replace with your actual anon key
)

// Enable notifications for all users
const { data, error } = await supabase
  .from('profiles')
  .update({ wants_notifications: true })
  .neq('id', '') // Update all rows

console.log('Updated profiles:', data)
console.log('Error:', error)
