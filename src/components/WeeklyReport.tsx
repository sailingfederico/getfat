import { useState } from 'react'
import { getLogsForDateRange } from '../db/database'
import { estimateWeeklyMicronutrients } from '../services/ai'
import type { FoodItem, MicronutrientEntry } from '../types'

export default function WeeklyReport() {
  const [loading, setLoading] = useState(false)
  const [nutrients, setNutrients] = useState<MicronutrientEntry[]>([])
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState(false)

  const generateReport = async () => {
    setLoading(true)
    setError('')
    try {
      const end = new Date().toISOString().split('T')[0]
      const start = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      const logs = await getLogsForDateRange(start, end)

      if (logs.length === 0) {
        setError('No food logged in the past 7 days.')
        setLoading(false)
        return
      }

      const allItems: FoodItem[] = logs.flatMap((l) => l.items)
      const days = new Set(logs.map((l) => l.date)).size
      const result = await estimateWeeklyMicronutrients(allItems, days)
      setNutrients(result.nutrients)
      setSummary(result.summary)
      setGenerated(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const statusColor = (status: string) => {
    if (status === 'good') return 'text-emerald-500'
    if (status === 'low') return 'text-amber-500'
    return 'text-red-500'
  }

  const statusIcon = (status: string) => {
    if (status === 'good') return '✓'
    if (status === 'low') return '↓'
    return '↑'
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Weekly Report</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Estimates micronutrient intake from the past 7 days vs recommended values.
      </p>

      {!generated && (
        <button
          onClick={generateReport}
          disabled={loading}
          className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold text-lg
                     disabled:opacity-50 active:bg-emerald-600 transition-colors"
        >
          {loading ? 'Analyzing...' : 'Generate Report'}
        </button>
      )}

      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

      {generated && (
        <>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-3 font-medium text-gray-500">Nutrient</th>
                  <th className="text-right p-3 font-medium text-gray-500">Avg</th>
                  <th className="text-right p-3 font-medium text-gray-500">RDI</th>
                  <th className="text-center p-3 font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {nutrients.map((n, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="p-3">{n.name}</td>
                    <td className="p-3 text-right">
                      {n.avgDaily} {n.unit}
                    </td>
                    <td className="p-3 text-right text-gray-400">
                      {n.recommended} {n.unit}
                    </td>
                    <td className={`p-3 text-center font-bold ${statusColor(n.status)}`}>
                      {statusIcon(n.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {summary && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 text-sm">
              {summary}
            </div>
          )}

          <button
            onClick={() => { setGenerated(false); generateReport() }}
            disabled={loading}
            className="w-full py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium"
          >
            {loading ? 'Analyzing...' : 'Regenerate'}
          </button>
        </>
      )}
    </div>
  )
}
