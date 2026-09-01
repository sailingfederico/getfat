import type { FoodItem, InputMode, MicronutrientEntry } from '../types'
import { getSetting } from '../db/database'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5'

const UNIFIED_PROMPT = `You are a nutrition expert and food database. The user will describe what they ate — it could be a single ingredient, a recipe, a full meal, or a combination. They may also attach a photo of a nutrition label or of actual food.

Your job: identify every food item, estimate quantity if not specified, and calculate calories and macronutrients for each.

Rules:
- If a photo of a nutrition LABEL is attached, extract per-100g values and also return them in the "per100" field. The user may specify a quantity in their text — if so, scale accordingly.
- If a photo of FOOD is attached, identify visible components and estimate portions.
- If no photo, estimate from the text description alone.
- If quantities are missing, assume a typical single serving.
- Always break down into individual components.

Respond ONLY with a JSON object — no markdown, no explanation:
{"items":[{"name":"...","quantity":0,"unit":"g","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0}],"notes":"any assumptions or info","per100":null}

If it's a nutrition label, also include:
{"items":[...],"notes":"...","per100":{"productName":"...","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"servingSize":"..."}}`

async function getApiKey(): Promise<string> {
  const apiKey = await getSetting('anthropic_api_key')
  if (!apiKey)
    throw new Error('API key not set. Go to Settings to add your Anthropic API key.')
  return apiKey
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callAnthropicAPI(systemPrompt: string, content: any): Promise<string> {
  const apiKey = await getApiKey()
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
      messages: [{ role: 'user', content }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API error (${response.status}): ${err}`)
  }

  const data = await response.json()
  return data.content[0].text
}

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  return callAnthropicAPI(systemPrompt, userMessage)
}

function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Could not parse AI response. Please try again.')
  return match[0]
}

export interface EstimationResult {
  items: FoodItem[]
  notes?: string
  per100?: {
    productName: string
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    servingSize: string
  }
}

export async function estimate(
  text: string,
  image?: { base64: string; mediaType: string },
): Promise<EstimationResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = []
  if (image) {
    content.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } })
  }
  content.push({ type: 'text', text: text || 'Analyze this food.' })

  const raw = await callAnthropicAPI(UNIFIED_PROMPT, content)
  const json = JSON.parse(extractJSON(raw))
  return {
    items: (json.items ?? []).map((item: FoodItem) => ({
      ...item,
      calories: Math.round(item.calories),
      protein: Math.round(item.protein * 10) / 10,
      carbs: Math.round(item.carbs * 10) / 10,
      fat: Math.round(item.fat * 10) / 10,
      fiber: Math.round(item.fiber * 10) / 10,
      edited: false,
    })),
    notes: json.notes,
    per100: json.per100 ? {
      productName: json.per100.productName || 'Unknown product',
      calories: Math.round(json.per100.calories),
      protein: Math.round(json.per100.protein * 10) / 10,
      carbs: Math.round(json.per100.carbs * 10) / 10,
      fat: Math.round(json.per100.fat * 10) / 10,
      fiber: Math.round(json.per100.fiber * 10) / 10,
      servingSize: json.per100.servingSize || '',
    } : undefined,
  }
}

// Legacy wrappers for components that still use old API
export interface LabelScanResult {
  productName: string
  per100: { calories: number; protein: number; carbs: number; fat: number; fiber: number }
  servingSize: string
  notes: string
}

export async function estimateNutrition(input: string, _mode: InputMode): Promise<EstimationResult> {
  return estimate(input)
}

export async function estimateFromImage(base64: string, mediaType: string): Promise<EstimationResult> {
  return estimate('What food is this? Estimate nutrition.', { base64, mediaType })
}

export async function scanLabel(base64: string, mediaType: string): Promise<LabelScanResult> {
  const result = await estimate('Extract nutrition from this food label.', { base64, mediaType })
  if (result.per100) {
    return {
      productName: result.per100.productName,
      per100: result.per100,
      servingSize: result.per100.servingSize,
      notes: result.notes || '',
    }
  }
  // Fallback if AI didn't return per100
  const first = result.items[0]
  return {
    productName: first?.name || 'Unknown',
    per100: { calories: first?.calories ?? 0, protein: first?.protein ?? 0, carbs: first?.carbs ?? 0, fat: first?.fat ?? 0, fiber: first?.fiber ?? 0 },
    servingSize: '',
    notes: result.notes || '',
  }
}

export async function estimateWeeklyMicronutrients(
  items: FoodItem[],
  days: number,
): Promise<{ nutrients: MicronutrientEntry[]; summary: string }> {
  const systemPrompt = `You are a nutrition analyst. Estimate average daily micronutrient intake from the food data and compare to Livsmedelverket (Swedish Food Agency) recommended values for adult men:
Vitamin A: 900 µg RE, Vitamin D: 10 µg, Vitamin E: 10 mg, Vitamin C: 75 mg,
Thiamine B1: 1.4 mg, Riboflavin B2: 1.7 mg, Niacin B3: 19 mg NE, B6: 1.6 mg,
Folate: 300 µg, B12: 2 µg, Calcium: 800 mg, Iron: 9 mg, Zinc: 9 mg,
Selenium: 60 µg, Iodine: 150 µg, Magnesium: 350 mg, Potassium: 3500 mg,
Fiber: 25-35 g, Sodium: <2400 mg, Omega-3 EPA+DHA: 250 mg.
Respond ONLY with a JSON object — no markdown, no explanation:
{"nutrients":[{"name":"...","avgDaily":0,"recommended":0,"unit":"...","status":"good|low|high"}],"summary":"Brief overall assessment"}`

  const userMessage = `Food intake over ${days} day(s):\n${JSON.stringify(items)}`
  const raw = await callClaude(systemPrompt, userMessage)
  return JSON.parse(extractJSON(raw))
}
