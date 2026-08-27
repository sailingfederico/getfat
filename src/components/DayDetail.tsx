import { useState, useEffect } from 'react'
import { db, getActiveTargets, setSetting } from '../db/database'
import type { FoodLog, Targets } from '../types'
import MacroDisplay from './MacroDisplay'

interface Props {
  date: string
  onBack: () => void
}

export default function DayDetail({ date, onBack }: Props) {
  const [logs, setLogs] = useState<FoodLog[]>([])
  const [targets, setTargets] = useState<Targets | null>(null)

  useEffect(() => {
    Promise.all([
      db.foodLogs.where('date').equals(date).toArray(),
      getActiveTargets(),
    ]).then(([l, t]) => {
      setLogs(l)
      setTargets(t ?? null)
    })
  }, [date])

  const totals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.totalCalories,
      protein: acc.protein + log.totalProtein,
      carbs: acc.carbs + log.totalCarbs,
      fat: acc.fat + log.totalFat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  const deleteLog = async (id: number) => {
    await db.foodLogs.delete(id)
    setLogs((prev) => prev.filter((l) => l.id !== id))
    await db.settings.delete('weekly_report_cache')
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-emerald-500 text-sm font-medium">
          ← Back
        </button>
        <h1 className="text-lg font-bold">{formatDate(date)}</h1>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
        <MacroDisplay label="Calories" current={totals.calories} target={targets?.calories ?? 0} unit="kcal" color="emerald" />
        <MacroDisplay label="Protein" current={totals.protein} target={targets?.protein ?? 0} unit="g" color="blue" />
        <MacroDisplay label="Carbs" current={totals.carbs} target={targets?.carbs ?? 0} unit="g" color="amber" />
        <MacroDisplay label="Fat" current={totals.fat} target={targets?.fat ?? 0} unit="g" color="rose" />
      </div>

      {logs.map((log) => (
        <div key={log.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-3">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-xs font-medium text-emerald-500 uppercase">{log.mealSlot}</span>
              <p className="font-medium text-sm">{log.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{log.totalCalories} kcal</span>
              <button
                onClick={() => log.id != null && deleteLog(log.id)}
                className="text-red-400 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="space-y-1">
            {log.items.map((item, j) => (
              <div key={j} className="text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                <span>
                  {item.name} ({item.quantity}
                  {item.unit})
                </span>
                <span>
                  {item.calories}cal P:{item.protein} C:{item.carbs} F:{item.fat}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {logs.length === 0 && (
        <p className="text-gray-400 text-center mt-8">No meals logged this day.</p>
      )}
    </div>
  )
}
