interface Props {
  label: string
  current: number
  target: number
  unit: string
  color: 'emerald' | 'blue' | 'amber' | 'rose'
}

const colorClasses: Record<string, { bg: string; fill: string }> = {
  emerald: { bg: 'bg-emerald-200 dark:bg-emerald-900', fill: 'bg-emerald-500' },
  blue: { bg: 'bg-blue-200 dark:bg-blue-900', fill: 'bg-blue-500' },
  amber: { bg: 'bg-amber-200 dark:bg-amber-900', fill: 'bg-amber-500' },
  rose: { bg: 'bg-rose-200 dark:bg-rose-900', fill: 'bg-rose-500' },
}

export default function MacroDisplay({ label, current, target, unit, color }: Props) {
  const pct = target > 0 ? Math.min((current / target) * 100, 150) : 0
  const displayPct = Math.round(pct)
  const over = pct > 100
  const c = colorClasses[color]

  if (target === 0) {
    return (
      <div className="flex justify-between items-center py-1.5">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-sm font-medium">
          {Math.round(current)} {unit}
        </span>
      </div>
    )
  }

  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm">
          <span className={`font-semibold ${over ? 'text-red-500' : ''}`}>
            {Math.round(current)}
          </span>
          <span className="text-gray-400">
            {' '}/ {Math.round(target)} {unit}
          </span>
          <span className="text-gray-400 ml-1">({displayPct}%)</span>
        </span>
      </div>
      <div className={`h-2 rounded-full ${c.bg} overflow-hidden`}>
        <div
          className={`h-full rounded-full ${over ? 'bg-red-500' : c.fill} transition-all duration-300`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}
