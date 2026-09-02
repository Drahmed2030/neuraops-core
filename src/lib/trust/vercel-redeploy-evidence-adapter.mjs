import crypto from 'node:crypto'
import { createEvidenceRecord } from './evidence.mjs'
import { createRecoveryDrillRecord } from './recovery-drills.mjs'
import { hashRef } from './trust-event.mjs'

const VERCEL_API_ORIGIN = 'https://api.vercel.com'
const OFFICIAL_TEAM_ID = 'team_Z4NA0NAa6sgq5jnAdreda4O5'
const OFFICIAL_PROJECT_ID = 'prj_RjF2s10VCS3VnylALtzTVqZr6omx'
const OFFICIAL_PROJECT_NAME = 'neuraops-core'
const AUTHORITATIVE_REPOSITORY = 'Drahmed2030/neuraops-core'
const AUTHORITATIVE_BRANCH = 'main'
const MAX_RESPONSE_BYTES = 64 * 1024
const MAX_EXERCISE_WINDOW_MS = 24 * 60 * 60 * 1000
const SHA1 = /^[a-f0-9]{40}$/
const SAFE_REF = /^[a-z0-9][a-z0-9._:/-]*$/i
const DEPLOYMENT_ID = /^dpl_[a-z0-9]{8,80}$/i
const TOKEN = /^[a-z0-9_-]{16,4096}$/i
const REQUEST_FIELDS = new Set([
  'deploymentId',
  'token',
  'policy',
  'observedAt',
  'timeoutMs',
])
const POLICY_FIELDS = new Set([
  'schemaVersion',
  'expectedCommitSha',
  'exerciseRef',
  'approvalRef',
  'exerciseStartedAt',
  'exerciseCompletedAt',
])

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.freeze(value)
  Object.values(value).forEach(deepFreeze)
  return value
}

export class VercelRedeployEvidenceError extends Error {
  constructor(code) {
    super(`Vercel redeploy evidence unavailable (${code})`)
    this.name = 'VercelRedeployEvidenceError'
    this.code = code
  }
}

function reject(code) {
  throw new VercelRedeployEvidenceError(code)
}

function assertAllowedFields(value, allowed, code) {
  if (!isPlainObject(value)) reject(code)
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) reject(code)
  }
}

function assertIsoTimestamp(value, code) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) reject(code)
  if (new Date(value).toISOString() !== value) reject(code)
}

function assertOpaqueRef(value, code) {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length > 200
    || !SAFE_REF.test(value)
  ) reject(code)
}

function assertEpoch(value) {
  if (!Number.isSafeInteger(value) || value <= 0) reject('provider_contract_invalid')
}

function validatePolicy(policy, observedAt) {
  assertAllowedFields(policy, POLICY_FIELDS, 'invalid_policy')
  if (policy.schemaVersion !== 1) reject('invalid_policy')
  if (typeof policy.expectedCommitSha !== 'string' || !SHA1.test(policy.expectedCommitSha)) {
    reject('invalid_policy')
  }
  assertOpaqueRef(policy.exerciseRef, 'invalid_policy')
  assertOpaqueRef(policy.approvalRef, 'invalid_policy')
  assertIsoTimestamp(policy.exerciseStartedAt, 'invalid_policy')
  assertIsoTimestamp(policy.exerciseCompletedAt, 'invalid_policy')

  const startedAt = Date.parse(policy.exerciseStartedAt)
  const completedAt = Date.parse(policy.exerciseCompletedAt)
  if (
    completedAt < startedAt
    || completedAt - startedAt > MAX_EXERCISE_WINDOW_MS
    || completedAt > Date.parse(observedAt)
  ) reject('exercise_window_invalid')
}

function normalizeProviderDeployment(payload, deploymentId, policy) {
  if (!isPlainObject(payload)) reject('provider_contract_invalid')
  if (payload.id !== deploymentId) reject('scope_mismatch')
  if (!isPlainObject(payload.project)) reject('provider_contract_invalid')
  if (
    payload.project.id !== OFFICIAL_PROJECT_ID
    || payload.project.name !== OFFICIAL_PROJECT_NAME
  ) reject('scope_mismatch')
  if (payload.target !== 'production' || payload.source !== 'git') reject('scope_mismatch')
  if (payload.readyState !== 'READY') reject('deployment_not_ready')
  if (payload.state !== undefined && payload.state !== 'READY') reject('deployment_not_ready')
  if (payload.status !== undefined && payload.status !== 'READY') reject('deployment_not_ready')

  assertEpoch(payload.createdAt)
  assertEpoch(payload.buildingAt)
  assertEpoch(payload.ready)
  if (payload.createdAt > payload.buildingAt || payload.buildingAt > payload.ready) {
    reject('provider_contract_invalid')
  }

  if (!isPlainObject(payload.meta)) reject('provider_contract_invalid')
  const repository = `${payload.meta.githubCommitOrg}/${payload.meta.githubCommitRepo}`
  if (
    repository !== AUTHORITATIVE_REPOSITORY
    || payload.meta.githubCommitRef !== AUTHORITATIVE_BRANCH
    || payload.meta.githubCommitSha !== policy.expectedCommitSha
    || payload.meta.githubCommitVerification !== 'verified'
  ) reject('source_integrity_mismatch')

  const exerciseStartedAt = Date.parse(policy.exerciseStartedAt)
  const exerciseCompletedAt = Date.parse(policy.exerciseCompletedAt)
  if (payload.createdAt < exerciseStartedAt || payload.ready > exerciseCompletedAt) {
    reject('exercise_window_invalid')
  }

  return {
    schemaVersion: 1,
    provider: 'vercel',
    deploymentId: payload.id,
    projectId: payload.project.id,
    projectName: payload.project.name,
    target: payload.target,
    readyState: payload.readyState,
    source: payload.source,
    createdAt: new Date(payload.createdAt).toISOString(),
    buildingAt: new Date(payload.buildingAt).toISOString(),
    readyAt: new Date(payload.ready).toISOString(),
    repository,
    commitRef: payload.meta.githubCommitRef,
    commitSha: payload.meta.githubCommitSha,
    commitVerification: payload.meta.githubCommitVerification,
  }
}

