import { useState, useEffect } from 'react'
import { getActiveTargets, db } from '../db/database'
import { requestSync } from '../services/sync'

export default function Targets() {
  const [calories, setCalories] = useState(2400)
  const [protein, setProtein] = useState(180)
  const [carbs, setCarbs] = useState(250)
  const [fat, setFat] = useState(75)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getActiveTargets().then((t) => {
      if (t) {
        setCalories(t.calories)
        setProtein(t.protein)
        setCarbs(t.carbs)
        setFat(t.fat)
      }
    })
  }, [])

  const macroCals = protein * 4 + carbs * 4 + fat * 9
  const diff = calories - macroCals

  const pct = (macro: number, multiplier: number) =>
    calories > 0 ? Math.round((macro * multiplier * 100) / calories) : 0

  const handleSave = async () => {
    await db.targets.add({
      calories,
      protein,
      carbs,
      fat,
      effectiveFrom: new Date().toISOString().split('T')[0],
    })
    requestSync()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Daily Targets</h1>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Calories (kcal)
          </label>
          <input
            type="number"
            value={calories}
            onChange={(e) => setCalories(Number(e.target.value))}
            className="w-full mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-lg font-semibold
                       border border-gray-200 dark:border-gray-700
                       focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Protein (g)
          </label>
          <input
            type="number"
            value={protein}
            onChange={(e) => setProtein(Number(e.target.value))}
            className="w-full mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-lg font-semibold
                       border border-gray-200 dark:border-gray-700
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-400 mt-1 block">
            {protein * 4} kcal ({pct(protein, 4)}%)
          </span>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Carbs (g)</label>
          <input
            type="number"
            value={carbs}
            onChange={(e) => setCarbs(Number(e.target.value))}
            className="w-full mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-lg font-semibold
                       border border-gray-200 dark:border-gray-700
                       focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <span className="text-xs text-gray-400 mt-1 block">
            {carbs * 4} kcal ({pct(carbs, 4)}%)
          </span>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Fat (g)</label>
          <input
            type="number"
            value={fat}
            onChange={(e) => setFat(Number(e.target.value))}
            className="w-full mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-lg font-semibold
                       border border-gray-200 dark:border-gray-700
                       focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <span className="text-xs text-gray-400 mt-1 block">
            {fat * 9} kcal ({pct(fat, 9)}%)
          </span>
        </div>
      </div>

      {Math.abs(diff) > 10 && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm ${
            diff > 0
              ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}
        >
          {diff > 0
            ? `⚠️ Macros add up to ${macroCals} kcal — ${diff} below your calorie target`
            : `⚠️ Macros add up to ${macroCals} kcal — ${Math.abs(diff)} above your calorie target`}
        </div>
      )}

      <button
        onClick={handleSave}
        className="w-full mt-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold text-lg
                   active:bg-emerald-600 transition-colors"
      >
        {saved ? '✓ Saved!' : 'Save Targets'}
      </button>
    </div>
  )
}
