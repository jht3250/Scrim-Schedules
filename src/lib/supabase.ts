import { createClient } from '@supabase/supabase-js'

// Get these from your Supabase project settings
const supabaseUrl = 'https://figvlifhjzfyevtjokqp.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_API_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our data
export interface Team {
  id: number
  name: string
  color: string
  events?: Event[]
}

export interface Event {
    id?: number
    team_id?: number
    day: string
    time: string
    startTime: string
    endTime: string
    type: string
}