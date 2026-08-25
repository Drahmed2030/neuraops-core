import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canTransitionConversion,
  canTransitionFollowUp,
  qualificationDecision,
  scoreLead,
} from '../src/lib/leadops/qualification.mjs'
import { leadScopedToStore, persistLeadIdempotently } from '../src/lib/leadops/persistence.mjs'

test('score boundaries are deterministic and bounded', () => {
  assert.equal(scoreLead({ need: null, budgetBand: 'unknown', urgency: 'unknown', decisionAuthority: 'unknown' }), 0)
  assert.equal(scoreLead({ need: 'Need automation', budgetBand: 'high', urgency: 'now', decisionAuthority: 'decision_maker' }), 100)
  assert.equal(scoreLead({ need: 'Need automation', budgetBand: 'medium', urgency: '30d', decisionAuthority: 'influencer' }), 65)
})

test('qualification boundary distinguishes qualified, unqualified, and human review', () => {
  assert.equal(qualificationDecision({ need: 'x', budgetBand: 'high', urgency: 'now', decisionAuthority: 'decision_maker' }, 0.9).status, 'qualified')
  assert.equal(qualificationDecision({ need: 'x', budgetBand: 'low', urgency: 'unknown', decisionAuthority: 'unknown' }, 0.9).status, 'unqualified')
  assert.equal(qualificationDecision({ need: 'x', budgetBand: 'medium', urgency: '30d', decisionAuthority: 'influencer' }, 0.9).status, 'needs_human')
})

test('missing need always falls back to human review', () => {
  const result = qualificationDecision({ budgetBand: 'high', urgency: 'now', decisionAuthority: 'decision_maker' }, 0.95)
  assert.equal(result.status, 'needs_human')
  assert.equal(result.reason, 'missing_need')
})

test('low AI confidence cannot qualify a lead by itself', () => {
  const result = qualificationDecision({ need: 'High value project', budgetBand: 'high', urgency: 'now', decisionAuthority: 'decision_maker' }, 0.2)
  assert.equal(result.score, 100)
  assert.equal(result.status, 'needs_human')
  assert.equal(result.reason, 'low_ai_confidence')
})

test('high-value lead with ambiguous authority requires human review', () => {
  const result = qualificationDecision({ need: 'High value project', budgetBand: 'high', urgency: 'now', decisionAuthority: 'unknown' }, 0.95)
  assert.equal(result.status, 'needs_human')
  assert.equal(result.reason, 'high_value_ambiguous_authority')
})

test('duplicate persistence is idempotent for the same store and session', async () => {
  const rows = new Map()
  let nextId = 1
  const adapter = {
    upsert: async record => {
      const key = `${record.store_id}:${record.session_id}`
      const existing = rows.get(key)
      const saved = { ...existing, ...record, id: existing?.id || `lead-${nextId++}` }
      rows.set(key, saved)
      return saved
    },
  }

  const first = await persistLeadIdempotently(adapter, { store_id: 'store-a', session_id: 'session-123456', score: 40 })
  const second = await persistLeadIdempotently(adapter, { store_id: 'store-a', session_id: 'session-123456', score: 80 })

  assert.equal(first.id, second.id)
  assert.equal(rows.size, 1)
  assert.equal(second.score, 80)
})

test('store isolation keeps the same session independent across stores', async () => {
  const rows = new Map()
  let nextId = 1
  const adapter = {
    upsert: async record => {
      const key = `${record.store_id}:${record.session_id}`
      const saved = { ...record, id: rows.get(key)?.id || `lead-${nextId++}` }
      rows.set(key, saved)
      return saved
    },
  }

  const a = await persistLeadIdempotently(adapter, { store_id: 'store-a', session_id: 'same-session-123', score: 60 })
  const b = await persistLeadIdempotently(adapter, { store_id: 'store-b', session_id: 'same-session-123', score: 60 })

  assert.notEqual(a.id, b.id)
  assert.equal(rows.size, 2)
  assert.equal(leadScopedToStore(a, 'store-a'), true)
  assert.equal(leadScopedToStore(a, 'store-b'), false)
})

test('conversion and follow-up lifecycle rules prevent unsafe reopening', () => {
  assert.equal(canTransitionConversion('new', 'contacted'), true)
  assert.equal(canTransitionConversion('contacted', 'won'), true)
  assert.equal(canTransitionConversion('won', 'contacted'), false)
  assert.equal(canTransitionFollowUp('none', 'pending'), true)
  assert.equal(canTransitionFollowUp('pending', 'in_progress'), true)
  assert.equal(canTransitionFollowUp('in_progress', 'done'), true)
})
