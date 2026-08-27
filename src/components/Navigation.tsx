import type { Page } from '../types'

interface Props {
  current: Page
  onNavigate: (page: Page) => void
}

const tabs: { page: Page; label: string; icon: string }[] = [
  { page: 'dashboard', label: 'Today', icon: '📊' },
  { page: 'targets', label: 'Targets', icon: '🎯' },
  { page: 'history', label: 'History', icon: '📅' },
  { page: 'weekly-report', label: 'Report', icon: '📋' },
  { page: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function Navigation({ current, onNavigate }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-bottom">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.page}
            onClick={() => onNavigate(tab.page)}
            className={`flex-1 py-2 flex flex-col items-center gap-0.5 transition-colors ${
              current === tab.page ? 'text-emerald-500' : 'text-gray-400'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
