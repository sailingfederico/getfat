import { useState } from 'react'
import type { FoodItem, FoodLog } from '../types'
import { db } from '../db/database'
import { requestSync } from '../services/sync'

interface Props {
  items: FoodItem[]
  notes: string
  description: string
  mealSlot: string
  onSaved: () => void
  onCancel: () => void
}

export default function ReviewEstimate({
  items: initialItems,
  notes,
  description,
  mealSlot,
  onSaved,
  onCancel,
}: Props) {
  const [items, setItems] = useState<FoodItem[]>(initialItems)
  const [saving, setSaving] = useState(false)

  const updateItem = (index: number, field: keyof FoodItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value, edited: true } : item)),
    )
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + (Number(item.calories) || 0),
      protein: acc.protein + (Number(item.protein) || 0),
      carbs: acc.carbs + (Number(item.carbs) || 0),
      fat: acc.fat + (Number(item.fat) || 0),
      fiber: acc.fiber + (Number(item.fiber) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  )

  const handleSave = async () => {
    setSaving(true)
    const log: FoodLog = {
      date: new Date().toISOString().split('T')[0],
      mealSlot: mealSlot as FoodLog['mealSlot'],
      description,
      items,
      totalCalories: Math.round(totals.calories),
      totalProtein: Math.round(totals.protein * 10) / 10,
      totalCarbs: Math.round(totals.carbs * 10) / 10,
      totalFat: Math.round(totals.fat * 10) / 10,
      totalFiber: Math.round(totals.fiber * 10) / 10,
      approved: true,
      createdAt: new Date().toISOString(),
    }
    await db.foodLogs.add(log)
    requestSync()
    onSaved()
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Review & Edit</h1>
        <button onClick={onCancel} className="text-gray-400 text-sm">
          Back
        </button>
      </div>

      {notes && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 text-sm">
          💡 {notes}
        </div>
      )}

      {items.map((item, i) => (
        <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-3">
          <div className="flex justify-between items-start mb-2">
            <input
              value={item.name}
              onChange={(e) => updateItem(i, 'name', e.target.value)}
              className="font-medium bg-transparent border-b border-transparent
                         focus:border-emerald-500 focus:outline-none flex-1 mr-2"
            />
            <button onClick={() => removeItem(i)} className="text-red-400 text-xs ml-1">
              ✕
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <label className="text-xs text-gray-400">Qty</label>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                className="w-full bg-white dark:bg-gray-700 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Unit</label>
              <input
                value={item.unit}
                onChange={(e) => updateItem(i, 'unit', e.target.value)}
                className="w-full bg-white dark:bg-gray-700 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Calories</label>
              <input
                type="number"
                value={item.calories}
                onChange={(e) => updateItem(i, 'calories', Number(e.target.value))}
                className="w-full bg-white dark:bg-gray-700 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Protein</label>
              <input
                type="number"
                step="0.1"
                value={item.protein}
                onChange={(e) => updateItem(i, 'protein', Number(e.target.value))}
                className="w-full bg-white dark:bg-gray-700 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Carbs</label>
              <input
                type="number"
                step="0.1"
                value={item.carbs}
                onChange={(e) => updateItem(i, 'carbs', Number(e.target.value))}
                className="w-full bg-white dark:bg-gray-700 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Fat</label>
              <input
                type="number"
                step="0.1"
                value={item.fat}
                onChange={(e) => updateItem(i, 'fat', Number(e.target.value))}
                className="w-full bg-white dark:bg-gray-700 rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
        </div>
      ))}

      <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 mb-4">
        <h3 className="text-sm font-semibold mb-2">Totals</h3>
        <div className="grid grid-cols-2 gap-1 text-sm">
          <span>
            Calories: <strong>{Math.round(totals.calories)}</strong> kcal
          </span>
          <span>
            Protein: <strong>{(Math.round(totals.protein * 10) / 10).toFixed(1)}</strong>g
          </span>
          <span>
            Carbs: <strong>{(Math.round(totals.carbs * 10) / 10).toFixed(1)}</strong>g
          </span>
          <span>
            Fat: <strong>{(Math.round(totals.fat * 10) / 10).toFixed(1)}</strong>g
          </span>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || items.length === 0}
        className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold text-lg
                   disabled:opacity-50 active:bg-emerald-600 transition-colors"
      >
        {saving ? 'Saving...' : '✓ Approve & Save'}
      </button>
    </div>
  )
}
