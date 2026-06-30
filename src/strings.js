// i18n строки прототипа. Дефолтный язык — EN (см. App: useState('en')).
// Значения-функции принимают параметры. Доступ: t(lang).key  или  t(lang).fn(args).

export const STRINGS = {
  en: {
    subtitle: "3HCloud · internal Product Owner tool · play out a pricing grid before announcing it to customers",
    badge: "⚠ Synthetic data · illustrative reconstruction of a real 3HCloud case",
    langBtn: "RU",

    gridTitle: "New pricing grid",
    premiumToggle: "Dedicated-core premium (non-Shared)",
    premiumLabel: "premium",
    simTitle: "Churn simulator",
    threshold: "Risk threshold",
    discountToggle: "Targeted discount for top-5% risk",
    discountLabel: "discount",
    reset: "↺ reset to case defaults",

    mrr: "MRR",
    arpu: "ARPU",
    was: "was",
    churnClients: "Churn (clients)",
    churnMRR: "Churn (by MRR)",
    ofAccounts: (a, b) => `${a} of ${b} accounts`,
    revenueLost: (cur) => `revenue lost in ${cur}`,

    leverTitle: (cur) => `Targeted-discount effect (top-5% risk, ${cur})`,
    netWith: "Net-MRR with retention via discount:",
    netIf: "Net-MRR if top-5% churned:",
    diff: "Difference:",
    leverOn: " — retention is cheaper than the loss (and cheaper than mass grandfathering; doesn't dilute uplift on the other 95%).",
    leverOff: " — turn on the discount on the left to apply the lever.",
    illustration: "illustrative, on synthetic data",

    chart1: (cur) => `MRR before/after by tier · ${cur}`,
    old: "before",
    neu: "after",
    chart2: "Churn rate by cohort (size decile) · all currencies",
    churnPct: "churn %",

    tableTitle: "Top-at-risk accounts (top-5% highlighted) · click → migration calculator",
    colPayer: "payer (synthetic)",
    colProvider: "provider",
    colMRR: "MRR",
    colBillDelta: "%Δ bill",
    colRisk: "churn_risk",
    top5Note: (t5, hr, thr) => `top-5% by risk: ${t5} accounts · above threshold ${thr}: ${hr}`,

    migTitle: (cur) => `Per-account migration calculator · ${cur}`,
    migPick: (n, cur) => `— pick an account (${n} in ${cur}) —`,
    colFlavor: "flavor",
    colTier: "tier",
    colOld: "before",
    colNew: "after",
    colDelta: "%Δ",
    totalRow: "TOTAL for account",
    vmShort: "VMs",

    loading: "Loading synthetic data…",
    loadError: "Data load error: ",

    foot: "Data is synthetic, modeled on the real 3HCloud price/flavor distribution — no real payer / accounts / UUIDs. Churn-model weights",
    footWeights: "Price Impact 35 · Loyalty 25 · Growth 20 · Size 20",
    footFact: "— real, from the case (fact). Defensible production results: +30% MRR, +55% ARPU, NDR 60→110% (fact). Numbers from the simulator on this page are",
    footIllu: "illustrative",
    footEnd: ", not output of a production model.",
  },
  ru: {
    subtitle: "3HCloud · внутренний инструмент Product Owner'а · проиграй тарифную сетку до объявления клиентам",
    badge: "⚠ Synthetic data · illustrative reconstruction of a real 3HCloud case",
    langBtn: "EN",

    gridTitle: "Новая тарифная сетка",
    premiumToggle: "Премия за выделенные ядра (не-Shared)",
    premiumLabel: "надбавка",
    simTitle: "Симулятор оттока",
    threshold: "Порог риска",
    discountToggle: "Точечная скидка для top-5% риска",
    discountLabel: "скидка",
    reset: "↺ сбросить к дефолтам кейса",

    mrr: "MRR",
    arpu: "ARPU",
    was: "было",
    churnClients: "Churn (клиенты)",
    churnMRR: "Churn (по MRR)",
    ofAccounts: (a, b) => `${a} из ${b} аккаунтов`,
    revenueLost: (cur) => `потеря выручки в ${cur}`,

    leverTitle: (cur) => `Эффект точечной скидки (top-5% риска, ${cur})`,
    netWith: "Net-MRR с удержанием через скидку:",
    netIf: "Net-MRR, если бы top-5% ушли:",
    diff: "Разница:",
    leverOn: " — удержание дешевле потери (и дешевле массового grandfathering, не размывает uplift на 95%).",
    leverOff: " — включи скидку слева, чтобы применить рычаг.",
    illustration: "иллюстрация на синтетике",

    chart1: (cur) => `MRR before/after по тирам · ${cur}`,
    old: "старая",
    neu: "новая",
    chart2: "Доля оттока по когортам (size decile) · все валюты",
    churnPct: "отток %",

    tableTitle: "Top-at-risk аккаунты (top-5% подсвечены) · клик → калькулятор миграции",
    colPayer: "payer (synthetic)",
    colProvider: "provider",
    colMRR: "MRR",
    colBillDelta: "%Δ счёта",
    colRisk: "churn_risk",
    top5Note: (t5, hr, thr) => `top-5% по риску: ${t5} аккаунтов · выше порога ${thr}: ${hr}`,

    migTitle: (cur) => `Калькулятор миграции по аккаунту · ${cur}`,
    migPick: (n, cur) => `— выбери аккаунт (${n} в ${cur}) —`,
    colFlavor: "flavor",
    colTier: "тир",
    colOld: "старая",
    colNew: "новая",
    colDelta: "%Δ",
    totalRow: "ИТОГО по счёту",
    vmShort: "ВМ",

    loading: "Загрузка синтетических данных…",
    loadError: "Ошибка загрузки данных: ",

    foot: "Данные синтетические, смоделированы по реальному распределению цен/flavor'ов 3HCloud — без реальных payer / счетов / UUID. Веса модели оттока",
    footWeights: "Price Impact 35 · Loyalty 25 · Growth 20 · Size 20",
    footFact: "— реальные из кейса (факт). Защищаемые результаты прода: +30% MRR, +55% ARPU, NDR 60→110% (факт). Числа симулятора на этой странице —",
    footIllu: "иллюстрация",
    footEnd: ", не вывод продакшен-модели.",
  },
}

export const t = (lang) => STRINGS[lang] || STRINGS.en
export const numLocale = (lang) => (lang === 'ru' ? 'ru-RU' : 'en-US')
