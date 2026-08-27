import type { FoodItem, InputMode, MicronutrientEntry } from '../types'
import { getSetting } from '../db/database'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5'

const PROMPTS: Record<InputMode, string> = {
  ingredient: `You are a nutrition database. Estimate calories and macronutrients for the given food item.
If no quantity is specified, assume a typical single serving and state the assumed weight.
Respond ONLY with a JSON object — no markdown, no explanation:
{"items":[{"name":"...","quantity":0,"unit":"g","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0}]}`,

  recipe: `You are a nutrition database. For EACH ingredient in the recipe below, estimate calories and macronutrients for the given quantity.
Respond ONLY with a JSON object — no markdown, no explanation:
{"items":[{"name":"...","quantity":0,"unit":"g","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0}]}`,

  meal: `You are a nutrition database. Estimate a typical restaurant/homemade portion for the meal described.
Break it into component ingredients, estimate quantities, then calculate nutrition for each.
Respond ONLY with a JSON object — no markdown, no explanation:
{"items":[{"name":"...","quantity":0,"unit":"g","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0}],"notes":"Brief description of assumed portion size"}`,
}

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = await getSetting('anthropic_api_key')
  if (!apiKey)
    throw new Error('API key not set. Go to Settings to add your Anthropic API key.')

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API error (${response.status}): ${err}`)
  }

  const data = await response.json()
  return data.content[0].text
}

function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Could not parse AI response. Please try again.')
  return match[0]
}

export interface EstimationResult {
  items: FoodItem[]
  notes?: string
}

export async function estimateNutrition(
  input: string,
  mode: InputMode,
): Promise<EstimationResult> {
  const raw = await callClaude(PROMPTS[mode], input)
  const json = JSON.parse(extractJSON(raw))
  return {
    items: json.items.map((item: FoodItem) => ({
      ...item,
      calories: Math.round(item.calories),
      protein: Math.round(item.protein * 10) / 10,
      carbs: Math.round(item.carbs * 10) / 10,
      fat: Math.round(item.fat * 10) / 10,
      fiber: Math.round(item.fiber * 10) / 10,
      edited: false,
    })),
    notes: json.notes,
  }
}

export async function estimateWeeklyMicronutrients(
  items: FoodItem[],
  days: number,
): Promise<{ nutrients: MicronutrientEntry[]; summary: string }> {
  const systemPrompt = `You are a nutrition analyst. Based on food intake data, estimate average daily micronutrient intake and compare to recommended daily values for an adult male doing strength training.
Respond ONLY with a JSON object — no markdown, no explanation:
{"nutrients":[{"name":"...","avgDaily":0,"recommended":0,"unit":"g","status":"good|low|high"}],"summary":"Brief overall assessment"}
Include: Fiber, Iron, Calcium, Vitamin D, Vitamin C, Potassium, Sodium, Magnesium, Zinc, Omega-3.`

  const userMessage = `Food intake over ${days} day(s):\n${JSON.stringify(items)}`
  const raw = await callClaude(systemPrompt, userMessage)
  return JSON.parse(extractJSON(raw))
}
