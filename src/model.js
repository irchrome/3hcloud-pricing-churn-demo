// Churn-risk & economics model.
// Зеркалит Python-эталон (verify/churn_ref.py). Веса — реальные из кейса 3HCloud.
// Любое изменение формулы здесь обязано совпадать с эталоном до 3-го знака (см. README → verification).

export const WEIGHTS = { price: 0.35, loyalty: 0.25, growth: 0.20, size: 0.20 }

// Дефолтные множители тиров (логика кейса: вход дёшево, дорогие конфиги чуть выше рынка).
export const DEFAULT_MULTIPLIERS = {
  'Shared': 1.0,
  'CPU Optimized': 1.15,
  'General Purpose': 1.10,
  'Memory Optimized': 1.08,
  'Dedicated (Private)': 1.12,
}

export const CURRENCIES = ['RUB', 'USD', 'KZT']
export const CURRENCY_SYMBOL = { RUB: '₽', USD: '$', KZT: '₸' }

const clamp = (x, a, b) => Math.max(a, Math.min(b, x))

export function newVmPrice(vm, multipliers, dedicatedPremium) {
  const m = multipliers[vm.tier] ?? 1.0
  const prem = vm.tier !== 'Shared' ? (1 + dedicatedPremium) : 1.0
  return vm.price_month * m * prem
}

// Считает риск и экономику по одному аккаунту под заданной сеткой.
export function scoreAccount(acc, multipliers, dedicatedPremium) {
  const oldBill = acc.vms.reduce((s, vm) => s + vm.price_month, 0)
  const newBill = acc.vms.reduce((s, vm) => s + newVmPrice(vm, multipliers, dedicatedPremium), 0)
  const inc = oldBill > 0 ? (newBill - oldBill) / oldBill : 0

  const priceImpact = clamp(inc / 0.50, 0, 1)                      // 50%+ роста счёта → 1
  const loyalty = 0.5 * (acc.tenure_months / 48) + 0.5 * ((acc.payment_discipline - 0.4) / 0.6) // выше = меньше риск
  const growth = (acc.growth_trend + 0.6) / 1.5                    // выше = меньше риск
  const sizePressure = acc.size_decile / 10

  const risk =
    WEIGHTS.price * priceImpact +
    WEIGHTS.loyalty * (1 - loyalty) +
    WEIGHTS.growth * (1 - growth) +
    WEIGHTS.size * sizePressure

  return { account_no: acc.account_no, payer: acc.payer, provider: acc.provider,
           currency: acc.currency, size_decile: acc.size_decile,
           oldBill, newBill, inc, risk, subscores: { priceImpact, loyalty, growth, sizePressure } }
}

