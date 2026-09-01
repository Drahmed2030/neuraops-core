import { buildOperationsApiResponse } from './operations-api.mjs'

/** @type {Readonly<Record<number, 'authentication-required' | 'access-denied' | 'unavailable'>>} */
const STATUS_TO_VIEW = Object.freeze({
  401: 'authentication-required',
  403: 'access-denied',
  503: 'unavailable',
})

function privacyBoundarySatisfied(snapshot) {
  return snapshot?.mode === 'read-only'
    && snapshot?.privacy?.rawPayloadsIncluded === false
    && snapshot?.privacy?.eventAttributesIncluded === false
    && snapshot?.privacy?.directIdentifiersIncluded === false
    && snapshot?.privacy?.clinicalDataIncluded === false
    && snapshot?.incidentLineage?.replayMode === 'metadata-only'
    && snapshot?.incidentLineage?.executionAllowed === false
}

/**
 * @typedef {Object} OperationsConsoleOptions
 * @property {{ ok: boolean, status?: number, code?: string }} [access]
 * @property {string} [generatedAt]
 * @property {(input: { generatedAt: string }) => unknown} [readModelFactory]
 * @property {(error: unknown) => void} [onError]
 */

/**
 * @typedef {{ kind: 'ready', snapshot: unknown }
 *   | { kind: 'authentication-required' | 'access-denied' | 'unavailable' }} OperationsConsoleView
 */

/**
 * @param {OperationsConsoleOptions} [options]
 * @returns {Readonly<OperationsConsoleView>}
 */
export function buildOperationsConsoleView(options = {}) {
  const { onError = (_error) => {} } = options
  const result = buildOperationsApiResponse(options)

  if (result.status !== 200) {
    return Object.freeze(/** @type {OperationsConsoleView} */ ({
      kind: STATUS_TO_VIEW[result.status] || 'unavailable',
    }))
  }

  const snapshot = result.body?.data
  if (!privacyBoundarySatisfied(snapshot)) {
    onError(new TypeError('Operations console rejected an unsafe snapshot'))
    return Object.freeze(/** @type {OperationsConsoleView} */ ({ kind: 'unavailable' }))
  }

  return Object.freeze(/** @type {OperationsConsoleView} */ ({
    kind: 'ready',
    snapshot,
  }))
}
