export interface TraceRecord {
  t: number;
  app: string;
  bank: string;
  model?: string;
  state: unknown;
  answers: unknown;
  latency_ms: number;
  action?: unknown;
  skipped: boolean;
  stale: boolean;
}
function stripText(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripText);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !["text", "untrusted_text", "transcript_recent", "statement", "statements", "args_summary", "user_request"].includes(key)).map(([key, item]) => [key, stripText(item)]));
  }
  return value;
}
/** Explicit opt-in is required to retain transcript/action text in an exported trace. */
export function traceLine(record: TraceRecord, options: { keepText?: boolean } = {}): string {
  return JSON.stringify(options.keepText ? record : stripText(record)) + "\n";
}
