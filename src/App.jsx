import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, Cell,
} from 'recharts'
import {
  DEFAULT_MULTIPLIERS, CURRENCIES, runScenario, mrrByTier, newVmPrice,
  fmtMoney, fmtPct,
} from './model.js'

const TIERS = ['Shared', 'CPU Optimized', 'General Purpose', 'Memory Optimized', 'Dedicated (Private)']
const BASE = import.meta.env.BASE_URL

export default function App() {
  const [accounts, setAccounts] = useState(null)
  const [error, setError] = useState(null)

  const [multipliers, setMultipliers] = useState({ ...DEFAULT_MULTIPLIERS })
  const [dedicatedPremium, setDedicatedPremium] = useState(0)
  const [premiumOn, setPremiumOn] = useState(false)
  const [threshold, setThreshold] = useState(0.60)
  const [discountOn, setDiscountOn] = useState(false)
  const [discountPct, setDiscountPct] = useState(0.15)
  const [currency, setCurrency] = useState('RUB')
  const [selectedAcc, setSelectedAcc] = useState(null)

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

  if (error) return <div className="app"><p style={{ color: 'var(--danger)' }}>Ошибка загрузки данных: {error}</p></div>
  if (!accounts || !scenario) return <div className="app"><p>Загрузка синтетических данных…</p></div>

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
          <p>3HCloud · внутренний инструмент Product Owner'а · проиграй тарифную сетку до объявления клиентам</p>
        </div>
        <div className="badge">⚠ Synthetic data · illustrative reconstruction of a real 3HCloud case</div>
      </header>

      <div className="cur-switch" style={{ marginTop: 14 }}>
        {CURRENCIES.map(c => (
          <button key={c} className={c === currency ? 'active' : ''} onClick={() => { setCurrency(c); setSelectedAcc(null) }}>
            {c} · {c === 'RUB' ? 'PROCloud' : c === 'USD' ? '3hcloud' : '3HCKZ'}
          </button>
        ))}
      </div>

      <div className="layout">
        {/* ── Контролы ── */}
        <aside className="panel">
          <h2>Новая тарифная сетка</h2>
          {TIERS.map(t => (
            <div className="control" key={t}>
              <label>{t.replace(' (Private)', '')}<b>×{multipliers[t].toFixed(2)}</b></label>
              <input type="range" min="0.8" max="1.6" step="0.01" value={multipliers[t]}
                onChange={e => setMultipliers(m => ({ ...m, [t]: +e.target.value }))} />
            </div>
          ))}

          <div className="control">
            <label className="toggle">
              <input type="checkbox" checked={premiumOn} onChange={e => setPremiumOn(e.target.checked)} />
              Премия за выделенные ядра (не-Shared)
            </label>
            {premiumOn && (
              <>
                <label style={{ marginTop: 8 }}>надбавка<b>+{Math.round(dedicatedPremium * 100)}%</b></label>
                <input type="range" min="0" max="0.30" step="0.01" value={dedicatedPremium}
                  onChange={e => setDedicatedPremium(+e.target.value)} />
              </>
            )}
          </div>

          <h2 style={{ marginTop: 22 }}>Симулятор оттока</h2>
          <div className="control">
            <label>Порог риска<b>{threshold.toFixed(2)}</b></label>
            <input type="range" min="0.40" max="0.80" step="0.01" value={threshold}
              onChange={e => setThreshold(+e.target.value)} />
          </div>
          <div className="control">
            <label className="toggle">
              <input type="checkbox" checked={discountOn} onChange={e => setDiscountOn(e.target.checked)} />
              Точечная скидка для top-5% риска
            </label>
            {discountOn && (
              <>
                <label style={{ marginTop: 8 }}>скидка<b>{Math.round(discountPct * 100)}%</b></label>
                <input type="range" min="0.10" max="0.20" step="0.01" value={discountPct}
                  onChange={e => setDiscountPct(+e.target.value)} />
              </>
            )}
          </div>
          <button className="" style={{ marginTop: 6, background: 'var(--panel-2)', color: 'var(--muted)', border: '1px solid var(--line)', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', fontSize: 12 }}
            onClick={() => { setMultipliers({ ...DEFAULT_MULTIPLIERS }); setPremiumOn(false); setDedicatedPremium(0); setThreshold(0.60); setDiscountOn(false); setDiscountPct(0.15) }}>
            ↺ сбросить к дефолтам кейса
          </button>
        </aside>

        {/* ── Дашборд ── */}
        <main>
          <div className="kpis">
            <div className="kpi">
              <div className="k-label">MRR ({currency})</div>
              <div className="k-val">{cur ? fmtMoney(cur.newMRR, currency) : '—'}</div>
              <div className={'k-sub ' + (mrrDelta >= 0 ? 'delta-up' : 'delta-down')}>
                было {cur ? fmtMoney(cur.oldMRR, currency) : '—'} · {fmtPct(mrrDelta)}
              </div>
            </div>
            <div className="kpi">
              <div className="k-label">ARPU ({currency})</div>
              <div className="k-val">{cur ? fmtMoney(cur.newARPU, currency) : '—'}</div>
              <div className={'k-sub ' + (arpuDelta >= 0 ? 'delta-up' : 'delta-down')}>
                было {cur ? fmtMoney(cur.oldARPU, currency) : '—'} · {arpuDelta == null ? '—' : fmtPct(arpuDelta)}
              </div>
            </div>
            <div className="kpi">
              <div className="k-label">Churn (клиенты)</div>
              <div className="k-val">{cur ? cur.churnPctClients.toFixed(1) + '%' : '—'}</div>
              <div className="k-sub">{cur ? `${cur.n - cur.retainedCount} из ${cur.n} аккаунтов` : '—'}</div>
            </div>
            <div className="kpi">
              <div className="k-label">Churn (по MRR)</div>
              <div className="k-val">{cur ? cur.churnPctMRR.toFixed(1) + '%' : '—'}</div>
              <div className="k-sub">потеря выручки в {currency}</div>
            </div>
          </div>

          {/* Рычаг скидок: эффект */}
          {cmp && (
            <div className="panel" style={{ marginTop: 18 }}>
              <p className="section-title">Эффект точечной скидки (top-5% риска, {currency})</p>
              <div className="lever-note">
                Net-MRR с удержанием через скидку: <b>{fmtMoney(cmp.netWithLever, currency)}</b>.
                Net-MRR, если бы top-5% ушли: <b>{fmtMoney(cmp.netIfTop5Churn, currency)}</b>.
                {' '}Разница: <b>{fmtMoney(cmp.netWithLever - cmp.netIfTop5Churn, currency)}</b>
                {discountOn
                  ? ' — удержание дешевле потери (и дешевле массового grandfathering, не размывает uplift на 95%).'
                  : ' — включи скидку слева, чтобы применить рычаг.'}
                <br /><span className="tag-illu">иллюстрация на синтетике</span>
              </div>
            </div>
          )}

          <div className="grid-2">
            <div className="panel">
              <p className="section-title">MRR before/after по тирам · {currency}</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={tierChart} margin={{ top: 6, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2f3b4a" />
                  <XAxis dataKey="tier" tick={{ fill: '#93a1b0', fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: '#93a1b0', fontSize: 11 }} width={54} />
                  <Tooltip contentStyle={{ background: '#1a212b', border: '1px solid #2f3b4a', borderRadius: 8, color: '#e6edf3' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="old" name="старая" fill="#4ea8de" />
                  <Bar dataKey="neu" name="новая" fill="#36c2a4" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="panel">
              <p className="section-title">Доля оттока по когортам (size decile) · все валюты</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={scenario.cohorts} margin={{ top: 6, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2f3b4a" />
                  <XAxis dataKey="decile" tick={{ fill: '#93a1b0', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#93a1b0', fontSize: 11 }} width={40} unit="%" />
                  <Tooltip contentStyle={{ background: '#1a212b', border: '1px solid #2f3b4a', borderRadius: 8, color: '#e6edf3' }} />
                  <Bar dataKey="churnRate" name="отток %">
                    {scenario.cohorts.map((c, i) => (
                      <Cell key={i} fill={c.churnRate > 20 ? '#e2575b' : c.churnRate > 8 ? '#e8a33d' : '#36c2a4'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Таблица top-at-risk */}
          <div className="panel" style={{ marginTop: 18 }}>
            <p className="section-title">Top-at-risk аккаунты (top-5% подсвечены) · клик → калькулятор миграции</p>
            <div style={{ maxHeight: 320, overflow: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>payer (synthetic)</th><th>provider</th><th className="num">MRR</th>
                    <th className="num">%Δ счёта</th><th className="num">churn_risk</th>
                  </tr>
                </thead>
                <tbody>
                  {scenario.topAtRisk.map(s => (
                    <tr key={s.account_no} className={s.isTop5 ? 'top5' : ''}
                        style={{ cursor: 'pointer' }} onClick={() => { setCurrency(s.currency); setSelectedAcc(s.account_no) }}>
                      <td>{s.payer}{s.discounted ? ' 🏷️' : ''}</td>
                      <td>{s.provider}</td>
                      <td className="num">{fmtMoney(s.oldBill, s.currency)}</td>
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
            <div className="lever-note">top-5% по риску: <b>{scenario.top5Count}</b> аккаунтов · выше порога {threshold.toFixed(2)}: <b>{scenario.highRiskCount}</b></div>
          </div>

          {/* Калькулятор миграции */}
          <MigrationCalc
            accountsInCur={accountsInCur}
            selectedAcc={selectedAcc}
            setSelectedAcc={setSelectedAcc}
            multipliers={multipliers}
            premium={effectivePremium}
            currency={currency}
          />
        </main>
      </div>

      <p className="foot">
        Данные синтетические, смоделированы по реальному распределению цен/flavor'ов 3HCloud — без реальных payer / счетов / UUID.
        Веса модели оттока <span className="tag-fact">Price Impact 35 · Loyalty 25 · Growth 20 · Size 20</span> — реальные из кейса (факт).
        Защищаемые результаты прода: +30% MRR, +55% ARPU, NDR 60→110% (факт). Числа симулятора на этой странице — <span className="tag-illu">иллюстрация</span>, не вывод продакшен-модели.
      </p>
    </div>
  )
}

function MigrationCalc({ accountsInCur, selectedAcc, setSelectedAcc, multipliers, premium, currency }) {
  const acc = accountsInCur.find(a => a.account_no === selectedAcc) || null
  return (
    <div className="panel" style={{ marginTop: 18 }}>
      <p className="section-title">Калькулятор миграции по аккаунту · {currency}</p>
      <select value={selectedAcc || ''} onChange={e => setSelectedAcc(+e.target.value)}
        style={{ background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: 7, padding: '7px 10px', fontSize: 13, marginBottom: 12, maxWidth: 360 }}>
        <option value="">— выбери аккаунт ({accountsInCur.length} в {currency}) —</option>
        {accountsInCur.slice(0, 200).map(a => (
          <option key={a.account_no} value={a.account_no}>{a.payer} (#{a.account_no}, {a.vms.length} ВМ)</option>
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
              <tr><th>flavor</th><th>тир</th><th className="num">старая</th><th className="num">новая</th><th className="num">%Δ</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.flavor}</td><td>{r.tier.replace(' (Private)', '')}</td>
                  <td className="num">{fmtMoney(r.price_month, currency)}</td>
                  <td className="num">{fmtMoney(r.np, currency)}</td>
                  <td className="num" style={{ color: r.d > 0 ? 'var(--warn)' : 'var(--muted)' }}>{fmtPct(r.d)}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700 }}>
                <td colSpan={2}>ИТОГО по счёту</td>
                <td className="num">{fmtMoney(oldT, currency)}</td>
                <td className="num">{fmtMoney(newT, currency)}</td>
                <td className="num" style={{ color: dT > 0 ? 'var(--warn)' : 'var(--accent)' }}>{fmtPct(dT)}</td>
              </tr>
            </tbody>
          </table>
        )
      })()}
    </div>
  )
}
