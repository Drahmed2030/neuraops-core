import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('storeId')

    const supabase = createServerClient()

    const query = supabase
      .from('escalations')
      .select(`
        *,
        conversations ( session_id, channel, messages ( content, role, created_at ) )
      `)
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false })

    if (storeId) query.eq('store_id', storeId)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ escalations: data || [] })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status, assigned_to } = await req.json()
    const supabase = createServerClient()

    const update: any = { status }
    if (assigned_to) update.assigned_to = assigned_to
    if (status === 'resolved' || status === 'closed') {
      update.resolved_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('escalations')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ escalation: data })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
