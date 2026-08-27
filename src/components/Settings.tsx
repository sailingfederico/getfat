import { useState, useEffect } from 'react'
import { getSetting, setSetting, db } from '../db/database'

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin + 'getfat-salt')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export default function Settings() {
  const [apiKey, setApiKey] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [newPin, setNewPin] = useState('')
  const [hasPin, setHasPin] = useState(false)

  useEffect(() => {
    getSetting('anthropic_api_key').then((key) => {
      if (key) {
        setApiKey(key)
        setHasApiKey(true)
      }
    })
    getSetting('pin_hash').then((hash) => setHasPin(!!hash))
  }, [])

  const flash = (msg: string) => {
    setSavedMsg(msg)
    setTimeout(() => setSavedMsg(''), 2000)
  }

  const saveApiKey = async () => {
    await setSetting('anthropic_api_key', apiKey)
    setHasApiKey(true)
    flash('API key saved!')
  }

  const changePin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      flash('PIN must be exactly 4 digits')
      return
    }
    const hash = await hashPin(newPin)
    await setSetting('pin_hash', hash)
    setNewPin('')
    setHasPin(true)
    flash('PIN updated!')
  }

  const removePin = async () => {
    await db.settings.delete('pin_hash')
    setHasPin(false)
    flash('PIN removed')
  }

  const clearAllData = async () => {
    if (window.confirm('Delete ALL food logs and targets? This cannot be undone.')) {
      await db.foodLogs.clear()
      await db.targets.clear()
      flash('All food data cleared')
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Settings</h1>

      {savedMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 mb-4 text-sm text-emerald-700 dark:text-emerald-300">
          {savedMsg}
        </div>
      )}

      {/* API Key */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
          Anthropic API Key
        </h2>
        <p className="text-xs text-gray-400 mb-2">
          Get your key at{' '}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-500 underline"
          >
            console.anthropic.com
          </a>
          . Stored on this device only.
        </p>
        <div className="flex gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl
                       border border-gray-200 dark:border-gray-700 text-sm font-mono
                       focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="px-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
        <button
          onClick={saveApiKey}
          className="w-full mt-2 py-2 bg-emerald-500 text-white rounded-xl font-medium text-sm"
        >
          {hasApiKey ? 'Update Key' : 'Save Key'}
        </button>
      </section>

      {/* PIN */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
          PIN Lock
        </h2>
        {hasPin ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="New 4-digit PIN"
                className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl
                           border border-gray-200 dark:border-gray-700 text-sm text-center tracking-widest
                           focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={changePin}
                className="px-4 bg-emerald-500 text-white rounded-xl text-sm font-medium"
              >
                Change
              </button>
            </div>
            <button
              onClick={removePin}
              className="w-full py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium"
            >
              Remove PIN
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="4-digit PIN"
              className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl
                         border border-gray-200 dark:border-gray-700 text-sm text-center tracking-widest
                         focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={changePin}
              className="px-4 bg-emerald-500 text-white rounded-xl text-sm font-medium"
            >
              Set PIN
            </button>
          </div>
        )}
      </section>

      {/* Data */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
          Data
        </h2>
        <button
          onClick={clearAllData}
          className="w-full py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium"
        >
          Clear All Food Data
        </button>
      </section>

      <div className="text-center text-xs text-gray-400 mt-8">
        <p>GetFat v1.0</p>
        <p>AI: Claude Haiku 4.5 · Data stored locally</p>
      </div>
    </div>
  )
}
