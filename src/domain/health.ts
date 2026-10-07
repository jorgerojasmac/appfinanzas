/**
 * Indicadores de salud financiera pensados para ingresos irregulares: se
 * calculan sobre promedios móviles de meses completos (3 y 6), no solo sobre
 * el mes en curso.
 */
import type { Account, Budget, Category, RecurringRule, Transaction } from '../db/types'
import { budgetLimit, computeIncomeBase } from './budgets'
import { summarizeCard, totalUsage } from './cards'
import { addMonths, daysInMonth, monthKey, monthRange, monthsBetween, todayISO, type ISODate, type MonthKey } from './dates'
import { computeBalances, expenseByCategory, totalsByMonth } from './ledger'
import { formatMoney, type Cents } from './money'
import { monthlyEquivalent, upcoming } from './recurrence'

export type Status = 'good' | 'warn' | 'alert' | 'none'

export interface Indicator {
  id: IndicatorId
  title: string
  /** Valor principal ya formateado ("18%", "4.2 meses") */
  value: string | null
  /** Línea secundaria (promedios, montos) */
  detail?: string
  /** Qué significa, en lenguaje simple */
  explanation: string
  status: Status
  /** 0–100 si participa en el puntaje */
  score: number | null
  /** Mensaje amable cuando no hay datos suficientes */
  empty?: string
}

export type IndicatorId =
  | 'base'
  | 'stability'
  | 'savings'
  | 'budgets'
  | 'fixed'
  | 'emergency'
  | 'cards'
  | 'subscriptions'
  | 'trend'
  | 'projection'

/** Pesos del puntaje global (suman 100). Sin datos, el indicador se excluye y se reparten. */
export const WEIGHTS: Partial<Record<IndicatorId, number>> = {
  savings: 25,
  emergency: 20,
  fixed: 15,
  cards: 15,
  budgets: 10,
  stability: 10,
  subscriptions: 5,
}

export interface HealthInput {
  transactions: Transaction[]
  accounts: Account[]
  budgets: Budget[]
  categories: Category[]
  rules: RecurringRule[]
  manualBase: Cents | null
  today?: ISODate
}

export interface HealthReport {
  month: MonthKey
  indicators: Indicator[]
  score: number | null
  breakdown: Array<{ id: IndicatorId; title: string; weight: number; score: number; points: number }>
  recommendations: string[]
  /** Datos útiles para recomendaciones y pantallas */
  facts: {
    base: Cents | null
    avgIncome3: Cents | null
    avgExpense3: Cents | null
    avgExpense6: Cents | null
    monthsOfData: number
  }
}

/** Interpola linealmente: valor `bad` → 0 puntos, `good` → 100 puntos. */
export function scale(v: number, bad: number, good: number): number {
  const t = (v - bad) / (good - bad)
  return Math.round(Math.max(0, Math.min(1, t)) * 100)
}

const pct = (r: number) => `${Math.round(r * 100)}%`
const pct1 = (r: number) => `${Math.round(r * 1000) / 10}%`

/** Meses completos con datos, del más reciente hacia atrás (máximo n). */
function completeMonths(txs: Transaction[], month: MonthKey, n: number): MonthKey[] {
  let first: string | null = null
  for (const t of txs) if (!first || t.date < first) first = t.date
  if (!first) return []
  const firstMonth = Number(first.slice(8, 10)) > 7 ? addMonths(monthKey(first), 1) : monthKey(first)
  const last = addMonths(month, -1)
  const start = addMonths(month, -n)
  const from = firstMonth > start ? firstMonth : start
  if (from > last) return []
  return monthsBetween(from, last)
}

