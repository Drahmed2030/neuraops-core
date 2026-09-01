import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const baseline = JSON.parse(fs.readFileSync(new URL('../security/audit-baseline.json', import.meta.url), 'utf8'))
const today = new Date().toISOString().slice(0, 10)
if (!baseline.expiresOn || today > baseline.expiresOn) {
  console.error(`FAIL: dependency audit baseline expired on ${baseline.expiresOn || 'unknown'}`)
  process.exit(1)
}

const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8' })
let report
try {
  report = JSON.parse(result.stdout || '{}')
} catch {
  console.error('FAIL: npm audit did not return valid JSON')
  console.error(result.stderr)
  process.exit(1)
}

const vulnerabilities = report.vulnerabilities || {}
const critical = Object.entries(vulnerabilities).filter(([, value]) => value?.severity === 'critical')
if (critical.length) {
  console.error(`FAIL: critical vulnerabilities are never baseline-allowed: ${critical.map(([name]) => name).join(', ')}`)
  process.exit(1)
}

const highs = Object.entries(vulnerabilities).filter(([, value]) => value?.severity === 'high')
const allowed = new Set(Object.keys(baseline.allowedHighPackages || {}))
const unknownHigh = highs.filter(([name]) => !allowed.has(name))
if (unknownHigh.length) {
  console.error(`FAIL: new high-severity vulnerabilities detected: ${unknownHigh.map(([name]) => name).join(', ')}`)
  process.exit(1)
}

const missingKnown = [...allowed].filter(name => !highs.some(([current]) => current === name))
if (missingKnown.length) {
  console.error(`FAIL: baseline contains stale entries that should be removed after remediation: ${missingKnown.join(', ')}`)
  process.exit(1)
}

console.log(`PASS: no critical or new high vulnerabilities. Temporary known high baseline: ${highs.map(([name]) => name).join(', ') || 'none'}. Expires ${baseline.expiresOn}.`)
