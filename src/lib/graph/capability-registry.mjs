const SAFE_ID = /^[a-z0-9][a-z0-9._:/-]{0,159}$/i
const CAPABILITY_KINDS = new Set(['agent', 'tool', 'deterministic', 'action'])
const AUTHORITIES = new Set(['read', 'propose', 'execute'])

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function assertSafeId(name, value) {
  if (typeof value !== 'string' || !SAFE_ID.test(value)) {
    throw new TypeError(`Invalid capability ${name}`)
  }
}

export function createCapabilityRegistry(definitions = []) {
  if (!Array.isArray(definitions)) throw new TypeError('Capability registry requires an array')

  const registry = new Map()

  for (const input of definitions) {
    if (!isPlainObject(input)) throw new TypeError('Capability definition must be an object')
    assertSafeId('id', input.id)
    if (!CAPABILITY_KINDS.has(input.kind)) throw new TypeError('Invalid capability kind')
    if (!AUTHORITIES.has(input.authority)) throw new TypeError('Invalid capability authority')
    if (input.kind === 'agent' && input.authority === 'execute') {
      throw new TypeError('Agent capability cannot execute')
    }
    if (input.kind === 'action' && input.authority !== 'execute') {
      throw new TypeError('Action capability requires execute authority')
    }
    if (typeof input.invoke !== 'function') throw new TypeError('Capability requires invoke()')
    if (registry.has(input.id)) throw new TypeError(`Duplicate capability: ${input.id}`)

    registry.set(input.id, Object.freeze({
      id: input.id,
      kind: input.kind,
      authority: input.authority,
      invoke: input.invoke,
    }))
  }

  return Object.freeze({
    has(id) {
      return registry.has(id)
    },

    get(id) {
      const capability = registry.get(id)
      if (!capability) throw new TypeError(`Unknown capability: ${id}`)
      return capability
    },

    list() {
      return Object.freeze([...registry.values()].map(({ invoke, ...meta }) => Object.freeze(meta)))
    },
  })
}

export const CAPABILITY_REGISTRY_ENUMS = Object.freeze({
  kinds: Object.freeze([...CAPABILITY_KINDS]),
  authorities: Object.freeze([...AUTHORITIES]),
})
