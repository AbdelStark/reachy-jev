import { probability } from "./policy.js";

export interface PoseTarget { yawDeg: number; pitchDeg: number; rollDeg: number; zMm: number; rightAntennaDeg: number; leftAntennaDeg: number }
const neutral: PoseTarget = { yawDeg: 0, pitchDeg: 0, rollDeg: 0, zMm: 0, rightAntennaDeg: 0, leftAntennaDeg: 0 };
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
export function attend(bearingDeg: number): PoseTarget {
  if (!Number.isFinite(bearingDeg)) throw new RangeError("bearing must be finite");
  return { ...neutral, yawDeg: clamp(bearingDeg, -45, 45), pitchDeg: -5, zMm: 3 };
}
export function suspicion(p: number): PoseTarget {
  probability(p);
  return { ...neutral, yawDeg: 10 * p, rollDeg: 15 * p, zMm: -8 * p, rightAntennaDeg: -35 * p, leftAntennaDeg: -35 * p };
}
export function engaged(level: number): PoseTarget {
  if (!Number.isFinite(level) || level < 0 || level > 4) throw new RangeError("engagement level must be in [0,4]");
  return { ...neutral, pitchDeg: -2 * level, zMm: 2.5 * level, rightAntennaDeg: 7.5 * level, leftAntennaDeg: 7.5 * level };
}
export function droop(): PoseTarget { return { ...neutral, pitchDeg: 8, zMm: -6, rightAntennaDeg: -30, leftAntennaDeg: -30 }; }
export function refuse(): PoseTarget[] { return [-12, 12, -12, 12, 0].map((yawDeg) => ({ ...neutral, yawDeg, rightAntennaDeg: 20 })); }
export function coinFlip(): PoseTarget[] { return [1, -1, 1, -1, 0].map((sign) => ({ ...neutral, rollDeg: 10 * sign, rightAntennaDeg: 20 * sign, leftAntennaDeg: -20 * sign })); }
