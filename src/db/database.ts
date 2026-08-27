import Dexie, { type Table } from 'dexie'
import type { FoodLog, Targets } from '../types'

class GetFatDB extends Dexie {
  foodLogs!: Table<FoodLog, number>
  targets!: Table<Targets, number>
  settings!: Table<{ key: string; value: string }, string>

  constructor() {
    super('GetFatDB')
    this.version(1).stores({
      foodLogs: '++id, date, mealSlot, createdAt',
      targets: '++id, effectiveFrom',
      settings: 'key',
    })
  }
}

export const db = new GetFatDB()

export async function getSetting(key: string): Promise<string | undefined> {
  const entry = await db.settings.get(key)
  return entry?.value
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value })
}

export async function getActiveTargets(): Promise<Targets | undefined> {
  const today = new Date().toISOString().split('T')[0]
  return db.targets.where('effectiveFrom').belowOrEqual(today).reverse().first()
}

export async function getTodayLogs(): Promise<FoodLog[]> {
  const today = new Date().toISOString().split('T')[0]
  return db.foodLogs.where('date').equals(today).toArray()
}

export async function getLogsForDateRange(
  start: string,
  end: string,
): Promise<FoodLog[]> {
  return db.foodLogs.where('date').between(start, end, true, true).toArray()
}

export async function getAllLogs(): Promise<FoodLog[]> {
  return db.foodLogs.orderBy('date').reverse().toArray()
}

export interface FrequentItem {
  description: string
  items: FoodLog['items']
  totalCalories: number
  totalProtein: number
  count: number
  mealSlot: FoodLog['mealSlot']
}

export async function getFrequentItems(): Promise<FrequentItem[]> {
  const logs = await db.foodLogs.toArray()
  const counts = new Map<string, FrequentItem>()
  for (const log of logs) {
    const key = log.description.toLowerCase().trim()
    if (!key || key.startsWith('📋') || key.startsWith('📸')) {
      const itemKey = log.items.map((i) => i.name.toLowerCase()).sort().join('|')
      if (!itemKey) continue
      const existing = counts.get(itemKey)
      if (existing) {
        existing.count++
      } else {
        counts.set(itemKey, {
          description: log.description,
          items: log.items,
          totalCalories: log.totalCalories,
          totalProtein: log.totalProtein,
          count: 1,
          mealSlot: log.mealSlot,
        })
      }
      continue
    }
    const existing = counts.get(key)
    if (existing) {
      existing.count++
    } else {
      counts.set(key, {
        description: log.description,
        items: log.items,
        totalCalories: log.totalCalories,
        totalProtein: log.totalProtein,
        count: 1,
        mealSlot: log.mealSlot,
      })
    }
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count)
}
