// =============================================================================
// services/receiptService.js — Receipt scanning via Gemini 2.5 Flash
// Accepts a base64 image, returns structured expense data
// =============================================================================

import { config } from '../config/index.js';

const GEMINI_API = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.GEMINI_API_KEY}`;

const PROMPT = `You are a receipt parser. Extract the following from this receipt image and return ONLY valid JSON — no markdown, no explanation.

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
      }
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Gemini API error: ${err.error?.message || response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');

  // Strip any accidental markdown code fences
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  const parsed = JSON.parse(clean);
  if (parsed.error) throw new Error(parsed.error);

  return parsed;
};
