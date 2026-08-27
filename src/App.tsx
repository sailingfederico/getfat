import { useState, useEffect } from 'react'
import { getSetting } from './db/database'
import { autoSyncOnStartup } from './services/sync'
import PinLock from './components/PinLock'
import Dashboard from './components/Dashboard'
import AddFood from './components/AddFood'
import ReviewEstimate from './components/ReviewEstimate'
import Targets from './components/Targets'
import History from './components/History'
import DayDetail from './components/DayDetail'
import WeeklyReport from './components/WeeklyReport'
import Settings from './components/Settings'
import Navigation from './components/Navigation'
import type { Page, FoodItem } from './types'

export default function App() {
  const [locked, setLocked] = useState(true)
  const [pinChecked, setPinChecked] = useState(false)
  const [page, setPage] = useState<Page>('dashboard')
  const [selectedDay, setSelectedDay] = useState('')

  const [pendingItems, setPendingItems] = useState<FoodItem[]>([])
  const [pendingNotes, setPendingNotes] = useState('')
  const [pendingDescription, setPendingDescription] = useState('')
  const [pendingMealSlot, setPendingMealSlot] = useState('snack')

  useEffect(() => {
    getSetting('pin_hash').then((hash) => {
      if (!hash) setLocked(false)
      setPinChecked(true)
    })
    autoSyncOnStartup()
  }, [])

  if (!pinChecked) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <span className="text-gray-400">Loading...</span>
      </div>
    )
  }

  if (locked) {
    return <PinLock onUnlock={() => setLocked(false)} />
  }

  const handleEstimated = (
    items: FoodItem[],
    notes: string,
    description: string,
    mealSlot: string,
  ) => {
    setPendingItems(items)
    setPendingNotes(notes)
    setPendingDescription(description)
    setPendingMealSlot(mealSlot)
    setPage('review')
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard onAddFood={() => setPage('add-food')} />
      case 'add-food':
        return (
          <AddFood
            onEstimated={handleEstimated}
            onCancel={() => setPage('dashboard')}
          />
        )
      case 'review':
        return (
          <ReviewEstimate
            items={pendingItems}
            notes={pendingNotes}
            description={pendingDescription}
            mealSlot={pendingMealSlot}
            onSaved={() => setPage('dashboard')}
            onCancel={() => setPage('add-food')}
          />
        )
      case 'targets':
        return <Targets />
      case 'history':
        return (
          <History
            onSelectDay={(date) => {
              setSelectedDay(date)
              setPage('day-detail')
            }}
          />
        )
      case 'day-detail':
        return (
          <DayDetail date={selectedDay} onBack={() => setPage('history')} />
        )
      case 'weekly-report':
        return <WeeklyReport />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard onAddFood={() => setPage('add-food')} />
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto pb-16">{renderPage()}</div>
      <Navigation current={page} onNavigate={setPage} />
    </div>
  )
}
