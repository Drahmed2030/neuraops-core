const TIERS = new Set([0, 1, 2, 3])
const READINESS = new Set(['verified', 'partial', 'gap'])
const OBJECTIVE_STATUS = new Set(['target', 'verified'])
const PRODUCTS = new Set(['neuraops', 'cliniverse', 'shared'])

export const RECOVERY_MATRIX = Object.freeze([
  {
    service: 'supabase-core',
    product: 'shared',
    tier: 0,
    rtoMinutes: 60,
    rpoMinutes: 15,
    degradedMode: 'Fail closed for privileged writes; preserve read-only or human-handoff paths where safely possible.',
    dependencies: ['network', 'supabase-platform'],
    readiness: 'partial',
    objectiveStatus: 'target',
    evidenceRefs: [],
    recoveryOwner: 'platform-operations',
    restoreDrillCadenceDays: 90,
  },
  {
    service: 'vercel-runtime',
    product: 'neuraops',
    tier: 0,
    rtoMinutes: 60,
    rpoMinutes: 0,
    degradedMode: 'Stop new releases and preserve last known-good deployment; communicate service degradation.',
    dependencies: ['github-source', 'vercel-platform', 'dns'],
    readiness: 'partial',
    objectiveStatus: 'target',
    evidenceRefs: [],
    recoveryOwner: 'platform-operations',
    restoreDrillCadenceDays: 90,
  },
  {
    service: 'identity-authentication',
    product: 'shared',
    tier: 0,
    rtoMinutes: 60,
    rpoMinutes: 15,
    degradedMode: 'Deny new privileged sessions when identity cannot be verified; never bypass authentication.',
    dependencies: ['supabase-core'],
    readiness: 'partial',
    objectiveStatus: 'target',
    evidenceRefs: [],
    recoveryOwner: 'security-operations',
    restoreDrillCadenceDays: 90,
  },
  {
    service: 'openai-provider',
    product: 'shared',
    tier: 1,
    rtoMinutes: 120,
    rpoMinutes: 0,
    degradedMode: 'Use controlled fallback and human escalation; do not fabricate provider success.',
    dependencies: ['network', 'openai-platform'],
    readiness: 'partial',
    objectiveStatus: 'target',
    evidenceRefs: [],
    recoveryOwner: 'ai-operations',
    restoreDrillCadenceDays: 90,
  },
  {
    service: 'github-source',
    product: 'shared',
    tier: 1,
    rtoMinutes: 240,
    rpoMinutes: 0,
    degradedMode: 'Freeze changes and deployments until an authoritative source copy is available.',
    dependencies: ['github-platform'],
    readiness: 'partial',
    objectiveStatus: 'target',
    evidenceRefs: [],
    recoveryOwner: 'platform-operations',
    restoreDrillCadenceDays: 180,
  },
  {
    service: 'github-actions-ci',
    product: 'shared',
    tier: 1,
    rtoMinutes: 240,
    rpoMinutes: 0,
    degradedMode: 'Block merge/release operations that require unavailable gates; do not waive security checks.',
    dependencies: ['github-source', 'github-actions'],
    readiness: 'partial',
    objectiveStatus: 'target',
    evidenceRefs: [],
    recoveryOwner: 'platform-operations',
    restoreDrillCadenceDays: 180,
  },
  {
    service: 'apple-subscription-verification',
    product: 'cliniverse',
    tier: 1,
    rtoMinutes: 240,
    rpoMinutes: 0,
    degradedMode: 'Do not grant new subscription authority without verified Apple evidence; preserve only previously trusted state according to entitlement policy.',
    dependencies: ['apple-platform', 'cliniverse-control-plane'],
    readiness: 'partial',
    objectiveStatus: 'target',
    evidenceRefs: [],
    recoveryOwner: 'commerce-operations',
    restoreDrillCadenceDays: 90,
  },
  {
    service: 'b2b-payment-provider',
    product: 'neuraops',
    tier: 1,
    rtoMinutes: 240,
    rpoMinutes: 0,
    degradedMode: 'Do not activate paid entitlement without verified settlement evidence; use approved manual invoicing/bank-transfer workflow only when formally enabled.',
    dependencies: ['payment-provider-unselected'],
    readiness: 'gap',
    objectiveStatus: 'target',
    evidenceRefs: [],
    recoveryOwner: 'commerce-operations',
    restoreDrillCadenceDays: 90,
  },
  {
    service: 'dns-and-domain',
    product: 'shared',
    tier: 1,
    rtoMinutes: 240,
    rpoMinutes: 0,
    degradedMode: 'Freeze DNS mutations; preserve known-good records and use verified alternate communication channels.',
    dependencies: ['domain-registrar', 'dns-provider'],
    readiness: 'gap',
    objectiveStatus: 'target',
    evidenceRefs: [],
    recoveryOwner: 'platform-operations',
    restoreDrillCadenceDays: 180,
  },
  {
    service: 'media-production-stack',
    product: 'shared',
    tier: 3,
    rtoMinutes: 2880,
    rpoMinutes: 1440,
    degradedMode: 'Pause new creative production and continue from exported/source assets when available; no impact to clinical or commerce authority.',
    dependencies: ['canva', 'runway', 'capcut'],
    readiness: 'gap',
    objectiveStatus: 'target',
    evidenceRefs: [],
    recoveryOwner: 'media-operations',
    restoreDrillCadenceDays: 365,
  },
])

