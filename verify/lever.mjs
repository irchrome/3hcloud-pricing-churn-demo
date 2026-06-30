import { readFileSync } from 'fs'
import { runScenario } from '../src/model.js'
const d = JSON.parse(readFileSync(new URL('../public/data/accounts.json', import.meta.url)))
const accts = d.accounts
// агрессивная сетка: всё ×1.4, премия 20%, порог 0.55
const mult = {'Shared':1.4,'CPU Optimized':1.4,'General Purpose':1.4,'Memory Optimized':1.4,'Dedicated (Private)':1.4}
const base = { multipliers: mult, dedicatedPremium: 0.20, threshold: 0.55 }
const noDisc = runScenario(accts, {...base, discountOn:false, discountPct:0.15})
const disc   = runScenario(accts, {...base, discountOn:true,  discountPct:0.15})
console.log('БЕЗ скидки: highRisk=', noDisc.highRiskCount)
console.log('СО скидкой: highRisk=', disc.highRiskCount, '(меньше = часть удержана)')
for (const cur of ['RUB','USD','KZT']) {
  const a=disc.netComparison[cur]
  console.log(`${cur}: netWithLever=${a.netWithLever.toFixed(0)} netIfTop5Churn=${a.netIfTop5Churn.toFixed(0)} delta=${(a.netWithLever-a.netIfTop5Churn).toFixed(0)} -> ${a.netWithLever>=a.netIfTop5Churn?'удержание выгоднее':'ПРОБЛЕМА'}`)
}
