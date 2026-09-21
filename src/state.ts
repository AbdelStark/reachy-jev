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
}
export interface RoomObservation {
  people?: PersonObservation[];
  sound?: { loudestBearingDeg?: number; levelDbfs?: number; voiceDetected?: boolean };
  transcriptRecent?: { who: string; text: string }[];
  robot?: { currentlySpeaking?: boolean; lookingAt?: string; secondsSinceOwnLastTurn?: number };
}

function finite(value: number | undefined): value is number { return value !== undefined && Number.isFinite(value); }
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
  const people = (input.people ?? []).map((p) => {
    if (!/^p[1-9]\d*$/.test(p.id)) throw new TypeError("person IDs must be session-local pN identifiers");
    return {
      id: p.id,
      ...(finite(p.bearingDeg) ? { bearing: bearing(p.bearingDeg) } : {}),
      ...(finite(p.faceHeightFraction) ? { distance: distance(p.faceHeightFraction) } : {}),
      ...(finite(p.faceYawDeg) ? { facing_robot: Math.abs(p.faceYawDeg) < 20 } : {}),
      ...(p.lookingAtRobot === undefined ? {} : { looking_at_robot: p.lookingAtRobot }),
      ...(p.speaking === undefined ? {} : { speaking: p.speaking }),
      ...(finite(p.secondsSinceLastSpoke) ? { seconds_since_last_spoke: elapsed(p.secondsSinceLastSpoke) } : {}),
    };
  });
  const sound = input.sound && {
    ...(finite(input.sound.loudestBearingDeg) ? { loudest_bearing: bearing(input.sound.loudestBearingDeg) } : {}),
    ...(finite(input.sound.levelDbfs) ? { level: soundLevel(input.sound.levelDbfs) } : {}),
    ...(input.sound.voiceDetected === undefined ? {} : { voice_detected: input.sound.voiceDetected }),
  };
  const robot = input.robot && {
    ...(input.robot.currentlySpeaking === undefined ? {} : { currently_speaking: input.robot.currentlySpeaking }),
    ...(input.robot.lookingAt === undefined ? {} : { looking_at: input.robot.lookingAt }),
    ...(finite(input.robot.secondsSinceOwnLastTurn) ? { seconds_since_own_last_turn: elapsed(input.robot.secondsSinceOwnLastTurn) } : {}),
  };
  return {
    people,
    ...(sound && Object.keys(sound).length ? { sound } : {}),
    ...(input.transcriptRecent?.length ? { transcript_recent: input.transcriptRecent.slice(-4).map(({ who, text }) => ({ who, text: text.slice(0, 200) })) } : {}),
    ...(robot && Object.keys(robot).length ? { robot } : {}),
  };
}