export function computeHealth(input: HealthInput): HealthReport {
  const today = input.today ?? todayISO()
  const month = monthKey(today)
  const { transactions: txs, accounts, budgets, categories, rules } = input

  const m3 = completeMonths(txs, month, 3)
  const m6 = completeMonths(txs, month, 6)
  const byMonth = totalsByMonth(txs, m6)
  const sum = (ms: MonthKey[], k: 'income' | 'expense') => ms.reduce((a, m) => a + (byMonth.get(m)?.[k] ?? 0), 0)
  const avg = (ms: MonthKey[], k: 'income' | 'expense') => (ms.length ? Math.round(sum(ms, k) / ms.length) : null)

  const computedBase = computeIncomeBase(txs, month)
  const base = input.manualBase ?? computedBase.value
  const avgIncome3 = avg(m3, 'income')
  const avgExpense3 = avg(m3, 'expense')
  const avgExpense6 = avg(m6, 'expense')

  const indicators: Indicator[] = []

  // 1. Ingreso base
  if (base == null) {
    indicators.push({
      id: 'base',
      title: 'Ingreso base',
      value: null,
      explanation: 'Un ingreso conservador: el promedio de tus 2 meses más bajos de los últimos 6.',
      status: 'none',
      score: null,
      empty: `Necesito ${computedBase.missing || 3} ${computedBase.missing === 1 ? 'mes completo' : 'meses completos'} más de datos para calcularlo. Mientras tanto puedes definirlo en Presupuestos.`,
    })
  } else {
    const ratio = avgExpense6 ? base / avgExpense6 : null
    indicators.push({
      id: 'base',
      title: 'Ingreso base',
      value: formatMoney(base),
      detail: input.manualBase != null ? 'Definido manualmente' : avgExpense6 ? `Gasto promedio: ${formatMoney(avgExpense6)}/mes` : undefined,
      explanation:
        ratio == null
          ? 'Lo que puedes esperar incluso en un mes flojo. Úsalo para planificar, no tu mejor mes.'
          : ratio >= 1
            ? 'Incluso en un mes flojo cubres tu gasto promedio. Planifica con este número, no con tu mejor mes.'
            : `En un mes flojo cubres el ${pct(ratio)} de tu gasto promedio. La diferencia tendría que salir de tus ahorros.`,
      status: ratio == null ? 'none' : ratio >= 1 ? 'good' : ratio >= 0.85 ? 'warn' : 'alert',
      score: null,
    })
  }

  // 2. Estabilidad de ingresos (coeficiente de variación)
  const incomes6 = m6.map((m) => byMonth.get(m)?.income ?? 0)
  if (incomes6.length < 3 || incomes6.every((v) => v === 0)) {
    indicators.push({
      id: 'stability',
      title: 'Estabilidad de ingresos',
      value: null,
      explanation: 'Qué tanto cambian tus ingresos de un mes a otro.',
      status: 'none',
      score: null,
      empty: 'Necesito al menos 3 meses completos de ingresos para medir cuánto varían.',
    })
  } else {
    const mean = incomes6.reduce((a, b) => a + b, 0) / incomes6.length
    const sd = Math.sqrt(incomes6.reduce((a, b) => a + (b - mean) ** 2, 0) / incomes6.length)
    const cv = mean ? sd / mean : 1
    indicators.push({
      id: 'stability',
      title: 'Estabilidad de ingresos',
      value: `±${pct(cv)}`,
      detail: `Variación promedio en ${incomes6.length} meses`,
      explanation:
        cv < 0.15
          ? 'Tus ingresos son bastante estables mes a mes.'
          : cv <= 0.35
            ? 'Tus ingresos varían bastante. Apóyate en el ingreso base y en el fondo colchón.'
            : 'Tus ingresos cambian mucho de un mes a otro. Un colchón amplio te protege de los meses flojos.',
      status: cv < 0.15 ? 'good' : cv <= 0.35 ? 'warn' : 'alert',
      score: scale(cv, 0.5, 0.1),
    })
  }

  // 3. Tasa de ahorro (promedio móvil)
  const inc3 = sum(m3, 'income')
  if (!m3.length || inc3 === 0) {
    indicators.push({
      id: 'savings',
      title: 'Tasa de ahorro',
      value: null,
      explanation: 'Qué parte de lo que ganas te queda después de gastar.',
      status: 'none',
      score: null,
      empty: m3.length ? 'Aún no hay ingresos registrados en los últimos meses completos.' : 'Cuando cierres tu primer mes completo calcularé cuánto ahorras.',
    })
  } else {
    const rate3 = (inc3 - sum(m3, 'expense')) / inc3
    const inc6 = sum(m6, 'income')
    const rate6 = inc6 ? (inc6 - sum(m6, 'expense')) / inc6 : null
    indicators.push({
      id: 'savings',
      title: 'Tasa de ahorro',
      value: pct(rate3),
      detail: `Promedio de ${m3.length} ${m3.length === 1 ? 'mes' : 'meses'}${rate6 != null && m6.length > m3.length ? ` · ${pct(rate6)} en ${m6.length} meses` : ''}`,
      explanation:
        rate3 >= 0.2
          ? 'Ahorras una buena parte de lo que ganas. Con ingresos variables, lo ideal es 20% o más.'
          : rate3 >= 0.1
            ? 'Ahorras algo, pero con ingresos variables conviene llegar al 20%.'
            : rate3 >= 0
              ? 'Casi todo lo que ganas se va en gastos. Tu margen para meses flojos es pequeño.'
              : 'Estás gastando más de lo que ganas en promedio.',
      status: rate3 >= 0.2 ? 'good' : rate3 >= 0.1 ? 'warn' : 'alert',
      score: scale(rate3, -0.05, 0.25),
    })
  }

  // 4. Cumplimiento de presupuestos (último mes completo)
  const lastMonth = addMonths(month, -1)
  const lastSpent = expenseByCategory(txs.filter((t) => monthKey(t.date) === lastMonth))
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const evaluable = budgets
    .map((b) => ({ b, limit: budgetLimit(b, base) }))
    .filter((x) => x.limit != null && x.limit > 0 && catMap.get(x.b.categoryId) && !catMap.get(x.b.categoryId)!.archived)
  if (!evaluable.length || !m3.includes(lastMonth)) {
    indicators.push({
      id: 'budgets',
      title: 'Cumplimiento de presupuestos',
      value: null,
      explanation: 'Qué porcentaje de tus categorías se mantuvo dentro del límite el mes pasado.',
      status: 'none',
      score: null,
      empty: evaluable.length ? 'Lo mediré cuando cierre tu primer mes completo con presupuestos.' : 'Define presupuestos por categoría en Planificación para medirlo.',
    })
  } else {
    const within = evaluable.filter((x) => (lastSpent.get(x.b.categoryId) ?? 0) <= x.limit!)
    const over = evaluable.filter((x) => (lastSpent.get(x.b.categoryId) ?? 0) > x.limit!)
    const ratio = within.length / evaluable.length
    indicators.push({
      id: 'budgets',
      title: 'Cumplimiento de presupuestos',
      value: pct(ratio),
      detail: `${within.length} de ${evaluable.length} categorías dentro del límite el mes pasado`,
      explanation: over.length
        ? `Te pasaste en ${over
            .slice(0, 3)
            .map((x) => catMap.get(x.b.categoryId)!.name)
            .join(', ')}.`
        : 'Todas tus categorías quedaron dentro del límite. ¡Bien!',
      status: ratio >= 0.8 ? 'good' : ratio >= 0.6 ? 'warn' : 'alert',
      score: Math.round(ratio * 100),
    })
  }

  // 5. Gastos fijos vs ingreso base
  const fixedIds = new Set(categories.filter((c) => c.fixed).map((c) => c.id))
  const fixed3 = m3.length
    ? Math.round(
        txs
          .filter((t) => t.type === 'expense' && t.categoryId && fixedIds.has(t.categoryId) && m3.includes(monthKey(t.date)))
          .reduce((a, t) => a + t.myAmount, 0) / m3.length,
      )
    : null
  if (base == null || !base || fixed3 == null) {
    indicators.push({
      id: 'fixed',
      title: 'Gastos fijos vs ingreso base',
      value: null,
      explanation: 'Qué parte de tu ingreso conservador se va en gastos que no puedes recortar fácil.',
      status: 'none',
      score: null,
      empty: 'Necesito tu ingreso base y al menos un mes completo de gastos para calcularlo.',
    })
  } else {
    const r = fixed3 / base
    indicators.push({
      id: 'fixed',
      title: 'Gastos fijos vs ingreso base',
      value: pct(r),
      detail: `${formatMoney(fixed3)}/mes en gastos fijos`,
      explanation:
        r <= 0.5
          ? 'Tus gastos fijos dejan espacio de sobra, incluso en un mes flojo.'
          : r <= 0.7
            ? 'Tus gastos fijos pesan bastante: en un mes flojo te queda poco margen.'
            : 'Tus gastos fijos se comen casi todo tu ingreso base. Un mes flojo te deja sin margen.',
      status: r <= 0.5 ? 'good' : r <= 0.7 ? 'warn' : 'alert',
      score: scale(r, 0.9, 0.4),
    })
  }

  // 6. Fondo de emergencia
  const balances = computeBalances(accounts, txs, today)
  const savingsAccts = accounts.filter((a) => !a.archived && a.type === 'savings')
  const emergencyAccts = savingsAccts.filter((a) => a.savingsPurpose === 'emergency')
  const fundAccts = emergencyAccts.length ? emergencyAccts : savingsAccts
  const fund = fundAccts.reduce((a, acc) => a + Math.max(0, balances.get(acc.id) ?? 0), 0)
  if (!fundAccts.length || !avgExpense6) {
    indicators.push({
      id: 'emergency',
      title: 'Fondo de emergencia',
      value: null,
      explanation: 'Cuántos meses de gastos podrías cubrir con tus ahorros si dejaras de recibir ingresos.',
      status: 'none',
      score: null,
      empty: !fundAccts.length
        ? 'Crea una cuenta de ahorro con propósito "Fondo de emergencia" en Ajustes → Cuentas.'
        : 'Necesito al menos un mes completo de gastos para calcularlo.',
    })
  } else {
    const months = fund / avgExpense6
    indicators.push({
      id: 'emergency',
      title: 'Fondo de emergencia',
      value: `${Math.round(months * 10) / 10} meses`,
      detail: `${formatMoney(fund)} ${emergencyAccts.length ? 'en fondo de emergencia' : 'en ahorros'}`,
      explanation:
        months >= 6
          ? 'Tienes un buen respaldo. Con ingresos variables, 6 meses es la meta recomendada.'
          : months >= 3
            ? 'Vas bien. Con ingresos variables conviene llegar a 6 meses de gastos.'
            : 'Tu respaldo es corto: un par de meses flojos lo agotarían.',
      status: months >= 6 ? 'good' : months >= 3 ? 'warn' : 'alert',
      score: scale(months, 0, 6),
    })
  }

  // 7. Uso del cupo de tarjetas
  const cards = accounts.filter((a) => !a.archived && a.type === 'credit')
  const usage = totalUsage(cards.map((c) => summarizeCard(c, txs, today)))
  if (usage == null) {
    indicators.push({
      id: 'cards',
      title: 'Uso del cupo de tarjetas',
      value: null,
      explanation: 'Qué parte del cupo total de tus tarjetas estás usando.',
      status: 'none',
      score: null,
      empty: cards.length ? 'Agrega el cupo de tus tarjetas para medirlo.' : 'No tienes tarjetas de crédito registradas.',
    })
  } else {
    indicators.push({
      id: 'cards',
      title: 'Uso del cupo de tarjetas',
      value: pct(usage),
      detail: 'Ideal: menos del 30%',
      explanation:
        usage <= 0.3
          ? 'Usas poco de tu cupo. Así no dependes de la tarjeta en un mes flojo.'
          : usage <= 0.5
            ? 'Estás usando bastante cupo. Bajar del 30% te da más margen.'
            : 'Usas más de la mitad de tu cupo: la deuda puede crecer rápido con intereses.',
      status: usage <= 0.3 ? 'good' : usage <= 0.5 ? 'warn' : 'alert',
      score: scale(usage, 0.8, 0.1),
    })
  }

  // 8. Peso de suscripciones
  const subs = rules.filter((r) => r.kind === 'subscription' && r.active)
  const subMonthly = subs.reduce((a, s) => a + monthlyEquivalent(s.amount, s.frequency, s.interval), 0)
  if (!subs.length || !base) {
    indicators.push({
      id: 'subscriptions',
      title: 'Peso de suscripciones',
      value: null,
      explanation: 'Qué parte de tu ingreso base se va en suscripciones.',
      status: 'none',
      score: null,
      empty: subs.length ? 'Necesito tu ingreso base para calcularlo.' : 'Agrega tus suscripciones en Planificación para medirlo.',
    })
  } else {
    const r = subMonthly / base
    indicators.push({
      id: 'subscriptions',
      title: 'Peso de suscripciones',
      value: pct1(r),
      detail: `${formatMoney(subMonthly)}/mes en ${subs.length} suscripciones`,
      explanation:
        r <= 0.05
          ? 'Tus suscripciones pesan poco en tu presupuesto.'
          : r <= 0.1
            ? 'Tus suscripciones empiezan a pesar. Revisa cuáles usas de verdad.'
            : 'Las suscripciones se llevan una parte importante de tu ingreso base.',
      status: r <= 0.05 ? 'good' : r <= 0.1 ? 'warn' : 'alert',
      score: scale(r, 0.15, 0.03),
    })
  }

  // 9 y 10. Proyección del mes y tendencia
  const projection = projectMonth(txs, rules, today, categories)
  const day = Number(today.slice(8, 10))
  indicators.push({
    id: 'projection',
    title: 'Proyección del mes',
    value: projection.spent > 0 ? formatMoney(projection.projected) : null,
    detail: projection.spent > 0 ? `Llevas ${formatMoney(projection.spent)} · ${formatMoney(projection.dailyAvg)}/día en gastos variables` : undefined,
    explanation:
      base && projection.spent > 0
        ? projection.projected <= base * 0.9
          ? `Al ritmo actual cerrarías el mes con holgura bajo tu ingreso base (${formatMoney(base)}).`
          : projection.projected <= base
            ? `Al ritmo actual cerrarías el mes muy cerca de tu ingreso base (${formatMoney(base)}): poco margen si este mes es flojo.`
            : `Al ritmo actual cerrarías el mes por encima de tu ingreso base (${formatMoney(base)}).`
        : 'Gasto estimado al cierre del mes, contando los recurrentes que faltan.',
    status:
      projection.spent === 0 || !base ? 'none' : projection.projected <= base * 0.9 ? 'good' : projection.projected <= base ? 'warn' : 'alert',
    score: null,
    empty: projection.spent === 0 ? 'Aún no hay gastos este mes.' : undefined,
  })

  if (!avgExpense3 || day < 5) {
    indicators.push({
      id: 'trend',
      title: 'Tendencia del gasto',
      value: null,
      explanation: 'Si este mes vas gastando más o menos que tu promedio de los últimos 3 meses.',
      status: 'none',
      score: null,
      empty: !avgExpense3 ? 'Necesito al menos un mes completo de gastos para comparar.' : 'Aún es pronto en el mes para comparar; vuelve después del día 5.',
    })
  } else {
    const diff = projection.projected / avgExpense3 - 1
    indicators.push({
      id: 'trend',
      title: 'Tendencia del gasto',
      value: `${diff >= 0 ? '+' : ''}${pct(diff)}`,
      detail: `Promedio: ${formatMoney(avgExpense3)}/mes`,
      explanation:
        diff <= 0.05
          ? diff < -0.05
            ? 'Este mes vas gastando menos que tu promedio. ¡Bien!'
            : 'Este mes vas en línea con tu promedio.'
          : `Este mes vas camino a gastar ${pct(diff)} más que tu promedio.`,
      status: diff <= 0.05 ? 'good' : diff <= 0.2 ? 'warn' : 'alert',
      score: null,
    })
  }

  // Puntaje global
  const breakdown: HealthReport['breakdown'] = []
  for (const ind of indicators) {
    const w = WEIGHTS[ind.id]
    if (w && ind.score != null) breakdown.push({ id: ind.id, title: ind.title, weight: w, score: ind.score, points: 0 })
  }
  const totalW = breakdown.reduce((a, b) => a + b.weight, 0)
  let score: number | null = null
  if (breakdown.length >= 2 && totalW > 0) {
    for (const b of breakdown) b.points = Math.round(((b.score * b.weight) / totalW) * 10) / 10
    score = Math.round(breakdown.reduce((a, b) => a + (b.score * b.weight) / totalW, 0))
  }

  const facts = { base, avgIncome3, avgExpense3, avgExpense6, monthsOfData: m6.length }
  return {
    month,
    indicators,
    score,
    breakdown,
    recommendations: recommend(indicators, breakdown, { ...facts, fund, subMonthly, subs, fixed3, usage, cards: cards.length, txs, categories, accounts, today }),
    facts,
  }
}

