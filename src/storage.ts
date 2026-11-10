import { openDB } from "idb";
import { type Data, samples, validateData } from "./domain";
const db = () =>
  openDB("routelab", 1, {
    upgrade(db) {
      db.createObjectStore("state");
      db.createObjectStore("media");
    },
  });
export async function load(): Promise<Data> {
  const d = await db();
  const state = await d.get("state", "data");
  if (state) {
    validateData(state);
    return state;
  }
  const seed = samples();
  await d.put("state", seed, "data");
  return seed;
}
export async function save(data: Data) {
  await (await db()).put("state", data, "data");
}
export async function putPhoto(id: string, file: Blob) {
  if (file.size > 12 * 1024 * 1024)
    throw Error("Choose a photo smaller than 12 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error(
      "Use a JPEG, PNG, or WebP photo. Export HEIC photos as JPEG first.",
    );
  await (await db()).put("media", file, id);
}
export async function getPhoto(id: string): Promise<Blob | undefined> {
  return (await db()).get("media", id);
}
export async function deletePhoto(id: string) {
  await (await db()).delete("media", id);
}
const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(Error("Could not read photo."));
    r.readAsDataURL(blob);
  });
export async function exportBackup(data: Data) {
  const media: Record<string, string> = {};
  for (const p of data.problems)
    if (p.photoId) {
      const blob = await getPhoto(p.photoId);
      if (!blob)
        throw Error("A photo is missing. Restore it before backing up.");
      media[p.photoId] = await toBase64(blob);
    }
  return JSON.stringify({ data, media }, null, 2);
}
export async function importBackup(file: File): Promise<Data> {
  if (file.size > 100 * 1024 * 1024) throw Error("Backup exceeds 100 MB.");
  const backup = JSON.parse(await file.text());
  validateData(backup.data);
  if (!backup.media || typeof backup.media !== "object")
    throw Error("Missing media section.");
  const photos = new Map<string, Blob>();
  for (const p of (backup.data as Data).problems)
    if (p.photoId) {
      const encoded = backup.media[p.photoId];
      if (
        typeof encoded !== "string" ||
        !/^data:image\/(jpeg|png|webp);base64,/.test(encoded)
      )
        throw Error("Missing or unsupported photo.");
      const parts = encoded.split(",");
      const bytes = Uint8Array.from(atob(parts[1]), (c) => c.charCodeAt(0));
      if (bytes.length > 12 * 1024 * 1024) throw Error("Photo exceeds 12 MB.");
      photos.set(p.photoId, new Blob([bytes], { type: parts[0].slice(5, -7) }));
    }
  const d = await db();
  const tx = d.transaction(["state", "media"], "readwrite");
  await tx.objectStore("media").clear();
  for (const [id, blob] of photos) await tx.objectStore("media").put(blob, id);
  await tx.objectStore("state").put(backup.data, "data");
  await tx.done;
  return backup.data;
}
