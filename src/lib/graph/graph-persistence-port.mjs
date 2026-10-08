const SHA256 = /^[a-f0-9]{64}$/

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function assertOpaque(name, value) {
  if (typeof value !== 'string' || !SHA256.test(value)) {
    throw new TypeError(`Invalid persistence ${name}`)
  }
}

export function createGraphPersistencePort(adapter = {}) {
  if (!isPlainObject(adapter)) throw new TypeError('Graph persistence adapter must be an object')

  for (const name of ['loadRun', 'saveRun']) {
    if (typeof adapter[name] !== 'function') {
      throw new TypeError(`Graph persistence adapter requires ${name}()`)
    }
  }

  return Object.freeze({
    async loadRun({ runRef }) {
      assertOpaque('runRef', runRef)
      const value = await adapter.loadRun({ runRef })
      if (value !== null && !isPlainObject(value)) {
        throw new TypeError('Graph persistence loadRun must return object or null')
      }
      return value
    },

    async saveRun({ run, expectedRevision }) {
      if (!isPlainObject(run)) throw new TypeError('Graph persistence saveRun requires run object')
      assertOpaque('runRef', run.runRef)
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
        throw new TypeError('Graph persistence saveRun requires expectedRevision')
      }

      const result = await adapter.saveRun({ run, expectedRevision })
      if (!isPlainObject(result) || typeof result.saved !== 'boolean') {
        throw new TypeError('Graph persistence saveRun returned invalid result')
      }
      if (!result.saved && result.reason !== 'revision-conflict') {
        throw new TypeError('Graph persistence saveRun rejected without revision-conflict reason')
      }
      return Object.freeze({
        saved: result.saved,
        reason: result.reason ?? null,
      })
    },
  })
}

export function createMemoryGraphPersistence() {
  const runs = new Map()

  return createGraphPersistencePort({
    async loadRun({ runRef }) {
      return runs.get(runRef) ?? null
    },

    async saveRun({ run, expectedRevision }) {
      const current = runs.get(run.runRef)
      const currentRevision = current?.revision ?? 0

      if (current && currentRevision !== expectedRevision) {
        return { saved: false, reason: 'revision-conflict' }
      }
      if (!current && expectedRevision !== 0) {
        return { saved: false, reason: 'revision-conflict' }
      }

      runs.set(run.runRef, run)
      return { saved: true }
    },
  })
}
