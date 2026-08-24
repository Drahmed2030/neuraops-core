import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { initializeTrialState } from '@/lib/proof-week'
import { consumeRateLimit, requestIp } from '@/lib/security/rate-limit'

const ALLOWED_TYPES = new Set(['cafe', 'restaurant', 'retail', 'other'])
const ALLOWED_PHONE_CODES = new Set([
  '+966', '+971', '+965', '+973', '+974', '+968', '+20', '+1',
])
const ALLOWED_CITIES = new Set([
  '', 'buraidah', 'unaizah', 'riyadh', 'jeddah', 'dammam', 'dubai', 'other',
])
const ALLOWED_CHANNELS = new Set([
  '', 'whatsapp', 'instagram', 'both', 'web',
])

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const storeName = cleanText(body.storeName, 120)
    const phone = cleanText(body.phone, 30)
    const phoneCode = cleanText(body.phoneCode, 8)
    const city = cleanText(body.city, 100)
    const type = cleanText(body.type, 40) || 'other'
    const channel = cleanText(body.channel, 40)

    if (!storeName || !phone) {
      return NextResponse.json(
        { error: 'storeName and phone required' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: 'invalid store type' }, { status: 400 })
    }

    if (!ALLOWED_PHONE_CODES.has(phoneCode)) {
      return NextResponse.json({ error: 'invalid phone code' }, { status: 400 })
    }

    if (!ALLOWED_CITIES.has(city)) {
      return NextResponse.json({ error: 'invalid city' }, { status: 400 })
    }

    if (!ALLOWED_CHANNELS.has(channel)) {
      return NextResponse.json({ error: 'invalid channel' }, { status: 400 })
    }

    const normalizedPhone = phone.replace(/[\s()-]/g, '')

    if (!/^\d{5,20}$/.test(normalizedPhone)) {
      return NextResponse.json({ error: 'invalid phone' }, { status: 400 })
    }

    const ip = requestIp(req)
    const phoneFingerprint = createHash('sha256')
      .update(`${phoneCode}${normalizedPhone}`)
      .digest('hex')
      .slice(0, 32)

    const [ipAllowed, phoneAllowed] = await Promise.all([
      consumeRateLimit(`create-store:ip:${ip}`, 5, 3600),
      consumeRateLimit(`create-store:phone:${phoneFingerprint}`, 3, 86400),
    ])

    if (!ipAllowed || !phoneAllowed) {
      return NextResponse.json(
        { error: 'Too many requests.' },
        { status: 429 }
      )
    }

    const slugBase =
      storeName
        .toLowerCase()
        .replace(/[^a-z0-9؀-ۿ]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || `store-${Date.now()}`

    const { data: existingStore } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('slug', slugBase)
      .maybeSingle()

    const finalSlug = existingStore
      ? `${slugBase}-${Date.now().toString(36)}`
      : slugBase

    const { data: newStore, error } = await supabaseAdmin
      .from('stores')
      .insert({
        name: storeName,
        slug: finalSlug,
        phone: `${phoneCode}${normalizedPhone}`,
        type,
        status: 'pilot',
        plan: 'free_pilot',
        owner_id: null,
        settings: {
          default_language: 'ar',
          tone: 'friendly',
          city: city || null,
          preferred_channel: channel || null,
        },
      })
      .select('id, slug')
      .single()

    if (error || !newStore) {
      console.error('Store creation error:', error?.message)
      return NextResponse.json(
        { error: 'failed to create store' },
        { status: 500 }
      )
    }

    await initializeTrialState(newStore.id)

    return NextResponse.json({
      storeId: newStore.id,
      slug: newStore.slug,
    })
  } catch (err) {
    console.error('Trial signup error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
