// =============================================================================
// services/receiptService.js — Receipt scanning via Gemini 2.5 Flash
// Accepts a base64 image, returns structured expense data
// =============================================================================

import { config } from '../config/index.js';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${config.GEMINI_API_KEY}`;

const PROMPT = `You are a receipt parser. Extract the following from this receipt image and return ONLY valid JSON — no markdown, no explanation, no code fences.

Return this exact structure:
{
  "merchant": "store or restaurant name",
  "total": 12.50,
  "currency": "USD",
  "date": "2024-01-15",
  "category": "food|transport|shopping|entertainment|utilities|other",
  "items": [
    { "name": "item name", "amount": 5.00 }
  ],
  "confidence": 0.95
}

Rules:
- total must be a number (no currency symbols)
- date in YYYY-MM-DD format, or null if not visible
- currency as 3-letter ISO code, guess from context if needed
- confidence between 0 and 1
- items array can be empty if items aren't itemized
- If you cannot read the receipt, return { "error": "Cannot read receipt" }`;

export const scanReceipt = async (base64Image, mimeType = 'image/jpeg') => {
  if (!config.GEMINI_API_KEY) {
    throw new Error('Receipt scanning is not configured. Please contact support.');
  }

  const response = await fetch(GEMINI_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: base64Image } }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `HTTP ${response.status}`;
    console.error('[Gemini] API error:', msg);
    throw new Error(`Receipt scanning failed: ${msg}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Could not read receipt. Please try a clearer photo.');

  // Strip any accidental markdown code fences Gemini might add
  const clean = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    console.error('[Gemini] Failed to parse response as JSON:', clean.slice(0, 200));
    throw new Error('Could not parse receipt data. Please try a clearer photo.');
  }

  if (parsed.error) throw new Error(parsed.error);

  // Sanitize and validate the parsed result
  return {
    merchant:   typeof parsed.merchant === 'string' ? parsed.merchant.slice(0, 200) : null,
    total:      typeof parsed.total === 'number' && parsed.total > 0 ? +parsed.total.toFixed(2) : null,
    currency:   typeof parsed.currency === 'string' && /^[A-Z]{3}$/.test(parsed.currency) ? parsed.currency : 'USD',
    date:       typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null,
    category:   ['food','transport','shopping','entertainment','utilities','other'].includes(parsed.category)
                  ? parsed.category : 'general',
    items:      Array.isArray(parsed.items)
                  ? parsed.items.slice(0, 20).map(item => ({
                      name:   typeof item.name === 'string' ? item.name.slice(0, 100) : '',
                      amount: typeof item.amount === 'number' ? +item.amount.toFixed(2) : 0,
                    }))
                  : [],
    confidence: typeof parsed.confidence === 'number'
                  ? Math.max(0, Math.min(1, parsed.confidence))
                  : 0.5,
  };
};
