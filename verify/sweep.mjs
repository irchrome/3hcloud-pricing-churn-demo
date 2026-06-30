import { readFileSync } from 'fs'
import { runScenario } from '../src/model.js'
const d = JSON.parse(readFileSync(new URL('../public/data/accounts.json', import.meta.url)))
const accts = d.accounts
function tryit(mAll, prem, thr, disc){
  const mult={'Shared':1.0,'CPU Optimized':mAll,'General Purpose':mAll,'Memory Optimized':mAll,'Dedicated (Private)':mAll}
  const base={multipliers:mult,dedicatedPremium:prem,threshold:thr}
  const off=runScenario(accts,{...base,discountOn:false,discountPct:disc})
  const on =runScenario(accts,{...base,discountOn:true, discountPct:disc})
  // retained top5 difference per currency
  let totDelta=0
  for(const cur of ['RUB','USD','KZT']){
    const a=on.netComparison[cur]; if(!a) continue
    totDelta += (a.netWithLever-a.netIfTop5Churn)>0?1:0
  }
  return {thr,mAll,prem,disc,hrOff:off.highRiskCount,hrOn:on.highRiskCount,retainedDelta:off.highRiskCount-on.highRiskCount}
}
for(const m of [1.10,1.20,1.25,1.30]){
  for(const thr of [0.55,0.58,0.60,0.62]){
    const r=tryit(m,0.10,thr,0.15)
    if(r.retainedDelta>0) console.log(`mAll=${m} prem=10% thr=${thr}: highRisk ${r.hrOff}->${r.hrOn} (скидка удержала ${r.retainedDelta})`)
  }
}