export interface Projection {
  spent: Cents
  projected: Cents
  dailyAvg: Cents
  pendingRecurring: Cents
}

/**
 * Proyección del gasto al cierre del mes: los gastos fijos y recurrentes ya
 * pagados se cuentan una vez; los variables se extrapolan por día; y se suman
 * los recurrentes y suscripciones que aún faltan este mes.
 */
export function projectMonth(txs: Transaction[], rules: RecurringRule[], today: ISODate, categories: Category[]): Projection {
  const month = monthKey(today)
  const { end } = monthRange(month)
  const day = Number(today.slice(8, 10))
  const days = daysInMonth(month)
  const fixedIds = new Set(categories.filter((c) => c.fixed).map((c) => c.id))
  let fixedOrRecurring = 0
  let variable = 0
  for (const t of txs) {
    if (t.type !== 'expense' || monthKey(t.date) !== month || t.date > today) continue
    if (t.recurringId || (t.categoryId && fixedIds.has(t.categoryId))) fixedOrRecurring += t.myAmount
    else variable += t.myAmount
  }
  let pendingRecurring = 0
  for (const r of rules) {
    if (!r.active || r.type !== 'expense') continue
    for (const d of upcoming(r, 6)) if (d > today && d <= end) pendingRecurring += r.amount
  }
  const dailyAvg = Math.round(variable / Math.max(day, 1))
  const projected = fixedOrRecurring + Math.round((variable / Math.max(day, 1)) * days) + pendingRecurring
  return { spent: fixedOrRecurring + variable, projected, dailyAvg, pendingRecurring }
}

