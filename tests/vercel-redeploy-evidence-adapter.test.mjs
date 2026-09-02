import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildOperationsReadModel } from '../src/lib/trust/operations-read-model.mjs'
import {
  readVercelRedeployEvidence,
  VERCEL_REDEPLOY_EVIDENCE_ADAPTER,
  VercelRedeployEvidenceError,
} from '../src/lib/trust/vercel-redeploy-evidence-adapter.mjs'

const DEPLOYMENT_ID = 'dpl_7eNwPPjbcfWxySeXhadPFSDXtGVA'
const TOKEN = 'test_token_1234567890'
const COMMIT_SHA = 'c9565b41ed21ed659a7b046d486f912ba3b3c24e'
const STARTED_AT = '2026-09-02T03:00:00.000Z'
const COMPLETED_AT = '2026-09-02T03:04:00.000Z'
const OBSERVED_AT = '2026-09-02T03:05:00.000Z'

function policy(overrides = {}) {
  return {
    schemaVersion: 1,
    expectedCommitSha: COMMIT_SHA,
    exerciseRef: 'drill:vercel-production-redeploy-2026-09-02',
    approvalRef: 'approval:platform-operations-2026-09-02',
    exerciseStartedAt: STARTED_AT,
    exerciseCompletedAt: COMPLETED_AT,
    ...overrides,
  }
}

function deployment(overrides = {}) {
  return {
    id: DEPLOYMENT_ID,
    name: 'neuraops-core',
    url: 'must-not-enter-trust-fabric.vercel.app',
    state: 'READY',
    status: 'READY',
    readyState: 'READY',
    createdAt: Date.parse('2026-09-02T03:01:00.000Z'),
    buildingAt: Date.parse('2026-09-02T03:02:00.000Z'),
    ready: Date.parse('2026-09-02T03:03:00.000Z'),
    target: 'production',
    source: 'git',
    creator: {
      username: 'private-operator',
      email: 'operator@example.com',
    },
    project: {
      id: 'prj_RjF2s10VCS3VnylALtzTVqZr6omx',
      name: 'neuraops-core',
      framework: 'nextjs',
    },
    meta: {
      githubCommitOrg: 'Drahmed2030',
      githubCommitRepo: 'neuraops-core',
      githubCommitRef: 'main',
      githubCommitSha: COMMIT_SHA,
      githubCommitVerification: 'verified',
      githubCommitAuthorEmail: 'author@example.com',
      githubCommitMessage: 'private payload token=must-not-survive',
    },
    alias: ['customer-domain.example'],
    ...overrides,
  }
}