export function validateRecoveryObjective(item) {
  if (!item || typeof item !== 'object') throw new TypeError('Recovery objective must be an object')
  if (!item.service || typeof item.service !== 'string') throw new TypeError('Recovery service is required')
  if (!PRODUCTS.has(item.product)) throw new TypeError(`Invalid recovery product: ${String(item.product)}`)
  if (!TIERS.has(item.tier)) throw new TypeError(`Invalid recovery tier: ${String(item.tier)}`)
  if (!Number.isInteger(item.rtoMinutes) || item.rtoMinutes < 0) throw new TypeError('Invalid RTO')
  if (!Number.isInteger(item.rpoMinutes) || item.rpoMinutes < 0) throw new TypeError('Invalid RPO')
  if (!item.degradedMode || typeof item.degradedMode !== 'string') throw new TypeError('Degraded mode is required')
  if (!Array.isArray(item.dependencies)) throw new TypeError('Recovery dependencies must be an array')
  if (!READINESS.has(item.readiness)) throw new TypeError(`Invalid recovery readiness: ${String(item.readiness)}`)
  if (!OBJECTIVE_STATUS.has(item.objectiveStatus)) throw new TypeError(`Invalid objective status: ${String(item.objectiveStatus)}`)
  if (!Array.isArray(item.evidenceRefs)) throw new TypeError('Recovery evidenceRefs must be an array')
  if (item.evidenceRefs.some((ref) => typeof ref !== 'string' || ref.length === 0 || ref.length > 160)) {
    throw new TypeError('Invalid recovery evidence reference')
  }
  if (new Set(item.evidenceRefs).size !== item.evidenceRefs.length) {
    throw new TypeError('Duplicate recovery evidence reference')
  }
  if (item.objectiveStatus === 'verified' || item.readiness === 'verified') {
    if (item.objectiveStatus !== 'verified' || item.readiness !== 'verified') {
      throw new TypeError('Verified recovery status and readiness must agree')
    }
    if (item.evidenceRefs.length === 0) {
      throw new TypeError('Verified recovery objectives require evidence')
    }
  }
  if (!Number.isInteger(item.restoreDrillCadenceDays) || item.restoreDrillCadenceDays <= 0) {
    throw new TypeError('Invalid restore drill cadence')
  }
  return true
}

export function validateRecoveryMatrix(matrix = RECOVERY_MATRIX) {
  const seen = new Set()
  for (const item of matrix) {
    validateRecoveryObjective(item)
    if (seen.has(item.service)) throw new TypeError(`Duplicate recovery service: ${item.service}`)
    seen.add(item.service)
  }
  return true
}

export function recoverySummary(matrix = RECOVERY_MATRIX) {
  validateRecoveryMatrix(matrix)
  return {
    total: matrix.length,
    verified: matrix.filter((item) => item.readiness === 'verified').length,
    partial: matrix.filter((item) => item.readiness === 'partial').length,
    gaps: matrix.filter((item) => item.readiness === 'gap').length,
    tier0Gaps: matrix.filter((item) => item.tier === 0 && item.readiness === 'gap').map((item) => item.service),
  }
}
