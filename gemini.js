/**
 * Module for interacting with Google Gemini API to parse receipts.
 * Supports automatic multi-model fallback and 5-stage progressive retry delays (1.5s, 2.5s, 5s, 7.5s, 10s) on 503/high-demand errors.
 */

const GEMINI_MODELS = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash"];
const RETRY_DELAYS = [1500, 2500, 5000, 7500, 10000];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Sends a receipt image to Gemini for OCR and structured JSON parsing.
 * 
 * @param {string} apiKey - Google Gemini API Key
 * @param {string} base64Data - Base64 encoded image data (without data:image/... prefix)
 * @param {string} mimeType - Image MIME type (e.g. "image/jpeg", "image/png")
 * @param {Function} [onRetryStatus] - Optional callback (attempt, maxAttempts, delayMs) for UI retry updates
 * @returns {Promise<Object>} The parsed receipt data in JSON format
 */
export async function analyzeReceipt(apiKey, base64Data, mimeType, onRetryStatus) {
  if (!apiKey) {
    throw new Error("API Key not provided. Please enter your API Key in settings.");
  }

  const prompt = `You are a professional receipt scanning system (OCR and analysis).
Analyze the receipt image and extract all text and financial information into structured JSON format.
Pay special attention to recognizing items, their quantity, unit price, and total cost. Determine the country where the receipt was issued and the corresponding currency.

Response must be strictly a JSON object with the following structure:
{
  "storeName": "Name of store or company (if present, else null)",
  "storeAddress": "Store address (if present, else null)",
  "country": "Country name determined from address, language, or other indicators on receipt (e.g. Ukraine, Poland, USA, Germany, etc.)",
  "currency": "Symbol or short designation of currency (e.g. UAH, PLN, $, €, £, etc.)",
  "date": "Receipt date in YYYY-MM-DD format (if present, else null)",
  "time": "Receipt time in HH:MM format (if present, else null)",
  "items": [
    {
      "name": "Item/service name (DO NOT include separate discount lines here)",
      "quantity": 1.5, // quantity (number, default 1)
      "price": 10.5, // unit price (number)
      "total": 15.75 // total item cost (number)
    }
  ],
  "discounts": [
    {
      "description": "Discount description (e.g. Discount -0.10, Coupon, Poupança Imediata, 5% Off, etc.)",
      "amount": -0.10, // discount amount (number, usually negative, e.g. -0.10 or -1.50)
      "appliedToItem": "Item name to which this discount is directly applied (CRITICAL: On receipts like Pingo Doce/Continente, a discount line like 'Poupança Imediata (1,00)' appears IMMEDIATELY AFTER the item it discounts. Set this to the exact 'name' of the item listed right BEFORE the discount line. Only set null for store-wide total coupons)."
    }
  ],
  "subtotal": 100.0, // subtotal before tax (number, or null)
  "tax": 20.0, // VAT or tax (number, or null)
  "tips": 0.0, // tips (number, or null)
  "total": 120.0, // final total due (number, required)
  "paymentMethod": "Payment method (e.g. Card, Cash, Apple Pay, or null)",
  "rawText": "Full original receipt text preserving line structure for readability"
}

Rules:
1. Do not add currency symbols to numeric values (total, price, quantity, amount, etc.). Numbers only.
2. Do not include discounts in the "items" array. All discounts/coupons must be exclusively in the "discounts" array.
3. CRITICAL POSITION RULE FOR DISCOUNTS: A discount line (like 'Poupança Imediata') almost always discounts the item listed IMMEDIATELY ABOVE IT on the receipt. Always set 'appliedToItem' to the exact name of the item listed right before the discount line in the receipt image.
4. If fields are missing on the receipt, set them to null (except total, try to find or calculate it).
5. The "rawText" field must contain the full OCR text of the receipt as it visually appears.
`;

  let lastError = null;

  for (const modelName of GEMINI_MODELS) {
    let attempt = 0;
    const maxRetries = RETRY_DELAYS.length;

    while (attempt <= maxRetries) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
        const response = await fetch(`${apiUrl}?key=${apiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1, // Low temperature for factual OCR precision
              responseSchema: {
                type: "OBJECT",
                properties: {
                  storeName: { type: "STRING" },
                  storeAddress: { type: "STRING" },
                  country: { type: "STRING" },
                  currency: { type: "STRING" },
                  date: { type: "STRING" },
                  time: { type: "STRING" },
                  items: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        name: { type: "STRING" },
                        quantity: { type: "NUMBER" },
                        price: { type: "NUMBER" },
                        total: { type: "NUMBER" }
                      },
                      required: ["name", "quantity", "price", "total"]
                    }
                  },
                  discounts: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        description: { type: "STRING" },
                        amount: { type: "NUMBER" },
                        appliedToItem: { type: "STRING" }
                      },
                      required: ["description", "amount"]
                    }
                  },
                  subtotal: { type: "NUMBER" },
                  tax: { type: "NUMBER" },
                  tips: { type: "NUMBER" },
                  total: { type: "NUMBER" },
                  paymentMethod: { type: "STRING" },
                  rawText: { type: "STRING" }
                },
                required: ["items", "total", "rawText"]
              }
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error?.message || `Server error (${response.status})`;
          
          const isOverloaded =
            response.status === 503 ||
            errorMessage.includes("503") ||
            errorMessage.includes("high demand") ||
            errorMessage.includes("UNAVAILABLE") ||
            errorMessage.includes("temporarily unavailable") ||
            errorMessage.includes("RESOURCE_EXHAUSTED");

          if (isOverloaded && attempt < maxRetries) {
            const delayMs = RETRY_DELAYS[attempt];
            console.warn(`Server busy (503). Retrying attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms...`);
            if (onRetryStatus) {
              onRetryStatus(attempt + 1, maxRetries, delayMs);
            }
            await sleep(delayMs);
            attempt++;
            continue;
          }

          if (errorMessage.includes("no longer available") || errorMessage.includes("not found") || response.status === 404) {
            lastError = new Error(errorMessage);
            console.warn(`Model ${modelName} unavailable, falling back to next model...`);
            break;
          }

          throw new Error(errorMessage);
        }

        const result = await response.json();
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
          throw new Error("AI returned no results.");
        }

        return JSON.parse(responseText.trim());
      } catch (error) {
        lastError = error;
        const errMessage = error.message || "";
        const isOverloaded =
          errMessage.includes("503") ||
          errMessage.includes("high demand") ||
          errMessage.includes("UNAVAILABLE") ||
          errMessage.includes("temporarily unavailable") ||
          errMessage.includes("RESOURCE_EXHAUSTED");

        if (isOverloaded && attempt < maxRetries) {
          const delayMs = RETRY_DELAYS[attempt];
          console.warn(`Server busy (503). Retrying attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms...`);
          if (onRetryStatus) {
            onRetryStatus(attempt + 1, maxRetries, delayMs);
          }
          await sleep(delayMs);
          attempt++;
          continue;
        }

        if (errMessage.includes("no longer available") || errMessage.includes("not found")) {
          break;
        }

        throw error;
      }
    }
  }

  throw lastError || new Error("Failed to parse receipt with available Gemini models.");
}
