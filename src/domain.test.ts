import { describe, it, expect } from "vitest";
import {
  samples,
  normalise,
  removeProblem,
  removeHold,
  validateData,
} from "./domain";
describe("planner domain", () => {
  it("has valid representative projects with a linked sequence", () => {
    expect(() => validateData(samples())).not.toThrow();
  });
  it("clamps coordinates at photo boundaries", () => {
    expect(normalise(-0.4)).toBe(0);
    expect(normalise(1.2)).toBe(1);
    expect(normalise(0.75)).toBe(0.75);
  });
  it("removes hold references from every plan", () => {
    const d = samples();
    d.sequences.push({ ...d.sequences[0], id: "s2" });
    const next = removeHold(d, "h1");
    expect(next.holds.some((h) => h.id === "h1")).toBe(false);
    expect(
      next.sequences.every((s) => s.moves.every((m) => m.holdId !== "h1")),
    ).toBe(true);
    expect(d.holds).toHaveLength(4);
  });
  it("cascades project removal without affecting other projects", () => {
    const next = removeProblem(samples(), "p1");
    expect(next.problems).toHaveLength(2);
    expect(next.holds).toEqual([]);
    expect(next.sequences).toEqual([]);
  });
  it("rejects unknown schema versions and broken references", () => {
    expect(() => validateData({ ...samples(), schemaVersion: 2 })).toThrow(
      "version",
    );
    const d = samples();
    d.holds[0].x = 2;
    expect(() => validateData(d)).toThrow("hold");
    const n = samples();
    n.sequences[0].moves[0].holdId = "missing";
    expect(() => validateData(n)).toThrow("sequence");
  });
  it("rejects duplicate IDs", () => {
    const d = samples();
    d.problems[1].id = "p1";
    expect(() => validateData(d)).toThrow("duplicate");
  });
});
