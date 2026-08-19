import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServerClient()
    const { count } = await supabase.from('stores').select('*', { count: 'exact', head: true })
    return NextResponse.json({
      status: 'ok',
      supabase: 'connected',
      stores_count: count,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ status: 'error', error: err.message }, { status: 500 })
  }
}
