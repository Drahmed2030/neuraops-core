import { NextRequest, NextResponse } from 'next/server'
import { startProofWeek } from '@/lib/proof-week'
import { requireStoreAccess } from '@/lib/auth/require-store-access'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { consumeRateLimit } from '@/lib/security/rate-limit'

const ALLOWED_CHANNELS = new Set([
  'whatsapp',
  'instagram',
  'both',
  'web',
  'web_widget',
])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const storeSlug =
      typeof body.storeId === 'string'
        ? body.storeId.trim().slice(0, 120)
        : ''

    const channel =
      typeof body.channel === 'string'
        ? body.channel.trim().slice(0, 40)
        : ''

    if (!storeSlug || !ALLOWED_CHANNELS.has(channel)) {
      return NextResponse.json(
        { error: 'invalid storeId or channel' },
        { status: 400 }
      )
    }

    const ctx = await requireStoreAccess(req, storeSlug)
    if (ctx instanceof NextResponse) return ctx

    const allowed = await consumeRateLimit(
      `activate-channel:user:${ctx.user.id}`,
      20,
      3600
    )

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests.' },
        { status: 429 }
      )
    }

    const { data: existing } = await supabaseAdmin
      .from('channel_connections')
      .select('id')
      .eq('store_id', ctx.store.id)
      .eq('channel', channel)
      .maybeSingle()

    if (!existing) {
      const { error } = await supabaseAdmin
        .from('channel_connections')
        .insert({
          store_id: ctx.store.id,
          channel,
          status: 'active',
          connected_at: new Date().toISOString(),
        })

      if (error) {
        console.error('Channel activation insert error:', error.message)
        return NextResponse.json(
          { error: 'channel activation failed' },
          { status: 500 }
        )
      }
    }

    await startProofWeek(ctx.store.id, channel)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Channel activation error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
