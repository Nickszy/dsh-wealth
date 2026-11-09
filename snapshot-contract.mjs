// Test-only helper: the shared "exam" every source adapter's snapshot must pass.
// Adapters return raw snapshots; sync.mjs feeds them to normalizeSnapshot, so an
// adapter test that never goes through the normalizer can pass while real syncs fail.
import assert from 'node:assert/strict'
import { normalizeSnapshot } from './snapshot-schema.mjs'

// sourceTotals keys that intentionally duplicate a top-level snapshot field.
const MIRRORED_TOTAL_KEYS = new Set(['quoteDate', 'uploadedAt'])

/**
 * Assert a raw adapter snapshot satisfies the sync contract and return the normalized value.
 * @param {object} raw adapter output
 * @param {{ complete?: boolean, warning?: RegExp, severity?: Record<string, 'info'|'degraded'> }} [expect]
 */
export function assertSnapshotContract(raw, expect = {}) {
  const warnings = raw?.warnings ?? []
  assert.ok(Array.isArray(warnings), 'snapshot.warnings must be an array')
  // v1 字符串与 v2 { code, severity?, message? } 对象都接受；normalizeSnapshot 负责统一。
  warnings.forEach((w, i) => assert.ok(typeof w === 'string' || (w && typeof w === 'object' && !Array.isArray(w)), `snapshot.warnings[${i}] must be a string or warning object, got ${JSON.stringify(w)}`))
  const snapshot = normalizeSnapshot(raw)
  for (const key of Object.keys(raw.sourceTotals ?? {})) {
    if (MIRRORED_TOTAL_KEYS.has(key)) continue
    assert.ok(snapshot.sourceTotals && key in snapshot.sourceTotals, `sourceTotals.${key} is silently dropped by normalizeSnapshot`)
  }
  if (expect.complete !== undefined) assert.equal(snapshot.complete, expect.complete, `expected complete=${expect.complete}`)
  if (expect.warning) assert.ok(snapshot.warnings.some((w) => expect.warning.test(w)), `expected a warning matching ${expect.warning}; got ${JSON.stringify(snapshot.warnings)}`)
  for (const [code, severity] of Object.entries(expect.severity ?? {})) assertWarningSeverity(snapshot, code, severity)
  return snapshot
}

/** v2: assert a normalized snapshot carries a warning code at the expected severity. */
export function assertWarningSeverity(snapshot, code, severity) {
  const found = (snapshot?.warningDetails ?? []).filter((w) => w.code === code)
  assert.ok(found.length, `expected a warning with code ${code}; got ${JSON.stringify((snapshot?.warningDetails ?? []).map((w) => w.code))}`)
  assert.ok(found.some((w) => w.severity === severity), `expected ${code} severity ${severity}; got ${JSON.stringify(found)}`)
}

/**
 * Totals the adapter computes itself must not add amounts in different currencies.
 * Pass only keys the adapter sums locally; broker-reported converted totals are allowed.
 */
export function assertNoCrossCurrencySum(raw, keys = ['cash']) {
  const currencies = new Set(raw.holdings.filter((h) => h.assetClass === 'cash').map((h) => h.currency))
  if (currencies.size < 2) return
  for (const key of keys) assert.equal(raw.sourceTotals?.[key], undefined, `sourceTotals.${key} must be omitted when cash spans ${[...currencies].join('/')}`)
}
