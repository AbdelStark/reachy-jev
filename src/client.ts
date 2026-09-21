export interface JevAnswer { type?: "noul" | "choice" | "score"; noul?: number; choice?: string; score?: number; confidence?: number; probabilities?: Record<string, number> }
export interface JevResponse { answers: Record<string, JevAnswer>; model?: string; usage?: { input_tokens?: number; output_tokens?: number } }
export interface JevResult extends JevResponse { stale: boolean; skipped: boolean; latencyMs: number }
export interface JevClientOptions {
  ask: (state: unknown, questions: unknown) => Promise<JevResponse>;
  maxAgeMs?: number;
  retryDelayMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  isTransient?: (error: unknown) => boolean;
}
const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
function defaultTransient(error: unknown): boolean {
  const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : NaN;
  return status === 408 || status === 429 || status >= 500 || (error instanceof Error && /timeout|network|fetch failed/i.test(error.message));
}
export class JevClient {
  private previous: { key: string; response: JevResponse; at: number } | undefined;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly maxAgeMs: number;
  private readonly retryDelayMs: number;
  private readonly isTransient: (error: unknown) => boolean;
  constructor(private readonly options: JevClientOptions) {
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? defaultSleep;
    this.maxAgeMs = options.maxAgeMs ?? 1000;
    this.retryDelayMs = options.retryDelayMs ?? 200;
    this.isTransient = options.isTransient ?? defaultTransient;
    if (!Number.isFinite(this.maxAgeMs) || this.maxAgeMs < 0 || !Number.isFinite(this.retryDelayMs) || this.retryDelayMs < 0) throw new RangeError("invalid timing options");
  }
  async ask(state: unknown, questions: unknown): Promise<JevResult> {
    const key = stable([state, questions]);
    const start = this.now();
    if (this.previous?.key === key && start - this.previous.at < this.maxAgeMs && start >= this.previous.at) {
      return { ...this.previous.response, stale: false, skipped: true, latencyMs: 0 };
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await this.options.ask(state, questions);
        if (!response || !response.answers || typeof response.answers !== "object") throw new TypeError("invalid Jev response");
        this.previous = { key, response, at: this.now() };
        return { ...response, stale: false, skipped: false, latencyMs: this.now() - start };
      } catch (error) {
        if (!this.isTransient(error)) throw error;
        if (attempt === 0) await this.sleep(this.retryDelayMs);
        else if (this.previous) return { ...this.previous.response, stale: true, skipped: false, latencyMs: this.now() - start };
        else throw error;
      }
    }
    throw new Error("unreachable");
  }
  clear(): void { this.previous = undefined; }
}
