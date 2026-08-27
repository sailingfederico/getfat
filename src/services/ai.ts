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

const PHOTO_PROMPTS = {
  label: `You are a nutrition data extractor. This image shows a food product's nutrition label and/or ingredients list.
Extract the nutritional values PER 100g (or per 100ml for liquids) as shown on the label. Always normalize to per-100g/100ml.
Try to identify the product name from the packaging.
Respond ONLY with a JSON object — no markdown, no explanation:
{"productName":"guessed product name","per100":{"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0},"servingSize":"e.g. 30g or 250ml if shown on label","notes":"any extra info"}`,

  meal: `You are a nutrition expert analyzing a photo of a meal (beta feature).
Identify each visible food component, estimate quantities from visual cues, then estimate calories and macros.
Be honest about uncertainty.
Respond ONLY with a JSON object — no markdown, no explanation:
{"items":[{"name":"...","quantity":0,"unit":"g","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0}],"notes":"Assumptions about portions"}`,
}

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
}

export async function estimateNutrition(
  input: string,
  mode: InputMode,
): Promise<EstimationResult> {
  const raw = await callClaude(PROMPTS[mode], input)
  const json = JSON.parse(extractJSON(raw))
  return parseEstimationResult(json)
}

function parseEstimationResult(json: { items: FoodItem[]; notes?: string }): EstimationResult {
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

export interface LabelScanResult {
  productName: string
  per100: { calories: number; protein: number; carbs: number; fat: number; fiber: number }
  servingSize: string
  notes: string
}

export async function scanLabel(
  base64: string,
  mediaType: string,
): Promise<LabelScanResult> {
  const content = [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
    { type: 'text', text: 'Extract nutrition from this label.' },
  ]
  const raw = await callAnthropicAPI(PHOTO_PROMPTS.label, content)
  const json = JSON.parse(extractJSON(raw))
  return {
    productName: json.productName || 'Unknown product',
    per100: {
      calories: Math.round(json.per100.calories),
      protein: Math.round(json.per100.protein * 10) / 10,
      carbs: Math.round(json.per100.carbs * 10) / 10,
      fat: Math.round(json.per100.fat * 10) / 10,
      fiber: Math.round(json.per100.fiber * 10) / 10,
    },
    servingSize: json.servingSize || '',
    notes: json.notes || '',
  }
}

export async function estimateFromImage(
  base64: string,
  mediaType: string,
): Promise<EstimationResult> {
  const content = [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
    { type: 'text', text: 'What food is this? Estimate nutrition.' },
  ]
  const raw = await callAnthropicAPI(PHOTO_PROMPTS.meal, content)
  return parseEstimationResult(JSON.parse(extractJSON(raw)))
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
