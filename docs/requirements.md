# GetFat — Requirements Breakdown

## R1 — Daily Targets

| ID | Requirement | Status |
|----|------------|--------|
| R1.1 | Set daily calorie target (kcal) | ✅ Done |
| R1.2 | Set daily macro targets: protein, carbs, fat (grams) | ✅ Done |
| R1.3 | Show macro-to-calorie consistency check (sum of P×4 + C×4 + F×9 vs total) | ✅ Done |
| R1.4 | Targets saved with effective date (supports changing targets over time) | ✅ Done |

## R2 — Food Logging (Text)

| ID | Requirement | Status |
|----|------------|--------|
| R2.1 | Log a single ingredient with quantity → AI estimates calories & macros | ✅ Done |
| R2.2 | Paste a multi-ingredient recipe → AI estimates each line | ✅ Done |
| R2.3 | Describe a meal by name → AI guesstimates portion and macros | ✅ Done |
| R2.4 | Assign each log to a meal slot (breakfast / lunch / dinner / snack) | ✅ Done |
| R2.5 | Review and edit all AI estimates before saving | ✅ Done |
| R2.6 | Remove individual items from an estimate before approving | ✅ Done |

## R3 — Food Logging (Photo)

| ID | Requirement | Status |
|----|------------|--------|
| R3.1 | Scan a food label photo → extract per-100g nutrition values | ✅ Done |
| R3.2 | Pre-fill product name from label (editable) | ✅ Done |
| R3.3 | Enter actual quantity eaten → scale macros proportionally from per-100g | ✅ Done |
| R3.4 | Option to log scanned label as full meal or as a single component | ✅ Done |
| R3.5 | Photo of a meal → AI identifies ingredients and estimates macros (beta) | ✅ Done |
| R3.6 | Photos resized to 1024px and JPEG-compressed before API call | ✅ Done |

## R4 — Frequently Used Items

| ID | Requirement | Status |
|----|------------|--------|
| R4.1 | Track frequency of all logged descriptions | ✅ Done |
| R4.2 | Show top-6 frequently used items as tappable chips (filtered by mode) | ✅ Done |
| R4.3 | Type-ahead suggestions as user types (2+ chars), matching description and item names | ✅ Done |
| R4.4 | Selecting a frequent item or suggestion reuses stored macros — no API call | ✅ Done |

## R5 — Dashboard

| ID | Requirement | Status |
|----|------------|--------|
| R5.1 | Show today's date and total calories/macros consumed | ✅ Done |
| R5.2 | Progress bars with percentage for each macro vs target | ✅ Done |
| R5.3 | Color-coded: green on track, red over target | ✅ Done |
| R5.4 | List of today's logged meals with slot label and calorie total | ✅ Done |
| R5.5 | Compact weekly micronutrient summary (collapsible) from cached report | ✅ Done |
| R5.6 | Prompts when API key or targets are not set | ✅ Done |

## R6 — History & Export

| ID | Requirement | Status |
|----|------------|--------|
| R6.1 | List all logged days sorted newest-first with total calories and protein | ✅ Done |
| R6.2 | Tap a day to see full detail: meals, items, macros, progress bars | ✅ Done |
| R6.3 | Delete individual meal logs from a day | ✅ Done |
| R6.4 | Export full history as JSON (AI-friendly, structured) | ✅ Done |
| R6.5 | Export full history as CSV (one row per food item) | ✅ Done |

## R7 — Weekly Micronutrient Report

| ID | Requirement | Status |
|----|------------|--------|
| R7.1 | Aggregate past 7 days of food items | ✅ Done |
| R7.2 | AI estimates average daily micronutrient intake | ✅ Done |
| R7.3 | Compare against Livsmedelverket RDI for adult men | ✅ Done |
| R7.4 | Status per nutrient: good / low / high | ✅ Done |
| R7.5 | Cache report for display on dashboard | ✅ Done |
| R7.6 | Invalidate cache when food logs are deleted | ✅ Done |

## R8 — Security & Settings

| ID | Requirement | Status |
|----|------------|--------|
| R8.1 | 4-digit PIN lock (SHA-256 hashed, stored locally) | ✅ Done |
| R8.2 | PIN setup, change, and removal in settings | ✅ Done |
| R8.3 | Anthropic API key stored in IndexedDB (never sent except to Anthropic) | ✅ Done |
| R8.4 | Show/hide toggle for API key | ✅ Done |
| R8.5 | Clear all food data option with confirmation | ✅ Done |

## R10 — Data Persistence (GitHub Sync)

| ID | Requirement | Status |
|----|------------|--------|
| R10.1 | Store food logs and targets as JSON on a `data` branch in the GitHub repo | ✅ Done |
| R10.2 | Auto-push to GitHub (debounced 3s) after any data change | ✅ Done |
| R10.3 | Auto-pull from GitHub on startup if local DB is empty (restore after browser clear) | ✅ Done |
| R10.4 | Manual push/pull buttons in Settings | ✅ Done |
| R10.5 | Create orphan `data` branch automatically on first sync | ✅ Done |
| R10.6 | SHA-based conflict handling with automatic retry | ✅ Done |
| R10.7 | GitHub fine-grained token with Contents read/write scope | ✅ Done |
| R10.8 | Sensitive settings (API key, PIN, GitHub token) stay local only — not synced | ✅ Done |
| ID | Requirement | Status |
|----|------------|--------|
| R9.1 | Installable as PWA (Add to Home Screen) | ✅ Done |
| R9.2 | System light/dark theme via `prefers-color-scheme` | ✅ Done |
| R9.3 | Auto-deploy to GitHub Pages on push to main | ✅ Done |
| R9.4 | App shell cached by service worker for fast loading | ✅ Done |
| R9.5 | Safe area support for notched phones | ✅ Done |
