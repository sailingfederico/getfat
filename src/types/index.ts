export interface FoodItem {
  name: string
  quantity: number
  unit: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  edited?: boolean
}

export interface FoodLog {
  id?: number
  date: string
  mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  description: string
  items: FoodItem[]
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  totalFiber: number
  approved: boolean
  createdAt: string
}

export interface Targets {
  id?: number
  calories: number
  protein: number
  carbs: number
  fat: number
  effectiveFrom: string
}

export interface MicronutrientEntry {
  name: string
  avgDaily: number
  recommended: number
  unit: string
  status: 'good' | 'low' | 'high'
}

export type Page =
  | 'dashboard'
  | 'add-food'
  | 'review'
  | 'targets'
  | 'history'
  | 'day-detail'
  | 'weekly-report'
  | 'settings'

export type InputMode = 'ingredient' | 'recipe' | 'meal'
