import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export function requestIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim().slice(0, 128)
  return (req.headers.get('x-real-ip') || 'unknown').slice(0, 128)
}

export async function consumeRateLimit(key: string, limit: number, windowSeconds: number) {
  const { data, error } = await supabaseAdmin.rpc('consume_rate_limit', {
    p_key: key.slice(0, 240),
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    console.error('Rate limiter unavailable:', error.message)
    return false
  }
  return data === true
}
