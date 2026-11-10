import { useState } from "react";
import { X, Check } from "lucide-react";
import { type Problem, uid } from "./domain";
export function ProblemForm({
  problem,
  close,
  save,
}: {
  problem: Problem | null;
  close: () => void;
  save: (p: Problem, f?: File) => Promise<void>;
}) {
  const [p, setP] = useState<Problem>(
    problem ?? {
      id: uid(),
      name: "",
      gym: "",
      grade: "V4",
      wallStyle: "Vertical",
      date: new Date().toISOString().slice(0, 10),
      status: "Projecting",
      notes: "",
      color: "#b6c9a0",
    },
  );
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const set = (key: keyof Problem, value: string) =>
    setP({ ...p, [key]: value });
  return (
    <div className="modal-overlay">
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-title"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await save(p, file);
          setBusy(false);
        }}
      >
        <button
          type="button"
          className="modal-close"
          onClick={close}
          aria-label="Close"
        >
          <X />
        </button>
        <div className="eyebrow">YOUR NEXT PROJECT</div>
        <h2 id="form-title">
          {problem ? "Edit problem" : "A new possibility."}
        </h2>
        <label>
          Problem name
          <input
            autoFocus
            required
            maxLength={100}
            value={p.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Give your project a name"
          />
        </label>
        <label>
          Gym
          <input
            required
            maxLength={100}
            value={p.gym}
            onChange={(e) => set("gym", e.target.value)}
            placeholder="Where are you climbing?"
          />
        </label>
        <div className="form-row">
          <label>
            Grade
            <input
              required
              maxLength={16}
              value={p.grade}
              onChange={(e) => set("grade", e.target.value)}
            />
          </label>
          <label>
            Wall style
            <select
              value={p.wallStyle}
              onChange={(e) => set("wallStyle", e.target.value)}
            >
              {["Slab", "Vertical", "Overhang", "Roof", "Mixed"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Date
            <input
              type="date"
              required
              value={p.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </label>
          <label>
            Status
            <select
              value={p.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {["Projecting", "To try", "Sent"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Route photo <small>JPEG, PNG, WebP · max 12 MB</small>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0])}
          />
        </label>
        {problem && (problem.photoId || problem.samplePhoto) && (
          <label className="check-row">
            <input
              type="checkbox"
              checked={!p.photoId && !p.samplePhoto}
              onChange={(e) =>
                setP({
                  ...p,
                  photoId: e.target.checked ? undefined : problem.photoId,
                  samplePhoto: e.target.checked
                    ? undefined
                    : problem.samplePhoto,
                })
              }
            />
            Remove current photo (hold positions remain)
          </label>
        )}
        <label>
          Notes
          <textarea
            rows={3}
            maxLength={4000}
            value={p.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="What do you want to explore?"
          />
        </label>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save problem"}
            <Check size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