function successFetch(payload = deployment(), observed = []) {
  return async (url, options) => {
    observed.push({ url, options })
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

function request(overrides = {}) {
  return {
    deploymentId: DEPLOYMENT_ID,
    token: TOKEN,
    policy: policy(),
    observedAt: OBSERVED_AT,
    ...overrides,
  }
}

test('adapter uses one bounded authenticated GET and projects only opaque evidence', async () => {
  const observed = []
  const result = await readVercelRedeployEvidence(request(), {
    fetchImpl: successFetch(deployment(), observed),
  })
  const serialized = JSON.stringify(result)

  assert.equal(observed.length, 1)
  assert.equal(observed[0].options.method, 'GET')
  assert.equal(observed[0].options.cache, 'no-store')
  assert.equal(observed[0].options.redirect, 'error')
  assert.equal(observed[0].options.headers.Authorization, `Bearer ${TOKEN}`)
  assert.equal(observed[0].url.origin, 'https://api.vercel.com')
  assert.equal(observed[0].url.pathname, `/v13/deployments/${DEPLOYMENT_ID}`)
  assert.equal(observed[0].url.searchParams.get('teamId'), 'team_Z4NA0NAa6sgq5jnAdreda4O5')
  assert.equal(observed[0].url.searchParams.get('withGitRepoInfo'), 'true')

  assert.equal(result.adapter.mode, 'read-only')
  assert.deepEqual(result.adapter.allowedHttpMethods, ['GET'])
  assert.equal(result.adapter.persistenceEnabled, false)
  assert.equal(result.adapter.rawPayloadsRetained, false)
  assert.equal(result.evidenceRecord.kind, 'recovery-drill')
  assert.equal(result.evidenceRecord.product, 'neuraops')
  assert.equal(result.evidenceRecord.environment, 'production')
  assert.equal(result.evidenceRecord.retentionClass, 'audit')
  assert.match(result.evidenceRecord.integritySha256, /^[a-f0-9]{64}$/)
  assert.match(result.evidenceRecord.locationRef, /^[a-f0-9]{64}$/)
  assert.match(result.recoveryDrillRecord.drillRef, /^[a-f0-9]{64}$/)
  assert.match(result.recoveryDrillRecord.approvalRef, /^[a-f0-9]{64}$/)
  assert.equal(result.recoveryDrillRecord.achievedRtoMinutes, 4)
  assert.equal(result.recoveryDrillRecord.achievedRpoMinutes, 0)
  assert.equal(Object.isFrozen(result), true)

  assert.doesNotMatch(serialized, new RegExp(DEPLOYMENT_ID))
  assert.doesNotMatch(serialized, /prj_RjF2s10VCS3VnylALtzTVqZr6omx/)
  assert.doesNotMatch(serialized, /operator@example\.com|author@example\.com|private payload|customer-domain/)
  assert.doesNotMatch(serialized, new RegExp(TOKEN))
})

test('normalized records verify only the NeuraOps production redeploy drill projection', async () => {
  const result = await readVercelRedeployEvidence(request(), {
    fetchImpl: successFetch(),
  })
  const model = buildOperationsReadModel({
    evidenceRecords: [result.evidenceRecord],
    recoveryDrillRecords: [result.recoveryDrillRecord],
    generatedAt: OBSERVED_AT,
  })
  const vercelObjective = model.recoveryDrills.objectives.find(
    (objective) => objective.service === 'vercel-runtime',
  )

  assert.equal(model.recoveryDrills.summary.verifiedDrills, 1)
  assert.equal(vercelObjective.status, 'verified')
  assert.equal(vercelObjective.product, 'neuraops')
  assert.equal(model.recovery.objectives.find(
    (objective) => objective.service === 'vercel-runtime',
  ).objectiveStatus, 'target')
  assert.equal(model.privacy.clinicalDataIncluded, false)
})

test('official project, production target, authoritative repository, main, and exact SHA fail closed', async () => {
  const variants = [
    deployment({ project: { id: 'prj_JdlLSEpl41gRDqzg9G6vg0olap3J', name: 'neuraops-core-snnv' } }),
    deployment({ target: 'preview' }),
    deployment({ meta: { ...deployment().meta, githubCommitRepo: 'cliniverse-ai' } }),
    deployment({ meta: { ...deployment().meta, githubCommitRef: 'feature/unreviewed' } }),
    deployment({ meta: { ...deployment().meta, githubCommitSha: 'a'.repeat(40) } }),
    deployment({ meta: { ...deployment().meta, githubCommitVerification: 'unverified' } }),
  ]

  for (const payload of variants) {
    await assert.rejects(
      readVercelRedeployEvidence(request(), { fetchImpl: successFetch(payload) }),
      VercelRedeployEvidenceError,
    )
  }
})

test('non-ready and contradictory deployment timestamps cannot become recovery evidence', async () => {
  await assert.rejects(
    readVercelRedeployEvidence(request(), {
      fetchImpl: successFetch(deployment({ state: 'ERROR', readyState: 'ERROR', status: 'ERROR' })),
    }),
    (error) => error.code === 'deployment_not_ready',
  )
  await assert.rejects(
    readVercelRedeployEvidence(request(), {
      fetchImpl: successFetch(deployment({
        buildingAt: Date.parse('2026-09-02T03:03:30.000Z'),
        ready: Date.parse('2026-09-02T03:03:00.000Z'),
      })),
    }),
    (error) => error.code === 'provider_contract_invalid',
  )
})

test('exercise approval window must enclose provider timestamps and cannot be future or unbounded', async () => {
  const invalidPolicies = [
    policy({ exerciseStartedAt: '2026-09-02T03:01:30.000Z' }),
    policy({ exerciseCompletedAt: '2026-09-02T03:02:30.000Z' }),
    policy({ exerciseCompletedAt: '2026-09-03T03:00:00.001Z' }),
    policy({ exerciseCompletedAt: '2026-09-02T03:06:00.000Z' }),
  ]

  for (const invalidPolicy of invalidPolicies) {
    await assert.rejects(
      readVercelRedeployEvidence(request({ policy: invalidPolicy }), { fetchImpl: successFetch() }),
      (error) => error.code === 'exercise_window_invalid',
    )
  }
})

test('policy cannot choose another product, environment, project, provider, or raw payload field', async () => {
  const prohibited = ['product', 'environment', 'projectId', 'provider', 'payload']

  for (const field of prohibited) {
    await assert.rejects(
      readVercelRedeployEvidence(request({ policy: policy({ [field]: 'cliniverse' }) }), {
        fetchImpl: successFetch(),
      }),
      (error) => error.code === 'invalid_policy',
    )
  }
})

test('provider errors, invalid JSON, and oversized responses expose generic failure only', async () => {
  const providerError = readVercelRedeployEvidence(request(), {
    fetchImpl: async () => new Response('secret provider diagnostic', { status: 500 }),
  })
  await assert.rejects(providerError, (error) => {
    assert.equal(error.code, 'provider_unavailable')
    assert.doesNotMatch(error.message, /secret provider diagnostic/)
    return true
  })

  await assert.rejects(
    readVercelRedeployEvidence(request(), {
      fetchImpl: async () => new Response('not-json', { status: 200 }),
    }),
    (error) => error.code === 'provider_contract_invalid',
  )
  await assert.rejects(
    readVercelRedeployEvidence(request(), {
      fetchImpl: async () => new Response('x'.repeat(64 * 1024 + 1), { status: 200 }),
    }),
    (error) => error.code === 'response_too_large',
  )
})

test('adapter contract is default-off, stateless, and contains no mutation or clinical integration path', () => {
  const source = readFileSync(
    new URL('../src/lib/trust/vercel-redeploy-evidence-adapter.mjs', import.meta.url),
    'utf8',
  )
  const productionConsumers = [
    '../src/lib/trust/operations-read-model.mjs',
    '../src/lib/trust/operations-api.mjs',
    '../src/app/api/operations/v1/snapshot/route.ts',
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n')

  assert.equal(VERCEL_REDEPLOY_EVIDENCE_ADAPTER.mode, 'read-only')
  assert.equal(VERCEL_REDEPLOY_EVIDENCE_ADAPTER.persistenceEnabled, false)
  assert.equal(VERCEL_REDEPLOY_EVIDENCE_ADAPTER.rawPayloadsRetained, false)
  assert.doesNotMatch(source, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/)
  assert.doesNotMatch(source, /supabase|database|writeFile|appendFile|createWriteStream/)
  assert.doesNotMatch(source, /patient|diagnosis|clinical[_-]?note|entitlement/i)
  assert.doesNotMatch(productionConsumers, /vercel-redeploy-evidence-adapter/)
})
