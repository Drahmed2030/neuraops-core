import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('escalations')
      .select('*')
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ escalations: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json()
    const supabase = createServerClient()
    const update: any = { status }
    if (status === 'resolved' || status === 'closed') update.resolved_at = new Date().toISOString()

    const { data, error } = await supabase.from('escalations').update(update).eq('id', id).select().single()
    if (error) throw error
    return NextResponse.json({ escalation: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