interface RecFacts {
  base: Cents | null
  avgIncome3: Cents | null
  avgExpense3: Cents | null
  avgExpense6: Cents | null
  fund: Cents
  subMonthly: Cents
  subs: RecurringRule[]
  fixed3: Cents | null
  usage: number | null
  cards: number
  txs: Transaction[]
  categories: Category[]
  accounts: Account[]
  today: ISODate
}

/** Una o dos recomendaciones concretas sobre los indicadores más débiles. */
function recommend(indicators: Indicator[], breakdown: HealthReport['breakdown'], f: RecFacts): string[] {
  const weak = [...breakdown]
    .filter((b) => b.score < 75)
    .sort((a, b) => (100 - b.score) * b.weight - (100 - a.score) * a.weight)
    .slice(0, 2)
  const out: string[] = []
  for (const w of weak) {
    const text = recommendationFor(w.id, f)
    if (text) out.push(text)
  }
  if (!out.length) {
    if (breakdown.length >= 2) out.push('Vas muy bien. Mantén el hábito: en los meses buenos, aparta el excedente al fondo colchón antes de gastarlo.')
    else if (!indicators.find((i) => i.id === 'base')?.value)
      out.push('Registra tus ingresos y gastos durante 3 meses para tener tu ingreso base y un puntaje completo.')
  }
  return out
}

