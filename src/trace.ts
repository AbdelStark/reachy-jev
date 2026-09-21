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
/** Default export is payload-free metadata. Full records require explicit opt-in. */
export function traceLine(record: TraceRecord, options: { keepText?: boolean } = {}): string {
  if (options.keepText !== undefined && typeof options.keepText !== "boolean") throw new TypeError("keepText must be a boolean");
  if (!Number.isFinite(record.t) || record.t < 0 || !Number.isFinite(record.latency_ms) || record.latency_ms < 0
    || typeof record.skipped !== "boolean" || typeof record.stale !== "boolean") {
    throw new TypeError("invalid trace metadata");
  }
  if (options.keepText === true) return JSON.stringify(record) + "\n";
  return JSON.stringify({ schema: "reachy_jev.trace_meta@1", t: record.t, latency_ms: record.latency_ms, skipped: record.skipped, stale: record.stale }) + "\n";
}
