import json
d=json.load(open('data/accounts.json'))
accts=d['accounts']
TM={"Shared":1.0,"CPU Optimized":1.15,"General Purpose":1.10,"Memory Optimized":1.08,"Dedicated (Private)":1.12,"Dedicated":1.12}
PREMIUM=0.0  # toggle off default
THR=0.60
def clamp(x,a,b): return max(a,min(b,x))
def newprice(vm):
    t=vm['tier']; m=TM.get(t,1.0)
    prem=(1+PREMIUM) if t!="Shared" else 1.0
    return vm['price_month']*m*prem
rows=[]
tiers=set()
for a in accts:
    tiers.update(vm['tier'] for vm in a['vms'])
    old=sum(vm['price_month'] for vm in a['vms'])
    new=sum(newprice(vm) for vm in a['vms'])
    inc=(new-old)/old if old>0 else 0
    price_impact=clamp(inc/0.50,0,1)
    loyalty=0.5*(a['tenure_months']/48)+0.5*((a['payment_discipline']-0.4)/0.6)
    growth=(a['growth_trend']+0.6)/1.5
    size_p=a['size_decile']/10
    risk=0.35*price_impact+0.25*(1-loyalty)+0.20*(1-growth)+0.20*size_p
    rows.append((a['account_no'],a['currency'],old,new,inc,risk))
print("distinct tiers in data:",sorted(tiers))
print("n accounts:",len(rows))
print("risk min/max/mean: %.4f %.4f %.4f"%(min(r[5] for r in rows),max(r[5] for r in rows),sum(r[5] for r in rows)/len(rows)))
high=[r for r in rows if r[5]>THR]
print("high risk (>%.2f): %d (%.1f%%)"%(THR,len(high),100*len(high)/len(rows)))
# per currency economics: retained = risk<=THR
for cur in ['RUB','USD','KZT']:
    cr=[r for r in rows if r[1]==cur]
    oldM=sum(r[2] for r in cr)
    ret=[r for r in cr if r[5]<=THR]
    newM=sum(r[3] for r in ret)
    churnC=100*(len(cr)-len(ret))/len(cr)
    churnM=100*(oldM-sum(r[2] for r in ret))/oldM
    arpu_old=oldM/len(cr); arpu_new=newM/len(ret) if ret else 0
    print(f"{cur}: n={len(cr)} oldMRR={oldM:.2f} newMRR(ret)={newM:.2f} churnC={churnC:.1f}% churnMRR={churnM:.1f}% ARPU {arpu_old:.2f}->{arpu_new:.2f}")
# sample 3 accounts full precision for JS parity test
print("PARITY SAMPLES (account_no, risk to 6dp):")
for r in rows[:3]:
    print(f"  {r[0]} {r[5]:.6f} old={r[2]:.4f} new={r[3]:.4f}")
