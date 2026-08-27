# GetFat — App Brief

## Purpose

GetFat is a personal calorie and macro tracker built for body recomposition. It targets a user doing strength training who needs a slight caloric surplus to support protein synthesis while staying near maintenance weight. The app prioritises speed of logging over precision — AI estimates nutrition from text descriptions, recipes, or photos so the user never has to search a database manually.

## Core Principles

- **Mobile-first PWA** — no app store, installed from the browser, runs like a native app
- **No server** — all data stored locally on the device (IndexedDB); AI calls go directly from the browser to the Anthropic API
- **AI-powered estimation** — Claude Haiku 4.5 estimates calories and macros from free-text ingredients, pasted recipes, meal names, food label photos, or meal photos
- **User is always in control** — every AI estimate can be reviewed, edited, or rejected before saving
- **Cost-conscious** — frequently used items are cached and reused without API calls; photos are compressed before sending
- **Exportable history** — full food log downloadable as JSON or CSV for external AI analysis
- **Privacy** — PIN lock, API key stored locally, no analytics, no third-party data sharing

## Target User

Adult male, strength training, familiar with macros (protein/carbs/fat), wants a fast daily logging workflow on mobile. Swedish context (Livsmedelverket micronutrient references).

## Technology Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18 + TypeScript |
| Bundler | Vite 6 |
| Styling | Tailwind CSS 3 (system dark/light mode) |
| Local DB | Dexie.js (IndexedDB) |
| AI | Anthropic API — Claude Haiku 4.5 (direct browser calls) |
| PWA | vite-plugin-pwa (service worker, manifest, installable) |
| Hosting | GitHub Pages (static, free) |
| CI/CD | GitHub Actions (auto-deploy on push to main) |

## Key Constraints

- Internet required for AI estimation (no offline food database)
- User provides their own Anthropic API key
- Data lives only on the device — clearing browser data deletes everything
- Micronutrient analysis is AI-estimated, not from a certified database