function recommendationFor(id: IndicatorId, f: RecFacts): string | null {
  switch (id) {
    case 'savings': {
      if (!f.avgIncome3 || f.avgExpense3 == null) return null
      const target = Math.round(f.avgIncome3 * 0.8)
      const cut = f.avgExpense3 - target
      // Categoría variable con más gasto promedio
      const top = topVariableCategory(f)
      return cut > 0
        ? `Para ahorrar el 20% de tu ingreso promedio (${formatMoney(f.avgIncome3)}), necesitas gastar ${formatMoney(cut)} menos al mes.${top ? ` Tu mayor gasto variable es ${top.name} (${formatMoney(top.avg)}/mes): empieza por ahí.` : ''}`
        : null
    }
    case 'emergency': {
      if (!f.avgExpense6) return null
      const missing = f.avgExpense6 * 6 - f.fund
      if (missing <= 0) return null
      return `Te faltan ${formatMoney(missing)} para cubrir 6 meses de gastos. Apartar ${formatMoney(Math.ceil(missing / 12 / 100) * 100)} al mes te lleva ahí en un año; en meses buenos, aporta más.`
    }
    case 'fixed': {
      if (!f.base || f.fixed3 == null) return null
      const topFixed = topCategory(f, true)
      return `Tus gastos fijos son ${formatMoney(f.fixed3)} al mes, el ${Math.round((f.fixed3 / f.base) * 100)}% de tu ingreso base.${topFixed ? ` El más grande es ${topFixed.name} (${formatMoney(topFixed.avg)}/mes); renegociarlo o reducirlo libera margen para los meses flojos.` : ''}`
    }
    case 'cards': {
      if (f.usage == null) return null
      const cards = f.accounts.filter((a) => a.type === 'credit' && !a.archived && a.creditLimit)
      const limit = cards.reduce((a, c) => a + (c.creditLimit ?? 0), 0)
      const debt = Math.round(f.usage * limit)
      const pay = debt - Math.round(limit * 0.3)
      return pay > 0 ? `Paga ${formatMoney(pay)} de tus tarjetas para bajar del 30% de uso del cupo, y evita usarlas para gastos que no puedas pagar al corte.` : null
    }
    case 'budgets':
      return 'Revisa las categorías donde te pasaste el mes pasado: ajusta el límite si era poco realista o pon una alerta mental a mitad de mes.'
    case 'stability':
      return 'Como tus ingresos varían de un mes a otro, planifica tus gastos con el ingreso base y, en los meses buenos, aparta el excedente al fondo colchón.'
    case 'subscriptions': {
      const review = f.subs.filter((s) => s.review)
      return review.length
        ? `Tienes ${review.length} suscripción(es) en revisión. Cancelarlas te ahorraría ${formatMoney(review.reduce((a, s) => a + monthlyEquivalent(s.amount, s.frequency, s.interval), 0) * 12)} al año.`
        : `Pagas ${formatMoney(f.subMonthly)} al mes en suscripciones. Marca en revisión las que uses poco y decide si cancelarlas.`
    }
    default:
      return null
  }
}

