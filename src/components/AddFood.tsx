import { useState, useRef, useEffect } from 'react'
import type { FoodItem, InputMode } from '../types'
import { estimateNutrition, estimateFromImage, scanLabel, type LabelScanResult } from '../services/ai'
import { getFrequentItems, type FrequentItem } from '../db/database'

interface Props {
  onEstimated: (items: FoodItem[], notes: string, description: string, mealSlot: string) => void
  onCancel: () => void
}

const MODES: { key: InputMode; label: string; placeholder: string }[] = [
  { key: 'ingredient', label: 'Ingredient', placeholder: 'e.g. 150g chicken breast, grilled' },
  { key: 'recipe', label: 'Recipe', placeholder: 'Paste ingredients with quantities:\n200g pasta\n100g ground beef\n2 tbsp olive oil' },
  { key: 'meal', label: 'Meal', placeholder: 'e.g. Large pepperoni pizza, 3 slices\nor: chicken Caesar salad' },
]

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const
const MAX_FREQUENT = 6

export default function AddFood({ onEstimated, onCancel }: Props) {
  const [mode, setMode] = useState<InputMode>('ingredient')
  const [input, setInput] = useState('')
  const [mealSlot, setMealSlot] = useState<string>('snack')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoModeRef = useRef<'label' | 'meal'>('label')
  const [labelData, setLabelData] = useState<LabelScanResult | null>(null)
  const [labelName, setLabelName] = useState('')
  const [labelQty, setLabelQty] = useState('')
  const [frequents, setFrequents] = useState<FrequentItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    getFrequentItems().then(setFrequents)
  }, [])

  const currentMode = MODES.find((m) => m.key === mode)!

  const modeFrequents = frequents.filter((f) => {
    if (mode === 'ingredient') return f.items.length === 1
    if (mode === 'recipe') return f.items.length > 1
    return true
  }).slice(0, MAX_FREQUENT)

  const inputLower = input.toLowerCase().trim()
  const suggestions = inputLower.length >= 2
    ? frequents.filter((f) => {
        const desc = f.description.toLowerCase()
        const names = f.items.map((i) => i.name.toLowerCase()).join(' ')
        return desc.includes(inputLower) || names.includes(inputLower)
      }).slice(0, 5)
    : []

  const selectFrequent = (f: FrequentItem) => {
    onEstimated(f.items, '', f.description, mealSlot)
  }

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

  const openCamera = (pMode: 'label' | 'meal') => {
    photoModeRef.current = pMode
    fileInputRef.current?.click()
  }

  const resizeImage = (file: File): Promise<{ base64: string; mediaType: string }> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const canvas = document.createElement('canvas')
        let { width, height } = img
        const maxW = 1024
        if (width > maxW) { height = (height * maxW) / width; width = maxW }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        resolve({ base64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], mediaType: 'image/jpeg' })
      }
      img.onerror = reject
      img.src = url
    })

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setLoading(true)
    setError('')
    try {
      const { base64, mediaType } = await resizeImage(file)
      if (photoModeRef.current === 'label') {
        const result = await scanLabel(base64, mediaType)
        setLabelData(result)
        setLabelName(result.productName)
        setLabelQty(result.servingSize?.replace(/[^\d.]/g, '') || '100')
      } else {
        const result = await estimateFromImage(base64, mediaType)
        onEstimated(result.items, result.notes ?? '', '📸 Photo meal (β)', mealSlot)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to analyze photo')
    } finally {
      setLoading(false)
    }
  }

  const handleLabelConfirm = (asMeal: boolean) => {
    if (!labelData) return
    const qty = parseFloat(labelQty) || 100
    const scale = qty / 100
    const p = labelData.per100
    const item: FoodItem = {
      name: labelName || labelData.productName,
      quantity: qty,
      unit: 'g',
      calories: Math.round(p.calories * scale),
      protein: Math.round(p.protein * scale * 10) / 10,
      carbs: Math.round(p.carbs * scale * 10) / 10,
      fat: Math.round(p.fat * scale * 10) / 10,
      fiber: Math.round(p.fiber * scale * 10) / 10,
      edited: false,
    }
    const desc = asMeal ? `📋 ${item.name}` : `📋 ${item.name} (component)`
    const notes = asMeal ? labelData.notes : 'Add more items on the review screen'
    onEstimated([item], notes, desc, mealSlot)
  }

  // ── Label confirm screen ──
  if (labelData) {
    const qty = parseFloat(labelQty) || 100
    const scale = qty / 100
    const p = labelData.per100
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Scanned Label</h1>
          <button onClick={() => setLabelData(null)} className="text-gray-400 text-sm">Back</button>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Product name</label>
            <input value={labelName} onChange={(e) => setLabelName(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700
                         text-base focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
              Amount (g){labelData.servingSize ? ` · label: ${labelData.servingSize}` : ''}
            </label>
            <input type="number" inputMode="numeric" value={labelQty}
              onChange={(e) => setLabelQty(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700
                         text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-2 text-sm">
          <p className="text-xs text-gray-400 mb-2">Per 100g from label</p>
          <div className="grid grid-cols-2 gap-1">
            <span>Cal: {p.calories}</span><span>Protein: {p.protein}g</span>
            <span>Carbs: {p.carbs}g</span><span>Fat: {p.fat}g</span>
          </div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 mb-4 text-sm">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1 font-semibold">For {qty}g</p>
          <div className="grid grid-cols-2 gap-1">
            <span>Cal: <strong>{Math.round(p.calories * scale)}</strong></span>
            <span>Protein: <strong>{(Math.round(p.protein * scale * 10) / 10).toFixed(1)}</strong>g</span>
            <span>Carbs: <strong>{(Math.round(p.carbs * scale * 10) / 10).toFixed(1)}</strong>g</span>
            <span>Fat: <strong>{(Math.round(p.fat * scale * 10) / 10).toFixed(1)}</strong>g</span>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <div className="flex gap-2">
          <button onClick={() => handleLabelConfirm(true)}
            className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-semibold
                       active:bg-emerald-600 transition-colors">
            ✓ Log as Meal
          </button>
          <button onClick={() => handleLabelConfirm(false)}
            className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-semibold text-sm
                       active:bg-gray-300 dark:active:bg-gray-600 transition-colors">
            Add as Component
          </button>
        </div>
      </div>
    )
  }

  // ── Main input screen ──
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Add Food</h1>
        <button onClick={onCancel} className="text-gray-400 text-sm">Cancel</button>
      </div>

      <div className="flex gap-2 mb-4">
        {MODES.map((m) => (
          <button key={m.key} onClick={() => { setMode(m.key); setInput(''); setShowSuggestions(false) }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              mode === m.key
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 block">Meal</label>
        <div className="flex gap-2">
          {MEAL_SLOTS.map((slot) => (
            <button key={slot} onClick={() => setMealSlot(slot)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                mealSlot === slot
                  ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}>
              {slot}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true) }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={currentMode.placeholder}
          rows={mode === 'recipe' ? 6 : 3}
          className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl
                     bg-white dark:bg-gray-800 text-base resize-none
                     focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200
                          dark:border-gray-700 rounded-xl shadow-lg z-10 overflow-hidden">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => { selectFrequent(s); setShowSuggestions(false) }}
                className="w-full text-left px-3 py-2.5 text-sm flex justify-between items-center
                           active:bg-gray-50 dark:active:bg-gray-700
                           border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                <span className="truncate mr-2">{s.description}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{s.totalCalories} kcal</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      <button onClick={handleSubmit} disabled={loading || !input.trim()}
        className="w-full mt-4 py-3 bg-emerald-500 text-white rounded-xl font-semibold text-lg
                   disabled:opacity-50 active:bg-emerald-600 transition-colors">
        {loading ? 'Estimating...' : 'Estimate Nutrition'}
      </button>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
             onChange={handlePhoto} className="hidden" />

      <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-semibold">Or take a photo</p>
        <div className="flex gap-2">
          <button onClick={() => openCamera('label')} disabled={loading}
            className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium
                       disabled:opacity-50 active:bg-gray-200 dark:active:bg-gray-700 transition-colors">
            📋 Scan Label
          </button>
          <button onClick={() => openCamera('meal')} disabled={loading}
            className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium
                       disabled:opacity-50 active:bg-gray-200 dark:active:bg-gray-700 transition-colors">
            📸 Photo Meal <span className="text-xs text-gray-400">β</span>
          </button>
        </div>
      </div>

      {modeFrequents.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-semibold">Frequently used</p>
          <div className="flex flex-wrap gap-1.5">
            {modeFrequents.map((f, i) => (
              <button key={i} onClick={() => selectFrequent(f)}
                className="text-xs px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg
                           active:bg-emerald-100 dark:active:bg-emerald-900 transition-colors
                           truncate max-w-[48%]">
                {f.description} <span className="text-gray-400">{f.totalCalories}cal</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
