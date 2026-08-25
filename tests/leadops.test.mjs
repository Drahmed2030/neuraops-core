import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canTransitionConversion,
  canTransitionFollowUp,
  qualificationDecision,
  scoreLead,
} from '../src/lib/leadops/qualification.mjs'
import {
  isTerminalConversionStatus,
  leadScopedToStore,
  persistLeadIdempotently,
  persistPublicLeadIdempotently,
  publicLeadSubmissionAction,
} from '../src/lib/leadops/persistence.mjs'

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

test('terminal won and lost leads are immutable from public resubmission', async () => {
  for (const terminalStatus of ['won', 'lost']) {
    const canonical = {
      id: `lead-${terminalStatus}`,
      store_id: 'store-a',
      session_id: 'terminal-session-123',
      conversion_status: terminalStatus,
      score: 88,
      qualification_status: 'qualified',
      follow_up_status: 'done',
    }
    let updates = 0
    let inserts = 0
    const adapter = {
      find: async () => canonical,
      updateNonTerminal: async () => { updates += 1; return null },
      insert: async () => { inserts += 1; return null },
    }

    const result = await persistPublicLeadIdempotently(adapter, {
      store_id: 'store-a',
      session_id: 'terminal-session-123',
      score: 10,
      qualification_status: 'unqualified',
      follow_up_status: 'pending',
    })

    assert.equal(result.terminal, true)
    assert.equal(result.lead.score, 88)
    assert.equal(result.lead.qualification_status, 'qualified')
    assert.equal(result.lead.follow_up_status, 'done')
    assert.equal(result.lead.conversion_status, terminalStatus)
    assert.equal(updates, 0)
    assert.equal(inserts, 0)
    assert.equal(isTerminalConversionStatus(terminalStatus), true)
  }
})

test('non-terminal public lead remains idempotently updateable', async () => {
  let row = {
    id: 'lead-1',
    store_id: 'store-a',
    session_id: 'nonterminal-session-123',
    conversion_status: 'new',
    score: 40,
    qualification_status: 'needs_human',
    follow_up_status: 'pending',
  }
  let updates = 0
  const adapter = {
    find: async () => row,
    updateNonTerminal: async (_id, _storeId, record) => {
      updates += 1
      row = { ...row, ...record }
      return row
    },
    insert: async () => null,
  }

  const result = await persistPublicLeadIdempotently(adapter, {
    store_id: 'store-a',
    session_id: 'nonterminal-session-123',
    score: 75,
    qualification_status: 'qualified',
    follow_up_status: 'pending',
  })

  assert.equal(result.terminal, false)
  assert.equal(result.updated, true)
  assert.equal(result.lead.id, 'lead-1')
  assert.equal(result.lead.score, 75)
  assert.equal(result.lead.qualification_status, 'qualified')
  assert.equal(updates, 1)
})

test('terminal repeated public submission exits before any new escalation', async () => {
  for (const terminalStatus of ['won', 'lost']) {
    const existing = { conversion_status: terminalStatus }
    let escalationCreates = 0

    if (publicLeadSubmissionAction(existing) === 'process') {
      escalationCreates += 1
    }

    assert.equal(publicLeadSubmissionAction(existing), 'terminal')
    assert.equal(escalationCreates, 0)
  }
})
