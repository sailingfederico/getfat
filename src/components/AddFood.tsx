import { useState, useRef, useEffect } from 'react'
import type { FoodItem } from '../types'
import { estimate } from '../services/ai'
import { getFrequentItems, type FrequentItem } from '../db/database'

interface Props {
  onEstimated: (items: FoodItem[], notes: string, description: string, mealSlot: string) => void
  onCancel: () => void
}

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const
const MAX_FREQUENT = 8

export default function AddFood({ onEstimated, onCancel }: Props) {
  const [input, setInput] = useState('')
  const [mealSlot, setMealSlot] = useState<string>('snack')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attachment, setAttachment] = useState<{ base64: string; mediaType: string; preview: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [frequents, setFrequents] = useState<FrequentItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    getFrequentItems().then(setFrequents)
  }, [])

  const topFrequents = frequents.slice(0, MAX_FREQUENT)

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

  const resizeImage = (file: File): Promise<{ base64: string; mediaType: string; preview: string }> =>
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg', preview: dataUrl })
      }
      img.onerror = reject
      img.src = url
    })

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const img = await resizeImage(file)
      setAttachment(img)
    } catch {
      setError('Failed to load image')
    }
  }

  const handleSubmit = async () => {
    if (!input.trim() && !attachment) return
    setLoading(true)
    setError('')
    try {
      const image = attachment ? { base64: attachment.base64, mediaType: attachment.mediaType } : undefined
      const result = await estimate(input.trim() || 'Analyze this food.', image)
      const desc = input.trim() || (attachment ? '📷 Photo' : '')
      onEstimated(result.items, result.notes ?? '', desc, mealSlot)
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
        <button onClick={onCancel} className="text-gray-400 text-sm">Cancel</button>
      </div>

      <div className="mb-3">
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

      {attachment && (
        <div className="mb-3 relative inline-block">
          <img src={attachment.preview} alt="Attached"
            className="h-20 rounded-lg border border-gray-200 dark:border-gray-700" />
          <button onClick={() => setAttachment(null)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
            ✕
          </button>
        </div>
      )}

      <div className="relative">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); setShowSuggestions(true) }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Describe what you ate... e.g. 200g chicken, rice and salad, or scan a label and add details"
              rows={3}
              className="w-full p-3 pr-10 border border-gray-200 dark:border-gray-700 rounded-xl
                         bg-white dark:bg-gray-800 text-base resize-none
                         focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button onClick={() => fileInputRef.current?.click()}
              className="absolute right-2 bottom-2 w-8 h-8 flex items-center justify-center
                         rounded-full bg-gray-100 dark:bg-gray-700 text-lg
                         active:bg-gray-200 dark:active:bg-gray-600">
              📷
            </button>
          </div>
          <button onClick={handleSubmit} disabled={loading || (!input.trim() && !attachment)}
            className="h-12 w-12 flex-shrink-0 bg-emerald-500 text-white rounded-xl font-bold text-lg
                       disabled:opacity-40 active:bg-emerald-600 transition-colors flex items-center justify-center">
            {loading ? '…' : '→'}
          </button>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-12 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200
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

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
             onChange={handleAttach} className="hidden" />

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {topFrequents.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-semibold">Previously logged</p>
          <div className="flex flex-wrap gap-1.5">
            {topFrequents.map((f, i) => (
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
