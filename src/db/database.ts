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
