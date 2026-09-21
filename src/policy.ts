export interface Band { no: number; yes: number }
export function probability(p: number): number {
  if (!Number.isFinite(p) || p < 0 || p > 1) throw new RangeError("probability must be in [0,1]");
  return p;
}
export function decide(p: number, band: Band): "no" | "uncertain" | "yes" {
  if (!Number.isFinite(band.no) || !Number.isFinite(band.yes) || band.no < 0 || band.no >= band.yes || band.yes > 1) throw new RangeError("invalid band");
  return probability(p) < band.no ? "no" : p > band.yes ? "yes" : "uncertain";
}
export class Hysteresis<T> {
  private candidate: T | undefined;
  private count = 0;
  private current: T | undefined;
  constructor(private readonly ticks: number) {
    if (!Number.isInteger(ticks) || ticks < 1) throw new RangeError("ticks must be a positive integer");
  }
  step(value: T): T | undefined {
    if (Object.is(value, this.candidate)) this.count++;
    else { this.candidate = value; this.count = 1; }
    if (this.count >= this.ticks) this.current = value;
    return this.current;
  }
  reset(): void { this.candidate = undefined; this.current = undefined; this.count = 0; }
}
export class Refractory {
  private last = -Infinity;
  constructor(private readonly windowMs: number) {
    if (!Number.isFinite(windowMs) || windowMs < 0) throw new RangeError("windowMs must be non-negative");
  }
  fire(nowMs: number): boolean {
    if (!Number.isFinite(nowMs) || nowMs < this.last) return false;
    if (nowMs - this.last < this.windowMs) return false;
    this.last = nowMs;
    return true;
  }
}
export function composite(values: Record<string, number>, weights: Record<string, number>): number {
  const keys = Object.keys(weights);
  if (!keys.length) throw new RangeError("weights required");
  const total = keys.reduce((sum, key) => {
    const weight = weights[key];
    if (weight === undefined || !Number.isFinite(weight) || weight < 0) throw new RangeError("invalid weight");
    if (values[key] === undefined) throw new TypeError(`missing value: ${key}`);
    return sum + weight;
  }, 0);
  if (total <= 0) throw new RangeError("positive total weight required");
  return Math.max(0, Math.min(1, keys.reduce((sum, key) => sum + probability(values[key]!) * weights[key]!, 0) / total));
}
export function gate<T>(choice: { choice: T; confidence: number }, minConfidence: number): T | null {
  probability(minConfidence);
  return probability(choice.confidence) >= minConfidence ? choice.choice : null;
}