function canonicalIntegritySha256(record) {
  return crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex')
}

function projectEvidence(normalized, policy) {
  const providerRef = hashRef(`${normalized.projectId}:${normalized.deploymentId}`)
  const evidenceId = `evidence:vercel-redeploy:${providerRef}`
  const evidenceRecord = createEvidenceRecord({
    evidenceId,
    kind: 'recovery-drill',
    source: 'vercel-deployment-api',
    product: 'neuraops',
    environment: 'production',
    integritySha256: canonicalIntegritySha256(normalized),
    classification: 'internal',
    retentionClass: 'audit',
    generatedAt: normalized.readyAt,
    locationRef: `vercel:${normalized.projectId}:${normalized.deploymentId}`,
  })
  const achievedRtoMinutes = Math.ceil(
    (Date.parse(policy.exerciseCompletedAt) - Date.parse(policy.exerciseStartedAt)) / 60_000,
  )
  const recoveryDrillRecord = createRecoveryDrillRecord({
    drillRef: policy.exerciseRef,
    service: 'vercel-runtime',
    objectiveVersion: 'v1',
    exerciseType: 'redeploy',
    state: 'completed',
    outcome: 'passed',
    startedAt: policy.exerciseStartedAt,
    completedAt: policy.exerciseCompletedAt,
    achievedRtoMinutes,
    achievedRpoMinutes: 0,
    evidenceRefs: [evidenceId],
    approvalRef: policy.approvalRef,
    source: 'vercel-redeploy-evidence-adapter',
    product: 'neuraops',
    environment: 'production',
    classification: 'internal',
  })

  return deepFreeze({
    adapter: {
      schemaVersion: 1,
      adapterId: 'vercel-redeploy-evidence-v1',
      provider: 'vercel',
      mode: 'read-only',
      allowedHttpMethods: ['GET'],
      persistenceEnabled: false,
      rawPayloadsRetained: false,
      product: 'neuraops',
      environment: 'production',
      sourceAuthority: 'official-project-and-main-only',
      deletionMode: 'no-adapter-copy',
    },
    evidenceRecord,
    recoveryDrillRecord,
  })
}

async function readBoundedJson(response) {
  const declaredLength = Number(response.headers?.get?.('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    reject('response_too_large')
  }

  let body
  try {
    body = await response.text()
  } catch {
    reject('provider_unavailable')
  }
  if (Buffer.byteLength(body, 'utf8') > MAX_RESPONSE_BYTES) reject('response_too_large')

  try {
    return JSON.parse(body)
  } catch {
    reject('provider_contract_invalid')
  }
}

/**
 * Reads one explicitly approved, completed NeuraOps production redeploy exercise.
 * The Vercel response is reduced to allowlisted facts before any Trust Fabric
 * record is created. This adapter never deploys, persists, logs, or returns the
 * raw provider response.
 */
export async function readVercelRedeployEvidence(request = {}, dependencies = {}) {
  assertAllowedFields(request, REQUEST_FIELDS, 'invalid_request')
  const {
    deploymentId,
    token,
    policy,
    observedAt = new Date().toISOString(),
    timeoutMs = 5_000,
  } = request
  const { fetchImpl = globalThis.fetch } = dependencies

  if (typeof deploymentId !== 'string' || !DEPLOYMENT_ID.test(deploymentId)) reject('invalid_request')
  if (typeof token !== 'string' || !TOKEN.test(token)) reject('authentication_unavailable')
  assertIsoTimestamp(observedAt, 'invalid_request')
  if (!Number.isInteger(timeoutMs) || timeoutMs < 250 || timeoutMs > 10_000) reject('invalid_request')
  if (typeof fetchImpl !== 'function') reject('provider_unavailable')
  validatePolicy(policy, observedAt)

  const url = new URL(`/v13/deployments/${deploymentId}`, VERCEL_API_ORIGIN)
  url.searchParams.set('teamId', OFFICIAL_TEAM_ID)
  url.searchParams.set('withGitRepoInfo', 'true')

  let response
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    reject('provider_unavailable')
  }
  if (!response?.ok) reject('provider_unavailable')

  const payload = await readBoundedJson(response)
  const normalized = normalizeProviderDeployment(payload, deploymentId, policy)
  return projectEvidence(normalized, policy)
}

export const VERCEL_REDEPLOY_EVIDENCE_ADAPTER = deepFreeze({
  schemaVersion: 1,
  adapterId: 'vercel-redeploy-evidence-v1',
  provider: 'vercel',
  mode: 'read-only',
  product: 'neuraops',
  environment: 'production',
  officialProjectRef: hashRef(OFFICIAL_PROJECT_ID),
  officialTeamRef: hashRef(OFFICIAL_TEAM_ID),
  authoritativeRepositoryRef: hashRef(AUTHORITATIVE_REPOSITORY),
  authoritativeBranch: AUTHORITATIVE_BRANCH,
  persistenceEnabled: false,
  rawPayloadsRetained: false,
})