function topCategory(f: RecFacts, fixed: boolean): { name: string; avg: Cents } | null {
  const month = monthKey(f.today)
  const from = addMonths(month, -3)
  const to = addMonths(month, -1)
  const sums = new Map<string, Cents>()
  const cats = new Map(f.categories.map((c) => [c.id, c]))
  for (const t of f.txs) {
    if (t.type !== 'expense' || !t.categoryId) continue
    const m = monthKey(t.date)
    if (m < from || m > to) continue
    const c = cats.get(t.categoryId)
    if (!c || c.fixed !== fixed) continue
    sums.set(c.id, (sums.get(c.id) ?? 0) + t.myAmount)
  }
  let best: { name: string; avg: Cents } | null = null
  for (const [id, v] of sums) {
    const a = Math.round(v / 3)
    if (!best || a > best.avg) best = { name: cats.get(id)!.name, avg: a }
  }
  return best
}

const topVariableCategory = (f: RecFacts) => topCategory(f, false)

export const STATUS_LABEL: Record<Status, string> = {
  good: 'Bien',
  warn: 'Atención',
  alert: 'Alerta',
  none: 'Sin datos',
}

/** Etiqueta para el puntaje global */
export function scoreLabel(score: number): { label: string; status: Status } {
  if (score >= 75) return { label: 'Saludable', status: 'good' }
  if (score >= 50) return { label: 'Puede mejorar', status: 'warn' }
  return { label: 'Necesita atención', status: 'alert' }
}

/** Puntaje tal como quedó al cerrar un mes (se evalúa el primer día del mes siguiente). */
export function healthAfterMonth(input: HealthInput, month: MonthKey): HealthReport {
  return computeHealth({ ...input, today: `${addMonths(month, 1)}-01` })
}
