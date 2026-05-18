export interface GeminiGenerateOptions {
  systemInstruction: string;
  prompt: string;
  temperature?: number;
  responseMimeType?: "application/json" | "text/plain";
}

export class GeminiService {
  private readonly apiKey = process.env.GEMINI_API_KEY;
  private readonly model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  private readonly baseUrl = process.env.GEMINI_API_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta";

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async generateText(options: GeminiGenerateOptions): Promise<string> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const response = await fetch(`${this.baseUrl}/models/${this.model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: options.systemInstruction }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: options.prompt }]
          }
        ],
        generationConfig: {
          temperature: options.temperature ?? 0.2,
          ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {})
        }
      })
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(body?.error?.message ?? `Gemini request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return text;
  }

  async generateJson<T>(options: GeminiGenerateOptions): Promise<T> {
    const text = await this.generateText({
      ...options,
      responseMimeType: "application/json",
      prompt: `${options.prompt}\n\nReturn only valid JSON. Do not wrap it in markdown.`
    });
    return JSON.parse(extractJson(text)) as T;
  }
}

function extractJson(text: string): string {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}
