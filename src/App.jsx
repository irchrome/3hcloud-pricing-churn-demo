import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, Cell,
} from 'recharts'
import {
  DEFAULT_MULTIPLIERS, CURRENCIES, runScenario, mrrByTier, newVmPrice,
  fmtMoney, fmtPct,
} from './model.js'
import { t, numLocale } from './strings.js'

const TIERS = ['Shared', 'CPU Optimized', 'General Purpose', 'Memory Optimized', 'Dedicated (Private)']
const BASE = import.meta.env.BASE_URL

export default function App() {
  const [accounts, setAccounts] = useState(null)
  const [error, setError] = useState(null)
  const [lang, setLang] = useState('en')

  const [multipliers, setMultipliers] = useState({ ...DEFAULT_MULTIPLIERS })
  const [dedicatedPremium, setDedicatedPremium] = useState(0)
  const [premiumOn, setPremiumOn] = useState(false)
  const [threshold, setThreshold] = useState(0.60)
  const [discountOn, setDiscountOn] = useState(false)
  const [discountPct, setDiscountPct] = useState(0.15)
  const [currency, setCurrency] = useState('RUB')
  const [selectedAcc, setSelectedAcc] = useState(null)

  const L = t(lang)
  const loc = numLocale(lang)
  const money = (v, c) => fmtMoney(v, c, loc)

  useEffect(() => {
    fetch(`${BASE}data/accounts.json`)
      .then(r => r.json())
      .then(d => setAccounts(d.accounts))
      .catch(e => setError(String(e)))
  }, [])

  const effectivePremium = premiumOn ? dedicatedPremium : 0

  const scenario = useMemo(() => {
    if (!accounts) return null
    return runScenario(accounts, {
      multipliers, dedicatedPremium: effectivePremium, threshold, discountOn, discountPct,
    })
  }, [accounts, multipliers, effectivePremium, threshold, discountOn, discountPct])

  const tierChart = useMemo(() => {
    if (!accounts) return []
    return mrrByTier(accounts, { multipliers, dedicatedPremium: effectivePremium }, currency)
  }, [accounts, multipliers, effectivePremium, currency])

  if (error) return <div className="app"><p style={{ color: 'var(--danger)' }}>{L.loadError}{error}</p></div>
  if (!accounts || !scenario) return <div className="app"><p>{L.loading}</p></div>

  const cur = scenario.byCurrency[currency]
  const cmp = scenario.netComparison[currency]
  const mrrDelta = cur ? 100 * (cur.newMRR - cur.oldMRR) / cur.oldMRR : 0
  const arpuDelta = cur && cur.newARPU != null ? 100 * (cur.newARPU - cur.oldARPU) / cur.oldARPU : null

  const accountsInCur = accounts.filter(a => a.currency === currency)

  return (
    <div className="app">
      <header className="top">
        <div className="title">
          <h1>Pricing &amp; Churn Economics Console</h1>
          <p>{L.subtitle}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="badge">{L.badge}</div>
          <button className="lang-btn" onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}>{L.langBtn}</button>
        </div>
      </header>

      <div className="cur-switch" style={{ marginTop: 14 }}>
        {CURRENCIES.map(c => (
          <button key={c} className={c === currency ? 'active' : ''} onClick={() => { setCurrency(c); setSelectedAcc(null) }}>
            {c} · {c === 'RUB' ? 'PROCloud' : c === 'USD' ? '3hcloud' : '3HCKZ'}
          </button>
        ))}
      </div>

      <div className="layout">
        {/* ── Controls ── */}
        <aside className="panel">
          <h2>{L.gridTitle}</h2>
          {TIERS.map(ti => (
            <div className="control" key={ti}>
              <label>{ti.replace(' (Private)', '')}<b>×{multipliers[ti].toFixed(2)}</b></label>
              <input type="range" min="0.8" max="1.6" step="0.01" value={multipliers[ti]}
                onChange={e => setMultipliers(m => ({ ...m, [ti]: +e.target.value }))} />
            </div>
          ))}

          <div className="control">
            <label className="toggle">
              <input type="checkbox" checked={premiumOn} onChange={e => setPremiumOn(e.target.checked)} />
              {L.premiumToggle}
            </label>
            {premiumOn && (
              <>
                <label style={{ marginTop: 8 }}>{L.premiumLabel}<b>+{Math.round(dedicatedPremium * 100)}%</b></label>
                <input type="range" min="0" max="0.30" step="0.01" value={dedicatedPremium}
                  onChange={e => setDedicatedPremium(+e.target.value)} />
              </>
            )}
          </div>

          <h2 style={{ marginTop: 22 }}>{L.simTitle}</h2>
          <div className="control">
            <label>{L.threshold}<b>{threshold.toFixed(2)}</b></label>
            <input type="range" min="0.40" max="0.80" step="0.01" value={threshold}
              onChange={e => setThreshold(+e.target.value)} />
          </div>
          <div className="control">
            <label className="toggle">
              <input type="checkbox" checked={discountOn} onChange={e => setDiscountOn(e.target.checked)} />
              {L.discountToggle}
            </label>
            {discountOn && (
              <>
                <label style={{ marginTop: 8 }}>{L.discountLabel}<b>{Math.round(discountPct * 100)}%</b></label>
                <input type="range" min="0.10" max="0.20" step="0.01" value={discountPct}
                  onChange={e => setDiscountPct(+e.target.value)} />
              </>
            )}
          </div>
          <button style={{ marginTop: 6, background: 'var(--panel-2)', color: 'var(--muted)', border: '1px solid var(--line)', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', fontSize: 12 }}
            onClick={() => { setMultipliers({ ...DEFAULT_MULTIPLIERS }); setPremiumOn(false); setDedicatedPremium(0); setThreshold(0.60); setDiscountOn(false); setDiscountPct(0.15) }}>
            {L.reset}
          </button>
        </aside>

        {/* ── Dashboard ── */}
        <main>
          <div className="kpis">
            <div className="kpi">
              <div className="k-label">{L.mrr} ({currency})</div>
              <div className="k-val">{cur ? money(cur.newMRR, currency) : '—'}</div>
              <div className={'k-sub ' + (mrrDelta >= 0 ? 'delta-up' : 'delta-down')}>
                {L.was} {cur ? money(cur.oldMRR, currency) : '—'} · {fmtPct(mrrDelta)}
              </div>
            </div>
            <div className="kpi">
              <div className="k-label">{L.arpu} ({currency})</div>
              <div className="k-val">{cur ? money(cur.newARPU, currency) : '—'}</div>
              <div className={'k-sub ' + (arpuDelta >= 0 ? 'delta-up' : 'delta-down')}>
                {L.was} {cur ? money(cur.oldARPU, currency) : '—'} · {arpuDelta == null ? '—' : fmtPct(arpuDelta)}
              </div>
            </div>
            <div className="kpi">
              <div className="k-label">{L.churnClients}</div>
              <div className="k-val">{cur ? cur.churnPctClients.toFixed(1) + '%' : '—'}</div>
              <div className="k-sub">{cur ? L.ofAccounts(cur.n - cur.retainedCount, cur.n) : '—'}</div>
            </div>
            <div className="kpi">
              <div className="k-label">{L.churnMRR}</div>
              <div className="k-val">{cur ? cur.churnPctMRR.toFixed(1) + '%' : '—'}</div>
              <div className="k-sub">{L.revenueLost(currency)}</div>
            </div>
          </div>

          {cmp && (
            <div className="panel" style={{ marginTop: 18 }}>
              <p className="section-title">{L.leverTitle(currency)}</p>
              <div className="lever-note">
                {L.netWith} <b>{money(cmp.netWithLever, currency)}</b>.
                {' '}{L.netIf} <b>{money(cmp.netIfTop5Churn, currency)}</b>.
                {' '}{L.diff} <b>{money(cmp.netWithLever - cmp.netIfTop5Churn, currency)}</b>
                {discountOn ? L.leverOn : L.leverOff}
                <br /><span className="tag-illu">{L.illustration}</span>
              </div>
            </div>
          )}

          <div className="grid-2">
            <div className="panel">
              <p className="section-title">{L.chart1(currency)}</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={tierChart} margin={{ top: 6, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2f3b4a" />
                  <XAxis dataKey="tier" tick={{ fill: '#93a1b0', fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: '#93a1b0', fontSize: 11 }} width={54} />
                  <Tooltip contentStyle={{ background: '#1a212b', border: '1px solid #2f3b4a', borderRadius: 8, color: '#e6edf3' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="old" name={L.old} fill="#4ea8de" />
                  <Bar dataKey="neu" name={L.neu} fill="#36c2a4" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="panel">
              <p className="section-title">{L.chart2}</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={scenario.cohorts} margin={{ top: 6, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2f3b4a" />
                  <XAxis dataKey="decile" tick={{ fill: '#93a1b0', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#93a1b0', fontSize: 11 }} width={40} unit="%" />
                  <Tooltip contentStyle={{ background: '#1a212b', border: '1px solid #2f3b4a', borderRadius: 8, color: '#e6edf3' }} />
                  <Bar dataKey="churnRate" name={L.churnPct}>
                    {scenario.cohorts.map((c, i) => (
                      <Cell key={i} fill={c.churnRate > 20 ? '#e2575b' : c.churnRate > 8 ? '#e8a33d' : '#36c2a4'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 18 }}>
            <p className="section-title">{L.tableTitle}</p>
            <div style={{ maxHeight: 320, overflow: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>{L.colPayer}</th><th>{L.colProvider}</th><th className="num">{L.colMRR}</th>
                    <th className="num">{L.colBillDelta}</th><th className="num">{L.colRisk}</th>
                  </tr>
                </thead>
                <tbody>
                  {scenario.topAtRisk.map(s => (
                    <tr key={s.account_no} className={s.isTop5 ? 'top5' : ''}
                        style={{ cursor: 'pointer' }} onClick={() => { setCurrency(s.currency); setSelectedAcc(s.account_no) }}>
                      <td>{s.payer}{s.discounted ? ' 🏷️' : ''}</td>
                      <td>{s.provider}</td>
                      <td className="num">{money(s.oldBill, s.currency)}</td>
                      <td className="num" style={{ color: s.inc > 0 ? 'var(--warn)' : 'var(--muted)' }}>{fmtPct(s.inc * 100)}</td>
                      <td className="num">
                        <span className="risk-pill" style={{
                          background: s.risk > threshold ? 'rgba(226,87,91,.18)' : 'rgba(54,194,164,.15)',
                          color: s.risk > threshold ? '#e2575b' : '#36c2a4',
                        }}>{s.risk.toFixed(3)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="lever-note">{L.top5Note(scenario.top5Count, scenario.highRiskCount, threshold.toFixed(2))}</div>
          </div>

          <MigrationCalc
            accountsInCur={accountsInCur}
            selectedAcc={selectedAcc}
            setSelectedAcc={setSelectedAcc}
            multipliers={multipliers}
            premium={effectivePremium}
            currency={currency}
            money={money}
            L={L}
          />
        </main>
      </div>

      <p className="foot">
        {L.foot} <span className="tag-fact">{L.footWeights}</span> {L.footFact} <span className="tag-illu">{L.footIllu}</span>{L.footEnd}
      </p>
    </div>
  )
}

function MigrationCalc({ accountsInCur, selectedAcc, setSelectedAcc, multipliers, premium, currency, money, L }) {
  const acc = accountsInCur.find(a => a.account_no === selectedAcc) || null
  return (
    <div className="panel" style={{ marginTop: 18 }}>
      <p className="section-title">{L.migTitle(currency)}</p>
      <select value={selectedAcc || ''} onChange={e => setSelectedAcc(+e.target.value)}
        style={{ background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: 7, padding: '7px 10px', fontSize: 13, marginBottom: 12, maxWidth: 360 }}>
        <option value="">{L.migPick(accountsInCur.length, currency)}</option>
        {accountsInCur.slice(0, 200).map(a => (
          <option key={a.account_no} value={a.account_no}>{a.payer} (#{a.account_no}, {a.vms.length} {L.vmShort})</option>
        ))}
      </select>
      {acc && (() => {
        const rows = acc.vms.map(vm => {
          const np = newVmPrice(vm, multipliers, premium)
          return { ...vm, np, d: vm.price_month > 0 ? 100 * (np - vm.price_month) / vm.price_month : 0 }
        })
        const oldT = rows.reduce((s, r) => s + r.price_month, 0)
        const newT = rows.reduce((s, r) => s + r.np, 0)
        const dT = oldT > 0 ? 100 * (newT - oldT) / oldT : 0
        return (
          <table>
            <thead>
              <tr><th>{L.colFlavor}</th><th>{L.colTier}</th><th className="num">{L.colOld}</th><th className="num">{L.colNew}</th><th className="num">{L.colDelta}</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.flavor}</td><td>{r.tier.replace(' (Private)', '')}</td>
                  <td className="num">{money(r.price_month, currency)}</td>
                  <td className="num">{money(r.np, currency)}</td>
                  <td className="num" style={{ color: r.d > 0 ? 'var(--warn)' : 'var(--muted)' }}>{fmtPct(r.d)}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700 }}>
                <td colSpan={2}>{L.totalRow}</td>
                <td className="num">{money(oldT, currency)}</td>
                <td className="num">{money(newT, currency)}</td>
                <td className="num" style={{ color: dT > 0 ? 'var(--warn)' : 'var(--accent)' }}>{fmtPct(dT)}</td>
              </tr>
            </tbody>
          </table>
        )
      })()}
    </div>
  )
}
