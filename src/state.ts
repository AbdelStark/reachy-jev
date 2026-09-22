export type Bearing = "far left" | "left" | "slightly left" | "center" | "slightly right" | "right" | "far right";
export type Distance = "very near" | "near" | "medium" | "far";
export type Elapsed = "just now" | "a few seconds" | "about 10 seconds" | "about half a minute" | "about a minute" | "over a minute";

export interface PersonObservation {
  id: string;
  bearingDeg?: number;
  faceHeightFraction?: number;
  faceYawDeg?: number;
  lookingAtRobot?: boolean;
  speaking?: boolean;
  secondsSinceLastSpoke?: number;
  neverSpoke?: boolean;
  moving?: "still" | "shifting" | "walking";
}
export interface RoomObservation {
  people?: PersonObservation[];
  sound?: { loudestBearingDeg?: number; levelDbfs?: number; voiceDetected?: boolean };
  transcriptRecent?: { who: string; text: string; endedSecondsAgo?: number }[];
  robot?: { currentlySpeaking?: boolean; lookingAt?: string; secondsSinceOwnLastTurn?: number; posture?: "idle" | "attending" | "nodding" | "drooping" };
}

function finite(value: number | undefined): value is number { return value !== undefined && Number.isFinite(value); }
function present<T>(value: T | null | undefined): value is T { return value !== undefined && value !== null; }
function record(value: unknown): boolean { return value !== null && typeof value === "object" && !Array.isArray(value); }
function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (!present(value)) return undefined;
  if (typeof value !== "boolean") throw new TypeError(`${field} must be boolean`);
  return value;
}
function optionalChoice<T extends string>(value: unknown, choices: readonly T[], field: string): T | undefined {
  if (!present(value)) return undefined;
  if (typeof value !== "string" || !choices.includes(value as T)) throw new TypeError(`invalid ${field}`);
  return value as T;
}
function optionalPersonTarget(value: unknown): string | undefined {
  if (!present(value)) return undefined;
  if (typeof value !== "string" || (value !== "none" && !/^p[1-9]$/.test(value))) throw new TypeError("invalid robot.lookingAt");
  return value;
}
function boundedTranscript(value: unknown): string {
  if (typeof value !== "string") throw new TypeError("transcript text must be string");
  let text = "";
  let units = 0;
  for (const scalar of value) {
    const codePoint = scalar.codePointAt(0)!;
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) throw new TypeError("invalid transcript Unicode");
    if (units + scalar.length > 200) break;
    text += scalar;
    units += scalar.length;
  }
  return text;
}
export function bearing(degrees: number): Bearing {
  if (!Number.isFinite(degrees)) throw new RangeError("bearing must be finite");
  if (degrees < -60) return "far left";
  if (degrees < -25) return "left";
  if (degrees < -8) return "slightly left";
  if (degrees <= 8) return "center";
  if (degrees <= 25) return "slightly right";
  if (degrees <= 60) return "right";
  return "far right";
}
export function distance(fraction: number): Distance {
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) throw new RangeError("face height fraction must be in [0,1]");
  return fraction > 0.35 ? "very near" : fraction >= 0.20 ? "near" : fraction >= 0.10 ? "medium" : "far";
}
export function elapsed(seconds: number): Elapsed {
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError("elapsed seconds must be non-negative");
  return seconds < 2 ? "just now" : seconds < 10 ? "a few seconds" : seconds < 20 ? "about 10 seconds" : seconds < 45 ? "about half a minute" : seconds < 90 ? "about a minute" : "over a minute";
}
export function soundLevel(dbfs: number): "silent" | "quiet" | "conversational" | "loud" {
  if (!Number.isFinite(dbfs) || dbfs > 0) throw new RangeError("dBFS must be finite and <= 0");
  return dbfs < -55 ? "silent" : dbfs < -35 ? "quiet" : dbfs < -15 ? "conversational" : "loud";
}
export function buildRoomState(input: RoomObservation) {
  if (!record(input) || (present(input.people) && !Array.isArray(input.people))
    || (present(input.sound) && !record(input.sound))
    || (present(input.robot) && !record(input.robot))
    || (present(input.transcriptRecent) && !Array.isArray(input.transcriptRecent))) throw new TypeError("invalid room observation shape");
  const personIds = new Set<string>();
  const people = (input.people ?? []).map((p) => {
    if (!record(p)) throw new TypeError("invalid person observation");
    const personId = p.id;
    if (typeof personId !== "string" || !/^p[1-9]$/.test(personId)) throw new TypeError("person IDs must be session-local p1..p9 identifiers");
    if (personIds.has(personId)) throw new TypeError("duplicate person ID");
    personIds.add(personId);
    const neverSpoke = optionalBoolean(p.neverSpoke, "person.neverSpoke");
    if (neverSpoke && present(p.secondsSinceLastSpoke)) throw new TypeError("neverSpoke conflicts with secondsSinceLastSpoke");
    const lookingAtRobot = optionalBoolean(p.lookingAtRobot, "person.lookingAtRobot");
    const speaking = optionalBoolean(p.speaking, "person.speaking");
    const moving = optionalChoice(p.moving, ["still", "shifting", "walking"], "person.moving");
    return {
      id: personId,
      ...(finite(p.bearingDeg) ? { bearing: bearing(p.bearingDeg) } : {}),
      ...(finite(p.faceHeightFraction) ? { distance: distance(p.faceHeightFraction) } : {}),
      ...(finite(p.faceYawDeg) ? { facing_robot: Math.abs(p.faceYawDeg) < 20 } : {}),
      ...(present(lookingAtRobot) ? { looking_at_robot: lookingAtRobot } : {}),
      ...(present(speaking) ? { speaking } : {}),
      ...(neverSpoke ? { seconds_since_last_spoke: "never" } : finite(p.secondsSinceLastSpoke) ? { seconds_since_last_spoke: elapsed(p.secondsSinceLastSpoke) } : {}),
      ...(present(moving) ? { moving } : {}),
    };
  });
  const voiceDetected = input.sound && optionalBoolean(input.sound.voiceDetected, "sound.voiceDetected");
  const sound = input.sound && {
    ...(finite(input.sound.loudestBearingDeg) ? { loudest_bearing: bearing(input.sound.loudestBearingDeg) } : {}),
    ...(finite(input.sound.levelDbfs) ? { level: soundLevel(input.sound.levelDbfs) } : {}),
    ...(present(voiceDetected) ? { voice_detected: voiceDetected } : {}),
  };
  const currentlySpeaking = input.robot && optionalBoolean(input.robot.currentlySpeaking, "robot.currentlySpeaking");
  const lookingAt = input.robot && optionalPersonTarget(input.robot.lookingAt);
  const posture = input.robot && optionalChoice(input.robot.posture, ["idle", "attending", "nodding", "drooping"], "robot.posture");
  const robot = input.robot && {
    ...(present(currentlySpeaking) ? { currently_speaking: currentlySpeaking } : {}),
    ...(present(lookingAt) ? { looking_at: lookingAt } : {}),
    ...(finite(input.robot.secondsSinceOwnLastTurn) ? { seconds_since_own_last_turn: elapsed(input.robot.secondsSinceOwnLastTurn) } : {}),
    ...(present(posture) ? { posture } : {}),
  };
  const latestBySpeaker = new Map<string, number>();
  if ((input.transcriptRecent ?? []).some((entry) => !record(entry))) throw new TypeError("invalid transcript observation");
  const transcript = [...(input.transcriptRecent ?? [])].reverse().filter(({ who }) => typeof who === "string" && (who === "unknown" || /^p[1-9]$/.test(who))).filter(({ who }) => {
    const count = latestBySpeaker.get(who) ?? 0;
    latestBySpeaker.set(who, count + 1);
    return count < 2;
  }).slice(0, 4).reverse().map(({ who, text, endedSecondsAgo }) => ({ who, text: boundedTranscript(text), ...(finite(endedSecondsAgo) ? { ended: elapsed(endedSecondsAgo) } : {}) }));
  return {
    schema: "room_state@1",
    people,
    ...(sound && Object.keys(sound).length ? { sound } : {}),
    ...(transcript.length ? { transcript_recent: transcript } : {}),
    ...(robot && Object.keys(robot).length ? { robot } : {}),
  };
}
