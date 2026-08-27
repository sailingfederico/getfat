import { useState, useEffect } from 'react'
import { getTodayLogs, getActiveTargets, getSetting } from '../db/database'
import type { FoodLog, Targets } from '../types'
import MacroDisplay from './MacroDisplay'

interface Props {
  onAddFood: () => void
}

export default function Dashboard({ onAddFood }: Props) {
  const [logs, setLogs] = useState<FoodLog[]>([])
  const [targets, setTargets] = useState<Targets | null>(null)
  const [hasApiKey, setHasApiKey] = useState(true)

  useEffect(() => {
    Promise.all([getTodayLogs(), getActiveTargets(), getSetting('anthropic_api_key')]).then(
      ([todayLogs, activeTargets, apiKey]) => {
        setLogs(todayLogs)
        setTargets(activeTargets ?? null)
        setHasApiKey(!!apiKey)
      },
    )
  }, [])

  const totals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.totalCalories,
      protein: acc.protein + log.totalProtein,
      carbs: acc.carbs + log.totalCarbs,
      fat: acc.fat + log.totalFat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold">🍔 GetFat</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{today}</p>
        </div>
      </div>

      {!hasApiKey && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 text-sm">
          ⚠️ Add your Anthropic API key in Settings to start logging food.
        </div>
      )}

      {!targets && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 text-sm">
          📋 Set your daily targets in the Targets tab.
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
          Today's Progress
        </h2>
        <MacroDisplay label="Calories" current={totals.calories} target={targets?.calories ?? 0} unit="kcal" color="emerald" />
        <MacroDisplay label="Protein" current={totals.protein} target={targets?.protein ?? 0} unit="g" color="blue" />
        <MacroDisplay label="Carbs" current={totals.carbs} target={targets?.carbs ?? 0} unit="g" color="amber" />
        <MacroDisplay label="Fat" current={totals.fat} target={targets?.fat ?? 0} unit="g" color="rose" />
      </div>

      {logs.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
            Meals
          </h2>
          {logs.map((log) => (
            <div key={log.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-medium text-emerald-500 uppercase">
                    {log.mealSlot}
                  </span>
                  <p className="font-medium text-sm">{log.description}</p>
                </div>
                <span className="text-sm font-semibold">{log.totalCalories} kcal</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onAddFood}
        className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold text-lg
                   active:bg-emerald-600 transition-colors"
      >
        + Add Food
      </button>
    </div>
  )
}
