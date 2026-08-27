import { useState, useEffect } from 'react'
import { getTodayLogs, getActiveTargets, getSetting } from '../db/database'
import type { FoodLog, Targets, MicronutrientEntry } from '../types'
import MacroDisplay from './MacroDisplay'

interface Props {
  onAddFood: () => void
}

export default function Dashboard({ onAddFood }: Props) {
  const [logs, setLogs] = useState<FoodLog[]>([])
  const [targets, setTargets] = useState<Targets | null>(null)
  const [hasApiKey, setHasApiKey] = useState(true)
  const [micros, setMicros] = useState<MicronutrientEntry[] | null>(null)
  const [microsAge, setMicrosAge] = useState('')
  const [microsOpen, setMicrosOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      getTodayLogs(),
      getActiveTargets(),
      getSetting('anthropic_api_key'),
      getSetting('weekly_report_cache'),
    ]).then(([todayLogs, activeTargets, apiKey, cached]) => {
      setLogs(todayLogs)
      setTargets(activeTargets ?? null)
      setHasApiKey(!!apiKey)
      if (cached) {
        try {
          const data = JSON.parse(cached)
          setMicros(data.nutrients)
          const days = Math.round((Date.now() - new Date(data.date).getTime()) / 86400000)
          setMicrosAge(days === 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`)
        } catch { /* ignore corrupt cache */ }
      }
    })
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

      {micros && micros.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setMicrosOpen(!microsOpen)}
            className="w-full flex justify-between items-center text-left"
          >
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Weekly Micros
            </h2>
            <span className="text-xs text-gray-400">{microsAge} {microsOpen ? '▲' : '▼'}</span>
          </button>
          {!microsOpen && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {micros.map((n, i) => (
                <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${
                  n.status === 'good' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' :
                  n.status === 'low' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' :
                  'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                }`}>
                  {n.status === 'good' ? '✓' : n.status === 'low' ? '↓' : '↑'} {n.name}
                </span>
              ))}
            </div>
          )}
          {microsOpen && (
            <div className="mt-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-xs space-y-1">
              {micros.map((n, i) => (
                <div key={i} className="flex justify-between">
                  <span>{n.name}</span>
                  <span className={
                    n.status === 'good' ? 'text-emerald-500' :
                    n.status === 'low' ? 'text-amber-500' : 'text-red-500'
                  }>
                    {n.avgDaily}{n.unit} / {n.recommended}{n.unit}
                  </span>
                </div>
              ))}
              <p className="text-gray-400 pt-1">Per Livsmedelverket · Tap Report tab to refresh</p>
            </div>
          )}
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
