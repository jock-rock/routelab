export const SCHEMA_VERSION = 1;
export type Status = "Projecting" | "Sent" | "To try";
export interface Problem {
  id: string;
  name: string;
  gym: string;
  grade: string;
  wallStyle: string;
  date: string;
  status: Status;
  photoId?: string;
  samplePhoto?: string;
  notes: string;
  color: string;
}
export interface Hold {
  id: string;
  problemId: string;
  x: number;
  y: number;
  role: "Start" | "Hand" | "Foot" | "Finish";
  label: string;
}
export interface Move {
  id: string;
  holdId: string;
  limb: "LH" | "RH" | "LF" | "RF";
}
export interface Sequence {
  id: string;
  problemId: string;
  name: string;
  moves: Move[];
}
export interface ScanAsset {
  id: string;
  problemId: string;
  mediaId: string;
  format: "glb" | "gltf";
}
export interface Attempt {
  id: string;
  problemId: string;
  videoId: string;
  date: string;
}
export interface VideoBookmark {
  id: string;
  attemptId: string;
  timestamp: number;
  observation: string;
}
export interface Review {
  id: string;
  problemId: string;
  attemptId?: string;
  sequenceId?: string;
  fallReason: string;
  correction: string;
  outcome: string;
  categories: string[];
}
export interface Data {
  schemaVersion: 1;
  problems: Problem[];
  holds: Hold[];
  sequences: Sequence[];
  scanAssets: ScanAsset[];
  attempts: Attempt[];
  bookmarks: VideoBookmark[];
  reviews: Review[];
}
export const uid = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
export const normalise = (value: number) => Math.max(0, Math.min(1, value));
export function removeProblem(data: Data, id: string): Data {
  const attemptIds = data.attempts
    .filter((a) => a.problemId === id)
    .map((a) => a.id);
  return {
    ...data,
    problems: data.problems.filter((p) => p.id !== id),
    holds: data.holds.filter((p) => p.problemId !== id),
    sequences: data.sequences.filter((p) => p.problemId !== id),
    scanAssets: data.scanAssets.filter((p) => p.problemId !== id),
    attempts: data.attempts.filter((p) => p.problemId !== id),
    bookmarks: data.bookmarks.filter((b) => !attemptIds.includes(b.attemptId)),
    reviews: data.reviews.filter((p) => p.problemId !== id),
  };
}
export function removeHold(data: Data, id: string): Data {
  return {
    ...data,
    holds: data.holds.filter((h) => h.id !== id),
    sequences: data.sequences.map((s) => ({
      ...s,
      moves: s.moves.filter((m) => m.holdId !== id),
    })),
  };
}
export function validateData(v: unknown): asserts v is Data {
  if (!v || typeof v !== "object") throw Error("Invalid backup.");
  const d = v as Data;
  if (d.schemaVersion !== 1) throw Error("Unsupported backup version.");
  for (const key of [
    "problems",
    "holds",
    "sequences",
    "scanAssets",
    "attempts",
    "bookmarks",
    "reviews",
  ] as const)
    if (!Array.isArray(d[key])) throw Error("Incomplete backup.");
  const ids = new Set<string>();
  for (const collection of [
    d.problems,
    d.holds,
    d.sequences,
    d.scanAssets,
    d.attempts,
    d.bookmarks,
    d.reviews,
  ])
    for (const item of collection) {
      if (!item || typeof item.id !== "string" || ids.has(item.id))
        throw Error("Invalid or duplicate IDs.");
      ids.add(item.id);
    }
  for (const p of d.problems)
    if (
      typeof p.name !== "string" ||
      typeof p.notes !== "string" ||
      !["Projecting", "Sent", "To try"].includes(p.status) ||
      !["gym", "grade", "wallStyle", "date", "color"].every(
        (k) => typeof (p as unknown as Record<string, unknown>)[k] === "string",
      ) ||
      (p.samplePhoto && p.samplePhoto !== "climbing.jpg") ||
      (p.photoId !== undefined && typeof p.photoId !== "string") ||
      !/^\d{4}-\d{2}-\d{2}$/.test(p.date) ||
      !Number.isFinite(Date.parse(p.date))
    )
      throw Error("Invalid problem.");
  for (const h of d.holds)
    if (
      !d.problems.some((p) => p.id === h.problemId) ||
      !Number.isFinite(h.x) ||
      !Number.isFinite(h.y) ||
      h.x < 0 ||
      h.x > 1 ||
      h.y < 0 ||
      h.y > 1 ||
      !["Start", "Hand", "Foot", "Finish"].includes(h.role) ||
      typeof h.label !== "string"
    )
      throw Error("Invalid hold.");
  for (const s of d.sequences)
    if (
      typeof s.name !== "string" ||
      !d.problems.some((p) => p.id === s.problemId) ||
      !Array.isArray(s.moves) ||
      s.moves.some(
        (m) =>
          !d.holds.some(
            (h) => h.id === m.holdId && h.problemId === s.problemId,
          ) ||
          !["LH", "RH", "LF", "RF"].includes(m.limb) ||
          typeof m.id !== "string",
      )
    )
      throw Error("Invalid sequence.");
  if (
    d.scanAssets.length ||
    d.attempts.length ||
    d.bookmarks.length ||
    d.reviews.length
  )
    throw Error("This milestone only supports problem and planner backups.");
}
export function samples(): Data {
  return {
    schemaVersion: 1,
    problems: [
      {
        id: "p1",
        name: "The quiet feet project",
        gym: "Boulder House",
        grade: "V5",
        wallStyle: "Overhang",
        date: "2026-11-09",
        status: "Projecting",
        samplePhoto: "climbing.jpg",
        notes:
          "Find the balance before reaching. Keep the right foot engaged through the crux.",
        color: "#b6c9a0",
      },
      {
        id: "p2",
        name: "A little more balance",
        gym: "Boulder House",
        grade: "V4",
        wallStyle: "Slab",
        date: "2026-11-07",
        status: "To try",
        samplePhoto: "climbing.jpg",
        notes: "Trust the feet. Explore the high left foot before committing.",
        color: "#e2b8a3",
      },
      {
        id: "p3",
        name: "One move at a time",
        gym: "The Climbing Lab",
        grade: "V3",
        wallStyle: "Vertical",
        date: "2026-11-05",
        status: "Sent",
        samplePhoto: "climbing.jpg",
        notes: "Sent after slowing down the first three moves.",
        color: "#b5bdd9",
      },
    ],
    holds: [
      {
        id: "h1",
        problemId: "p1",
        x: 0.38,
        y: 0.77,
        role: "Start",
        label: "1",
      },
      { id: "h2", problemId: "p1", x: 0.57, y: 0.57, role: "Hand", label: "2" },
      { id: "h3", problemId: "p1", x: 0.34, y: 0.35, role: "Hand", label: "3" },
      {
        id: "h4",
        problemId: "p1",
        x: 0.6,
        y: 0.16,
        role: "Finish",
        label: "4",
      },
    ],
    sequences: [
      {
        id: "s1",
        problemId: "p1",
        name: "First read",
        moves: [
          { id: "m1", holdId: "h1", limb: "LH" },
          { id: "m2", holdId: "h2", limb: "RH" },
          { id: "m3", holdId: "h3", limb: "LH" },
          { id: "m4", holdId: "h4", limb: "RH" },
        ],
      },
    ],
    scanAssets: [],
    attempts: [],
    bookmarks: [],
    reviews: [],
  };
}
