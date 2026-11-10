import "fake-indexeddb/auto";
import { beforeEach, describe, it, expect } from "vitest";
import { openDB } from "idb";
import {
  load,
  save,
  putPhoto,
  getPhoto,
  deletePhoto,
  importBackup,
} from "./storage";
import { samples } from "./domain";
beforeEach(async () => {
  const db = await openDB("routelab", 1, {
    upgrade(db) {
      db.createObjectStore("state");
      db.createObjectStore("media");
    },
  });
  await db.clear("state");
  await db.clear("media");
  db.close();
});
describe("IndexedDB storage", () => {
  it("seeds once and persists changes", async () => {
    const d = await load();
    d.problems[0].name = "Updated";
    await save(d);
    expect((await load()).problems[0].name).toBe("Updated");
  });
  it("stores original media and deletes it", async () => {
    await putPhoto("photo", new Blob(["test"], { type: "image/jpeg" }));
    expect((await getPhoto("photo"))?.size).toBe(4);
    await deletePhoto("photo");
    expect(await getPhoto("photo")).toBeUndefined();
  });
  it("enforces photo type and size constraints", async () => {
    await expect(
      putPhoto("x", new Blob(["x"], { type: "video/mp4" })),
    ).rejects.toThrow("JPEG");
    await expect(
      putPhoto(
        "x",
        new Blob([new Uint8Array(13 * 1024 * 1024)], { type: "image/png" }),
      ),
    ).rejects.toThrow("12 MB");
  });
  it("restores metadata and embedded media together", async () => {
    const d = samples();
    d.problems[0].photoId = "img";
    d.problems[0].samplePhoto = undefined;
    const raw = { data: d, media: { img: "data:image/png;base64,dGVzdA==" } };
    const file = { size: 100, text: async () => JSON.stringify(raw) } as File;
    await importBackup(file);
    expect((await load()).problems[0].photoId).toBe("img");
    expect((await getPhoto("img"))?.type).toBe("image/png");
  });
  it("keeps the existing library if an import is invalid", async () => {
    await save(samples());
    const file = {
      size: 20,
      text: async () =>
        JSON.stringify({ data: { schemaVersion: 99 }, media: {} }),
    } as File;
    await expect(importBackup(file)).rejects.toThrow();
    expect((await load()).problems).toHaveLength(3);
  });
});
