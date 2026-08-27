import { useState } from 'react'
import { getSetting } from '../db/database'

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin + 'getfat-salt')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

interface Props {
  onUnlock: () => void
}

export default function PinLock({ onUnlock }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setError('')
    if (next.length === 4) {
      setTimeout(() => verifyPin(next), 150)
    }
  }

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1))
    setError('')
  }

  const verifyPin = async (fullPin: string) => {
    const hash = await hashPin(fullPin)
    const stored = await getSetting('pin_hash')
    if (hash === stored) {
      onUnlock()
    } else {
      setError('Wrong PIN')
      setPin('')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-gray-900 p-4">
      <h1 className="text-3xl font-bold mb-1">🍔 GetFat</h1>
      <p className="text-lg mb-8 text-gray-500 dark:text-gray-400">Enter PIN</p>

      <div className="flex gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-colors ${
              i < pin.length
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-gray-400 dark:border-gray-600'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(String(d))}
            className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 text-xl font-semibold
                       active:bg-emerald-100 dark:active:bg-emerald-900 transition-colors"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => handleDigit('0')}
          className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 text-xl font-semibold
                     active:bg-emerald-100 dark:active:bg-emerald-900 transition-colors"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 text-lg
                     active:bg-red-100 dark:active:bg-red-900 transition-colors"
        >
          ←
        </button>
      </div>
    </div>
  )
}
