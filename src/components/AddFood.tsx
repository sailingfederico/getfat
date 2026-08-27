import { useState } from 'react'
import type { FoodItem, InputMode } from '../types'
import { estimateNutrition } from '../services/ai'

interface Props {
  onEstimated: (items: FoodItem[], notes: string, description: string, mealSlot: string) => void
  onCancel: () => void
}

const MODES: { key: InputMode; label: string; placeholder: string }[] = [
  {
    key: 'ingredient',
    label: 'Ingredient',
    placeholder: 'e.g. 150g chicken breast, grilled',
  },
  {
    key: 'recipe',
    label: 'Recipe',
    placeholder: 'Paste ingredients with quantities:\n200g pasta\n100g ground beef\n2 tbsp olive oil',
  },
  {
    key: 'meal',
    label: 'Meal',
    placeholder: 'e.g. Large pepperoni pizza, 3 slices\nor: chicken Caesar salad',
  },
]

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const

export default function AddFood({ onEstimated, onCancel }: Props) {
  const [mode, setMode] = useState<InputMode>('ingredient')
  const [input, setInput] = useState('')
  const [mealSlot, setMealSlot] = useState<string>('snack')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currentMode = MODES.find((m) => m.key === mode)!

  const handleSubmit = async () => {
    if (!input.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await estimateNutrition(input.trim(), mode)
      onEstimated(result.items, result.notes ?? '', input.trim(), mealSlot)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to estimate nutrition')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Add Food</h1>
        <button onClick={onCancel} className="text-gray-400 text-sm">
          Cancel
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              mode === m.key
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 block">
          Meal
        </label>
        <div className="flex gap-2">
          {MEAL_SLOTS.map((slot) => (
            <button
              key={slot}
              onClick={() => setMealSlot(slot)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                mealSlot === slot
                  ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={currentMode.placeholder}
        rows={mode === 'recipe' ? 6 : 3}
        className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl
                   bg-white dark:bg-gray-800 text-base resize-none
                   focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading || !input.trim()}
        className="w-full mt-4 py-3 bg-emerald-500 text-white rounded-xl font-semibold text-lg
                   disabled:opacity-50 active:bg-emerald-600 transition-colors"
      >
        {loading ? 'Estimating...' : 'Estimate Nutrition'}
      </button>
    </div>
  )
}