// Главный расчёт сценария. Возвращает per-currency экономику, top-риск, данные графиков.
export function runScenario(accounts, { multipliers, dedicatedPremium, threshold, discountOn, discountPct }) {
  let scored = accounts.map(a => scoreAccount(a, multipliers, dedicatedPremium))

  // top-5% по риску (по рангу, независимо от порога).
  const sortedByRisk = [...scored].sort((a, b) => b.risk - a.risk)
  const top5Count = Math.round(0.05 * scored.length)
  const top5Ids = new Set(sortedByRisk.slice(0, top5Count).map(s => s.account_no))

  // Точечная скидка: только top-5%. Снижает их новый счёт → пересчёт прироста и риска.
  const withDiscount = scored.map(s => {
    if (discountOn && top5Ids.has(s.account_no) && s.oldBill > 0) {
      const newBill = s.newBill * (1 - discountPct)
      const inc = (newBill - s.oldBill) / s.oldBill
      const priceImpact = clamp(inc / 0.50, 0, 1)
      const risk =
        WEIGHTS.price * priceImpact +
        WEIGHTS.loyalty * (1 - s.subscores.loyalty) +
        WEIGHTS.growth * (1 - s.subscores.growth) +
        WEIGHTS.size * s.subscores.sizePressure
      return { ...s, newBill, inc, risk, discounted: true }
    }
    return { ...s, discounted: false }
  })

  const retained = s => s.risk <= threshold

  // Экономика per-currency (валюты НЕ смешиваются).
  const byCurrency = {}
  for (const cur of CURRENCIES) {
    const cr = withDiscount.filter(s => s.currency === cur)
    if (cr.length === 0) continue
    const ret = cr.filter(retained)
    const oldMRR = cr.reduce((s, x) => s + x.oldBill, 0)
    const newMRR = ret.reduce((s, x) => s + x.newBill, 0)
    const oldMRRretainedBase = ret.reduce((s, x) => s + x.oldBill, 0)
    // «Если бы top-риск ушёл без скидки» — net-MRR без удержания top-5% этой валюты.
    const churnedClients = cr.length - ret.length
    byCurrency[cur] = {
      n: cr.length,
      oldMRR, newMRR,
      oldARPU: oldMRR / cr.length,
      newARPU: ret.length ? newMRR / ret.length : null,
      churnPctClients: 100 * churnedClients / cr.length,
      churnPctMRR: 100 * (oldMRR - oldMRRretainedBase) / oldMRR,
      retainedCount: ret.length,
    }
  }

  // Сравнение со сценарием полного оттока top-5% (для рычага скидок) — по валюте.
  const netComparison = {}
  for (const cur of CURRENCIES) {
    const cr = withDiscount.filter(s => s.currency === cur)
    if (cr.length === 0) continue
    const top5InCur = cr.filter(s => top5Ids.has(s.account_no))
    const withRetain = cr.filter(retained).reduce((s, x) => s + x.newBill, 0)
    const ifTop5Churn = cr.filter(s => retained(s) && !top5Ids.has(s.account_no)).reduce((s, x) => s + x.newBill, 0)
    netComparison[cur] = { netWithLever: withRetain, netIfTop5Churn: ifTop5Churn, top5n: top5InCur.length }
  }

  // График 1: MRR before/after по тирам (в исходной валюте каждого аккаунта — агрегируем по тиру в "условных" единицах валюты аккаунта; для честности группируем по валюте+тир, но для обзорного графика берём долю в % изменения по тиру).
  const tierAgg = {}
  for (const a of accounts) {
    for (const vm of a.vms) {
      const t = vm.tier
      if (!tierAgg[t]) tierAgg[t] = { tier: t, oldUSDeq: 0, newUSDeq: 0 }
    }
  }

  const topAtRisk = sortedByRisk
    .map(s => withDiscount.find(w => w.account_no === s.account_no))
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 25)
    .map(s => ({ ...s, isTop5: top5Ids.has(s.account_no) }))

  // Распределение риска по дециалям (когорты size_decile) — доля «уходящих».
  const cohorts = []
  for (let d = 1; d <= 10; d++) {
    const cd = withDiscount.filter(s => s.size_decile === d)
    if (cd.length === 0) { cohorts.push({ decile: 'D' + d, churnRate: 0, n: 0 }); continue }
    const churned = cd.filter(s => !retained(s)).length
    cohorts.push({ decile: 'D' + d, churnRate: +(100 * churned / cd.length).toFixed(1), n: cd.length })
  }

  return { scored: withDiscount, byCurrency, netComparison, topAtRisk, cohorts,
           top5Count, highRiskCount: withDiscount.filter(s => !retained(s)).length }
}

// График MRR before/after по тиру В РАЗРЕЗЕ ВАЛЮТЫ (без смешения).
export function mrrByTier(accounts, { multipliers, dedicatedPremium }, currency) {
  const agg = {}
  for (const a of accounts) {
    if (a.currency !== currency) continue
    for (const vm of a.vms) {
      const t = vm.tier
      if (!agg[t]) agg[t] = { tier: t.replace(' (Private)', ''), old: 0, neu: 0 }
      agg[t].old += vm.price_month
      agg[t].neu += newVmPrice(vm, multipliers, dedicatedPremium)
    }
  }
  return Object.values(agg).map(x => ({ tier: x.tier, old: Math.round(x.old), neu: Math.round(x.neu) }))
}

export function fmtMoney(v, currency, locale = 'en-US') {
  if (v == null) return '—'
  const sym = CURRENCY_SYMBOL[currency] || ''
  const n = Math.round(v).toLocaleString(locale)
  return currency === 'USD' ? `${sym}${n}` : `${n} ${sym}`
}

export function fmtPct(v, digits = 1) {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}%`
}
