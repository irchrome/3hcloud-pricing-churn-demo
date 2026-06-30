import { readFileSync } from 'fs'
import { scoreAccount, runScenario, DEFAULT_MULTIPLIERS } from '../src/model.js'
const d = JSON.parse(readFileSync(new URL('../public/data/accounts.json', import.meta.url)))
const accts = d.accounts
const opts = { multipliers: DEFAULT_MULTIPLIERS, dedicatedPremium: 0, threshold: 0.60, discountOn: false, discountPct: 0.15 }
// parity samples vs python: 270003=0.304521 270005=0.267218 270009=0.426958
const want = { 270003: 0.304521, 270005: 0.267218, 270009: 0.426958 }
let ok = true
for (const a of accts) {
  if (want[a.account_no] != null) {
    const r = scoreAccount(a, DEFAULT_MULTIPLIERS, 0).risk
    const diff = Math.abs(r - want[a.account_no])
    const pass = diff < 0.0005
    ok = ok && pass
    console.log(`#${a.account_no} js=${r.toFixed(6)} py=${want[a.account_no]} diff=${diff.toExponential(2)} ${pass?'PASS':'FAIL'}`)
  }
}
const s = runScenario(accts, opts)
console.log('top5Count=', s.top5Count, 'highRisk(>0.60)=', s.highRiskCount)
for (const cur of ['RUB','USD','KZT']) {
  const c = s.byCurrency[cur]
  console.log(`${cur}: n=${c.n} oldMRR=${c.oldMRR.toFixed(2)} newMRR=${c.newMRR.toFixed(2)} churnC=${c.churnPctClients.toFixed(1)}% churnMRR=${c.churnPctMRR.toFixed(1)}% ARPU ${c.oldARPU.toFixed(2)}->${c.newARPU.toFixed(2)}`)
}
console.log(ok ? '\nPARITY: PASS' : '\nPARITY: FAIL')
process.exit(ok?0:1)
