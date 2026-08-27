import { useState, useEffect } from 'react'
import { getAllLogs } from '../db/database'
import type { FoodLog } from '../types'

interface Props {
  onSelectDay: (date: string) => void
}

export default function History({ onSelectDay }: Props) {
  const [days, setDays] = useState<{ date: string; totalCal: number; totalProtein: number; meals: number }[]>([])

  useEffect(() => {
    getAllLogs().then((logs) => {
      const grouped = logs.reduce<Record<string, FoodLog[]>>((acc, log) => {
        ;(acc[log.date] = acc[log.date] || []).push(log)
        return acc
      }, {})

      const dayList = Object.entries(grouped)
        .map(([date, dayLogs]) => ({
          date,
          totalCal: dayLogs.reduce((s, l) => s + l.totalCalories, 0),
          totalProtein: dayLogs.reduce((s, l) => s + l.totalProtein, 0),
          meals: dayLogs.length,
        }))
        .sort((a, b) => b.date.localeCompare(a.date))

      setDays(dayList)
    })
  }, [])

  const exportData = async (format: 'json' | 'csv') => {
    const logs = await getAllLogs()
    let content: string
    let filename: string
    let mime: string

    if (format === 'json') {
      content = JSON.stringify(
        { exportDate: new Date().toISOString(), logs },
        null,
        2,
      )
      filename = `getfat-export-${new Date().toISOString().split('T')[0]}.json`
      mime = 'application/json'
    } else {
      const rows = [
        ['Date', 'Meal', 'Description', 'Item', 'Qty', 'Unit', 'Calories', 'Protein', 'Carbs', 'Fat', 'Fiber'],
      ]
      for (const log of logs) {
        for (const item of log.items) {
          rows.push([
            log.date, log.mealSlot, log.description, item.name,
            String(item.quantity), item.unit, String(item.calories),
            String(item.protein), String(item.carbs), String(item.fat), String(item.fiber),
          ])
        }
      }
      content = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
      filename = `getfat-export-${new Date().toISOString().split('T')[0]}.csv`
      mime = 'text/csv'
    }

    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">History</h1>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => exportData('json')}
          className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium"
        >
          Export JSON
        </button>
        <button
          onClick={() => exportData('csv')}
          className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium"
        >
          Export CSV
        </button>
      </div>

      {days.length === 0 ? (
        <p className="text-gray-400 text-center mt-8">No food logged yet.</p>
      ) : (
        days.map((day) => (
          <button
            key={day.date}
            onClick={() => onSelectDay(day.date)}
            className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-2
                       text-left flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{formatDate(day.date)}</p>
              <p className="text-xs text-gray-400">
                {day.meals} meal{day.meals !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{Math.round(day.totalCal)} kcal</p>
              <p className="text-xs text-gray-400">{Math.round(day.totalProtein)}g protein</p>
            </div>
          </button>
        ))
      )}
    </div>
  )
}
