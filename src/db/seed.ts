import type { Account, Category, ColorName } from './types'

type Def = [name: string, icon: string, color: ColorName, fixed: boolean]

const EXPENSES: Def[] = [
  ['Alimentación', 'ShoppingCart', 'green', false],
  ['Restaurantes', 'UtensilsCrossed', 'orange', false],
  ['Transporte', 'Car', 'blue', false],
  ['Vivienda', 'House', 'brown', true],
  ['Servicios', 'Zap', 'yellow', true],
  ['Salud', 'HeartPulse', 'red', false],
  ['Educación', 'GraduationCap', 'indigo', true],
  ['Entretenimiento', 'Clapperboard', 'purple', false],
  ['Suscripciones', 'Repeat', 'pink', true],
  ['Compras', 'ShoppingBag', 'teal', false],
  ['Cuidado personal', 'Sparkles', 'mint', false],
  ['Regalos', 'Gift', 'red', false],
  ['Viajes', 'Plane', 'cyan', false],
  ['Comisiones e intereses', 'Percent', 'gray', false],
  ['Otros gastos', 'Ellipsis', 'gray', false],
]

const INCOMES: Def[] = [
  ['Ingresos por trabajo', 'Briefcase', 'green', false],
  ['Ingresos extra', 'Coins', 'mint', false],
  ['Reembolsos', 'Undo2', 'teal', false],
  ['Otros ingresos', 'PiggyBank', 'gray', false],
]

/** IDs estables para poder referenciarlos (datos de ejemplo, migraciones). */
export const slug = (name: string) =>
  'cat-' +
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')

export function defaultCategories(): Category[] {
  const build = (defs: Def[], kind: Category['kind']) =>
    defs.map(([name, icon, color, fixed], i) => ({
      id: slug(name),
      name,
      icon,
      color,
      kind,
      fixed,
      order: i,
      archived: false,
    }))
  return [...build(EXPENSES, 'expense'), ...build(INCOMES, 'income')]
}

export function defaultAccounts(): Account[] {
  const now = Date.now()
  return [
    {
      id: 'acc-efectivo',
      name: 'Efectivo',
      type: 'cash',
      openingBalance: 0,
      icon: 'Banknote',
      color: 'green',
      order: 0,
      archived: false,
      createdAt: now,
    },
    {
      id: 'acc-banco',
      name: 'Banco',
      type: 'bank',
      openingBalance: 0,
      icon: 'Landmark',
      color: 'blue',
      order: 1,
      archived: false,
      createdAt: now,
    },
  ]
}
