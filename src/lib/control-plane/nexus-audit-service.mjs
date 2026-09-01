function makeEvent({ eventId, type, occurredAt, organizationId, engagementId, actor, payload }) {
  return { eventId, type, occurredAt, organizationId, engagementId, actor, payload: payload ?? {} }
}

async function commitNamedEvent(persistence, engagementId, event) {
  const bundle = await persistence.loadEngagementBundle(engagementId)
  if (!bundle) return { ok: false, reason: 'engagement_not_found' }
  return persistence.commitLifecycle({
    engagement: bundle.engagement,
    event,
    expectedVersion: bundle.version,
  })
}

export async function startNexusAudit(persistence, input) {
  const bootstrap = await persistence.bootstrapEngagement({
    sourceRef: input.sourceRef,
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    engagementId: input.engagementId,
    product: 'nexus',
    kind: 'nexus_lifecycle',
    initialState: 'LEAD',
  })
  if (!bootstrap.ok) return bootstrap

  // Bootstrap is the source of truth for IDs. On an idempotent retry the caller may
  // generate fresh UUIDs, but the existing engagement/organization must be reused.
  const organizationId = bootstrap.organizationId
  const engagementId = bootstrap.engagementId

  const event = makeEvent({
    eventId: `${input.sourceRef}:audit-started`,
    type: 'AUDIT_STARTED',
    occurredAt: input.occurredAt,
    organizationId,
    engagementId,
    actor: input.actor ?? { type: 'system' },
    payload: { sourceRef: input.sourceRef },
  })
  const committed = await commitNamedEvent(persistence, engagementId, event)
  return {
    ...committed,
    bootstrapCreated: bootstrap.created,
    organizationId,
    engagementId,
  }
}

export async function completeNexusAudit(persistence, input) {
  const event = makeEvent({
    eventId: `${input.sourceRef}:audit-completed`,
    type: 'AUDIT_COMPLETED',
    occurredAt: input.occurredAt,
    organizationId: input.organizationId,
    engagementId: input.engagementId,
    actor: input.actor ?? { type: 'system' },
    payload: {
      result: input.result,
      priorityGaps: input.priorityGaps ?? [],
    },
  })
  return commitNamedEvent(persistence, input.engagementId, event)
}

export async function requestNexusReview(persistence, input) {
  const event = makeEvent({
    eventId: `${input.sourceRef}:review-requested`,
    type: 'REVIEW_REQUESTED',
    occurredAt: input.occurredAt,
    organizationId: input.organizationId,
    engagementId: input.engagementId,
    actor: input.actor ?? { type: 'user', actorId: input.actorId ?? 'audit-user' },
    payload: {
      contactRoute: input.contactRoute ?? null,
    },
  })
  return commitNamedEvent(persistence, input.engagementId, event)
}
