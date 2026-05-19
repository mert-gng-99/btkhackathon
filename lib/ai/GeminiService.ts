export interface GeminiGenerateOptions {
  systemInstruction: string;
  prompt: string;
  temperature?: number;
  responseMimeType?: "application/json" | "text/plain";
}

export interface GeminiToolDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface GeminiToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface GeminiToolResult {
  finalText: string;
  trace: Array<{ tool: string; input: unknown; outputSummary: string }>;
}

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: unknown };
}

interface GeminiContent {
  role: "user" | "model" | "function";
  parts: GeminiPart[];
}

export class GeminiService {
  private readonly apiKey = process.env.GEMINI_API_KEY;
  private readonly model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  private readonly baseUrl = process.env.GEMINI_API_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta";

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  // Retry on 429 (rate limit) and 5xx with short backoff. Gemini sometimes
  // suggests a retryDelay in the error body; we honor it up to 4s.
  private async fetchWithBackoff(url: string, init: RequestInit, attempt = 0): Promise<Response> {
    const response = await fetch(url, init);
    if (response.ok) return response;
    if (attempt >= 2) return response;
    if (response.status !== 429 && response.status < 500) return response;

    let waitMs = 800 * Math.pow(2, attempt);
    if (response.status === 429) {
      try {
        const cloned = response.clone();
        const body = (await cloned.json()) as {
          error?: { details?: Array<{ "@type"?: string; retryDelay?: string }> };
        };
        const detail = body.error?.details?.find((d) => d.retryDelay);
        if (detail?.retryDelay) {
          const seconds = parseFloat(detail.retryDelay.replace("s", ""));
          if (Number.isFinite(seconds) && seconds > 0) {
            waitMs = Math.min(seconds * 1000, 4000);
          }
        }
      } catch {
        // ignore parse errors, use default backoff
      }
    }

    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return this.fetchWithBackoff(url, init, attempt + 1);
  }

  async generateText(options: GeminiGenerateOptions): Promise<string> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const response = await this.fetchWithBackoff(`${this.baseUrl}/models/${this.model}:generateContent`, {
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
      const status = response.status;
      const baseMsg = body?.error?.message ?? `Gemini request failed with status ${status}`;
      if (status === 429) {
        throw new Error(`Gemini API günlük free tier istek limitine yaklaştı, biraz bekleyip tekrar deneyin. (${baseMsg})`);
      }
      throw new Error(baseMsg);
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

  async generateWithTools(opts: {
    systemInstruction: string;
    prompt: string;
    tools: GeminiToolDeclaration[];
    executor: (call: GeminiToolCall) => Promise<unknown>;
    summarize?: (call: GeminiToolCall, output: unknown) => string;
    maxRounds?: number;
    temperature?: number;
  }): Promise<GeminiToolResult> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const maxRounds = opts.maxRounds ?? 4;
    const trace: Array<{ tool: string; input: unknown; outputSummary: string }> = [];

    const contents: GeminiContent[] = [
      { role: "user", parts: [{ text: opts.prompt }] }
    ];

    for (let round = 0; round < maxRounds; round += 1) {
      const response = await this.fetchWithBackoff(`${this.baseUrl}/models/${this.model}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: opts.systemInstruction }] },
          contents,
          tools: [{ functionDeclarations: opts.tools }],
          generationConfig: {
            temperature: opts.temperature ?? 0.15
          }
        })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        const status = response.status;
        const baseMsg = body?.error?.message ?? `Gemini tool request failed with status ${status}`;
        if (status === 429) {
          throw new Error(`Gemini API rate limit (${baseMsg})`);
        }
        throw new Error(baseMsg);
      }

      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { role?: string; parts?: GeminiPart[] } }>;
      };

      const candidate = payload.candidates?.[0];
      const parts: GeminiPart[] = candidate?.content?.parts ?? [];
      if (parts.length === 0) {
        return { finalText: "", trace };
      }

      contents.push({ role: "model", parts });

      const functionCallPart = parts.find((p) => p.functionCall);
      if (!functionCallPart || !functionCallPart.functionCall) {
        const finalText = parts
          .map((part) => part.text ?? "")
          .join("")
          .trim();
        return { finalText, trace };
      }

      const call: GeminiToolCall = {
        name: functionCallPart.functionCall.name,
        args: functionCallPart.functionCall.args ?? {}
      };

      let output: unknown;
      try {
        output = await opts.executor(call);
      } catch (executorError) {
        output = { error: executorError instanceof Error ? executorError.message : "tool execution failed" };
      }

      const summary = opts.summarize ? opts.summarize(call, output) : defaultSummary(call, output);
      trace.push({ tool: call.name, input: call.args, outputSummary: summary });

      contents.push({
        role: "function",
        parts: [{ functionResponse: { name: call.name, response: output as Record<string, unknown> } }]
      });
    }

    return { finalText: "", trace };
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

function defaultSummary(call: GeminiToolCall, output: unknown): string {
  try {
    const json = JSON.stringify(output);
    const truncated = json.length > 240 ? `${json.slice(0, 240)}…` : json;
    return `${call.name}(${JSON.stringify(call.args)}) → ${truncated}`;
  } catch {
    return `${call.name} → [unserializable output]`;
  }
}
