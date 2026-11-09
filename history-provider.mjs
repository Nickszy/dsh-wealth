// Read-only execution archives; never a complete cash ledger or a position snapshot.
// Dispatch only: each transport's history adapter lives beside its client in the adapter
// modules (futu-mcp.mjs, lb-mcp.mjs, ths-client.mjs, tiger-mcp.mjs, fosun-client.mjs).
// This module looks them up through the registry; connector-registry.mjs never imports
// this module, so the dependency stays one-way (this file -> registry -> adapters).
import { getConnector } from './connector-registry.mjs'

const fail = message => { throw new Error(message) }
function day(value, field = 'Date') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) fail(`${field} must be YYYY-MM-DD`)
  return value
}

export async function fetchNativeHistory(source, secrets, range, signal, deps = {}) {
  const from = day(range?.from, 'from'), to = day(range?.to, 'to')
  if (from > to) fail('from must not be after to')
  const transport = getConnector(source?.connector)?.transports[source?.transport]
  // 原生 SDK 历史以本地时间定位交易日，分发前统一做时间基准与中止检查。
  if (transport?.fetchHistory && transport.usesLocalNow) {
    const now = new Date(deps.now?.() ?? Date.now())
    if (!Number.isFinite(now.getTime())) fail('Invalid current time')
    signal?.throwIfAborted()
    return transport.fetchHistory(source, secrets, { from, to }, signal, deps, now)
  }
  if (transport?.fetchHistory) return transport.fetchHistory(source, secrets, { from, to }, signal, deps)
  if (source?.transport !== 'native') fail('Native history requires a native source')
  const now = new Date(deps.now?.() ?? Date.now())
  if (!Number.isFinite(now.getTime())) fail('Invalid current time')
  signal?.throwIfAborted()
  fail('Native execution history is unavailable for this connector; import an official broker statement file')
}
