import {
  Baby, Banknote, Beer, Bike, BookOpen, Briefcase, Building2, Bus, Cake, Car, Cat, Clapperboard,
  Coffee, Coins, CreditCard, Dog, Droplets, Dumbbell, Ellipsis, Flame, Fuel, Gamepad2, Gift, Globe,
  GraduationCap, Hammer, HandCoins, Heart, HeartPulse, House, Landmark, Laptop, Leaf, Lightbulb,
  Music, Package, Palette, PawPrint, Percent, Phone, PiggyBank, Pill, Pizza, Plane, Receipt, Repeat,
  Scissors, Shield, Shirt, ShoppingBag, ShoppingCart, Smartphone, Sofa, Sparkles, Star, Stethoscope,
  Store, Target, Ticket, Train, TrendingUp, Tv, Umbrella, Undo2, User, Users, UtensilsCrossed,
  Vault, Wallet, Wifi, Wine, Wrench, Zap, ArrowLeftRight, type LucideIcon,
} from 'lucide-react'

/**
 * Iconos disponibles para categorías y cuentas. Se guardan por nombre
 * en la base de datos; importar solo estos mantiene la app liviana.
 */
export const ICONS: Record<string, LucideIcon> = {
  ShoppingCart, UtensilsCrossed, Coffee, Pizza, Beer, Wine, Cake, Car, Fuel, Bus, Train, Bike, Plane,
  House, Sofa, Building2, Zap, Droplets, Flame, Wifi, Phone, Smartphone, Lightbulb, HeartPulse, Pill,
  Stethoscope, Dumbbell, GraduationCap, BookOpen, Laptop, Clapperboard, Tv, Music, Gamepad2, Ticket,
  Palette, Repeat, ShoppingBag, Shirt, Package, Store, Sparkles, Scissors, Gift, Heart, Baby, PawPrint,
  Cat, Dog, Leaf, Hammer, Wrench, Umbrella, Shield, Globe, Percent, Receipt, Ellipsis, Briefcase,
  Coins, HandCoins, Banknote, PiggyBank, TrendingUp, Undo2, Star, Target, User, Users, Landmark,
  CreditCard, Wallet, Vault,
}

export const ICON_NAMES = Object.keys(ICONS)

/** Iconos internos (transferencias, gastos compartidos) que no aparecen en el selector. */
const SYSTEM_ICONS: Record<string, LucideIcon> = { ArrowLeftRight, Users, CreditCard }

export function getIcon(name: string | undefined): LucideIcon {
  return (name && (ICONS[name] ?? SYSTEM_ICONS[name])) || Ellipsis
}
