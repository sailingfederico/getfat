# GetFat — User Flows

## Flow 1: First Launch

```
Open app URL on phone
  → No PIN set → Dashboard shown directly
  → Banner: "Add your Anthropic API key in Settings"
  → Banner: "Set your daily targets in the Targets tab"
  → User goes to Settings → enters API key → saves
  → User goes to Targets → enters calories, protein, carbs, fat → saves
  → Optionally sets a PIN in Settings
  → App ready for use
```

## Flow 2: Returning User (PIN set)

```
Open app
  → PIN entry screen (4-digit keypad)
  → Enter correct PIN → Dashboard
  → Enter wrong PIN → "Wrong PIN", retry
```

## Flow 3: Log Food — Text (Ingredient)

```
Dashboard → [+ Add Food]
  → Select "Ingredient" tab
  → Check "Frequently used" chips at bottom
    → If match found → tap chip → goes to Review screen (no API call) → Approve → Dashboard
    → If no match → type in textarea (e.g. "150g chicken breast")
      → Type-ahead dropdown may appear → tap suggestion (no API call) → Review → Approve → Dashboard
      → Or press [Estimate Nutrition] → API call → Review screen
        → Edit any values if needed
        → [✓ Approve & Save] → Dashboard updated
```

## Flow 4: Log Food — Text (Recipe)

```
Dashboard → [+ Add Food]
  → Select "Recipe" tab
  → Paste or type ingredient list (one per line)
  → Check frequently used recipes below
  → [Estimate Nutrition] → API call → Review screen
    → Each ingredient shown with editable macros
    → Remove unwanted items with ✕
    → [✓ Approve & Save] → Dashboard updated
```

## Flow 5: Log Food — Text (Meal Name)

```
Dashboard → [+ Add Food]
  → Select "Meal" tab
  → Type meal description (e.g. "restaurant Caesar salad with chicken")
  → Check frequently used meals below
  → [Estimate Nutrition] → API call → Review screen
    → AI breaks meal into components with guessed portions
    → Notes show portion assumptions
    → Edit if needed → [✓ Approve & Save] → Dashboard
```

## Flow 6: Log Food — Scan Label (as full meal)

```
Dashboard → [+ Add Food]
  → [📋 Scan Label] → phone camera opens
  → Take photo of nutrition label
  → AI extracts per-100g values + guesses product name
  → "Scanned Label" screen:
    → Product name pre-filled (editable)
    → Enter quantity eaten (g)
    → See per-100g values and calculated values for entered quantity
    → [✓ Log as Meal] → Review screen → Approve → Dashboard
```

## Flow 7: Log Food — Scan Label (as component)

```
Same as Flow 6 up to the Scanned Label screen
  → [Add as Component] → Review screen with single item
    → Notes: "Add more items on the review screen"
    → [✓ Approve & Save] → Dashboard
    → User can then add more food items via [+ Add Food] again
```

## Flow 8: Log Food — Photo Meal (Beta)

```
Dashboard → [+ Add Food]
  → [📸 Photo Meal β] → phone camera opens
  → Take photo of actual food
  → AI identifies visible food components and estimates portions
  → Review screen with all guessed items
    → Notes show assumptions
    → Edit any values → [✓ Approve & Save] → Dashboard
```

## Flow 9: Log Food — Frequent Item (Zero API Cost)

```
Dashboard → [+ Add Food]
  → Select mode (Ingredient / Recipe / Meal)
  → "Frequently used" section shows top items for that mode
  → Tap a chip → immediately goes to Review screen
    → Stored macros pre-filled (no API call)
    → [✓ Approve & Save] → Dashboard
```

## Flow 10: Log Food — Type-Ahead (Zero API Cost)

```
Dashboard → [+ Add Food]
  → Start typing in textarea (2+ characters)
  → Dropdown shows matching past entries
  → Tap a suggestion → immediately goes to Review screen
    → Stored macros pre-filled (no API call)
    → [✓ Approve & Save] → Dashboard
```

## Flow 11: View History

```
Navigation → [📅 History]
  → List of days, newest first
  → Each shows: date, meal count, total calories, total protein
  → Tap a day → Day Detail
    → Progress bars for calories and macros vs targets
    → Each meal shown with item-level breakdown
    → Tap ✕ on a meal to delete it (clears weekly report cache)
  → [← Back] → History list
```

## Flow 12: Export Data

```
Navigation → [📅 History]
  → [Export JSON] → downloads getfat-export-YYYY-MM-DD.json
  → [Export CSV] → downloads getfat-export-YYYY-MM-DD.csv
  → Files saved to phone's Downloads folder
```

## Flow 13: Weekly Micronutrient Report

```
Navigation → [📋 Report]
  → "Micronutrient intake (past 7 days) vs Livsmedelverket recommendations"
  → [Generate Report] → API call → table appears
    → Each nutrient: name, average daily, recommended, status (✓/↓/↑)
    → Summary text at bottom
    → Report cached for Dashboard display
  → [Regenerate] to refresh
```

## Flow 14: Dashboard Weekly Micros

```
Dashboard (after report has been generated)
  → "Weekly Micros" section appears below meals
  → Collapsed: colored chips showing status per nutrient
  → Tap to expand: detailed avg vs RDI table
  → Shows age of cached data
  → "Tap Report tab to refresh"
```

## Flow 15: Change Targets

```
Navigation → [🎯 Targets]
  → Current values shown in form
  → Edit calories and/or macros
  → Warning if macros don't add up to calorie target
  → [Save Targets] → new target saved with today's date
  → Previous targets preserved (history of changes)
```

## Flow 16: Settings Management

```
Navigation → [⚙️ Settings]
  → Anthropic API Key: enter/update, show/hide toggle
  → PIN Lock: set new PIN / change PIN / remove PIN
  → Data: [Clear All Food Data] with confirmation dialog
```
