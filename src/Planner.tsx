import { useRef, useState } from "react";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Upload,
  Mountain,
  MousePointer2,
  ArrowUp,
  ArrowDown,
  X,
  Copy,
  BookOpen,
} from "lucide-react";
import {
  type Problem,
  type Data,
  type Sequence,
  type Hold,
  uid,
  normalise,
  removeHold,
} from "./domain";
import { usePhoto } from "./Photo";
export function Planner({
  problem: p,
  data,
  commit,
  back,
  edit,
  remove,
}: {
  problem: Problem;
  data: Data;
  commit: (d: Data) => void;
  back: () => void;
  edit: () => void;
  remove: () => void;
}) {
  const holds = data.holds.filter((h) => h.problemId === p.id);
  const sequences = data.sequences.filter((s) => s.problemId === p.id);
  const [sequenceId, setSequenceId] = useState<string | undefined>(
    sequences[0]?.id,
  );
  const sequence = sequences.find((s) => s.id === sequenceId);
  const [active, setActive] = useState<string>();
  const hold = holds.find((h) => h.id === active);
  const [tool, setTool] = useState("select");
  const [limb, setLimb] = useState<"LH" | "RH" | "LF" | "RF">("LH");
  const [drag, setDrag] = useState<{ id: string; x: number; y: number }>();
  const frame = useRef<HTMLDivElement>(null);
  const photo = usePhoto(p);
  const updateSequence = (s: Sequence) =>
    commit({
      ...data,
      sequences: data.sequences.map((x) => (x.id === s.id ? s : x)),
    });
  const updateHold = (h: Hold) =>
    commit({ ...data, holds: data.holds.map((x) => (x.id === h.id ? h : x)) });
  const coords = (e: { clientX: number; clientY: number }) => {
    const rect = frame.current!.getBoundingClientRect();
    return {
      x: normalise((e.clientX - rect.left) / rect.width),
      y: normalise((e.clientY - rect.top) / rect.height),
    };
  };
  return (
    <div className="content planner">
      <button className="text-button" onClick={back}>
        <ArrowLeft size={16} />
        Back to problems
      </button>
      <div className="planner-heading">
        <div>
          <div className="eyebrow">YOUR BETA, YOUR WAY</div>
          <h1>{p.name}</h1>
          <p>
            {p.grade} <span>·</span> {p.wallStyle} <span>·</span> {p.gym}
          </p>
        </div>
        <div className="planner-actions">
          <button className="secondary" onClick={edit}>
            Edit problem
          </button>
          <button
            className="icon-button"
            onClick={remove}
            aria-label="Delete problem"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      <div className="planner-layout">
        <section className="canvas-panel">
          <div className="canvas-toolbar">
            <div>
              <button
                className={tool === "select" ? "tool active" : "tool"}
                onClick={() => setTool("select")}
              >
                <MousePointer2 size={17} />
                Select / move
              </button>
              <button
                className={tool === "add" ? "tool active" : "tool"}
                onClick={() => setTool("add")}
              >
                <Plus size={17} />
                Add hold
              </button>
            </div>
            <span>{holds.length} holds</span>
          </div>
          {photo ? (
            <div
              ref={frame}
              className={`photo-canvas ${tool}`}
              onClick={(e) => {
                if (
                  (tool === "add" && e.target === e.currentTarget) ||
                  (tool === "add" &&
                    (e.target as HTMLElement).tagName === "IMG")
                ) {
                  const h: Hold = {
                    id: uid(),
                    problemId: p.id,
                    ...coords(e),
                    role: "Hand",
                    label: String(holds.length + 1),
                  };
                  commit({ ...data, holds: [...data.holds, h] });
                  setActive(h.id);
                }
              }}
            >
              <img
                src={photo}
                alt="Route photo. Use Add hold, then tap to mark a position."
                draggable={false}
              />
              <svg
                className="sequence-lines"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <polyline
                  points={sequence?.moves
                    .map((m) => {
                      const h = holds.find((x) => x.id === m.holdId);
                      return h ? `${h.x * 100},${h.y * 100}` : "";
                    })
                    .join(" ")}
                  fill="none"
                  stroke="#e4f9a0"
                  strokeWidth=".5"
                  strokeDasharray="1.5 1"
                />
              </svg>
              {holds.map((h) => (
                <button
                  key={h.id}
                  aria-label={`Hold ${h.label}, ${h.role}`}
                  className={`hold ${h.role.toLowerCase()} ${active === h.id ? "active" : ""}`}
                  style={{
                    left: `${(drag?.id === h.id ? drag.x : h.x) * 100}%`,
                    top: `${(drag?.id === h.id ? drag.y : h.y) * 100}%`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActive(h.id);
                  }}
                  onPointerDown={(e) => {
                    if (tool !== "select") return;
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setActive(h.id);
                    setDrag({ id: h.id, x: h.x, y: h.y });
                  }}
                  onPointerMove={(e) => {
                    if (drag?.id === h.id) setDrag({ id: h.id, ...coords(e) });
                  }}
                  onPointerUp={(e) => {
                    if (drag?.id === h.id) {
                      updateHold({ ...h, x: drag.x, y: drag.y });
                      setDrag(undefined);
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                  }}
                  onPointerCancel={() => setDrag(undefined)}
                >
                  {h.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="no-photo">
              <Mountain size={50} />
              <h3>Start with a photo.</h3>
              <p>Add a photo of your route to mark holds and plan moves.</p>
              <button className="primary" onClick={edit}>
                <Upload size={16} />
                Add route photo
              </button>
            </div>
          )}
          <div className="canvas-caption">
            <span className="local-dot" />
            {tool === "add"
              ? "Tap the photo to add a hold."
              : "Select a hold to edit it. Drag a marker to reposition."}
            <span>DEMO PHOTOS ARE ILLUSTRATIVE</span>
          </div>
        </section>
        <aside className="plan-panel">
          <div className="panel-section">
            <h2>
              <span className="section-number">01</span>Hold details
            </h2>
            {hold ? (
              <>
                <div className="form-row">
                  <label>
                    Label
                    <input
                      maxLength={8}
                      value={hold.label}
                      onChange={(e) =>
                        updateHold({ ...hold, label: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Role
                    <select
                      value={hold.role}
                      onChange={(e) =>
                        updateHold({
                          ...hold,
                          role: e.target.value as Hold["role"],
                        })
                      }
                    >
                      {["Start", "Hand", "Foot", "Finish"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    X position (%)
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(hold.x * 100)}
                      onChange={(e) =>
                        updateHold({
                          ...hold,
                          x: normalise(Number(e.target.value) / 100),
                        })
                      }
                    />
                  </label>
                  <label>
                    Y position (%)
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(hold.y * 100)}
                      onChange={(e) =>
                        updateHold({
                          ...hold,
                          y: normalise(Number(e.target.value) / 100),
                        })
                      }
                    />
                  </label>
                </div>
                <button
                  className="danger text-button"
                  onClick={() => {
                    commit(removeHold(data, hold.id));
                    setActive(undefined);
                  }}
                >
                  <Trash2 size={14} />
                  Delete hold and its moves
                </button>
              </>
            ) : (
              <p className="muted">
                Select a marker on the photo, or use Add hold to start reading
                your route.
              </p>
            )}
          </div>
          <div className="panel-section">
            <h2>
              <span className="section-number">02</span>Planned sequence
            </h2>
            <div className="sequence-select">
              <select
                aria-label="Saved sequence"
                value={sequenceId ?? ""}
                onChange={(e) => setSequenceId(e.target.value)}
              >
                <option value="" disabled>
                  Choose a plan
                </option>
                {sequences.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                className="icon-button"
                aria-label="New sequence"
                onClick={() => {
                  const s: Sequence = {
                    id: uid(),
                    problemId: p.id,
                    name: `Plan ${sequences.length + 1}`,
                    moves: [],
                  };
                  commit({ ...data, sequences: [...data.sequences, s] });
                  setSequenceId(s.id);
                }}
              >
                <Plus size={18} />
              </button>
            </div>
            {sequence ? (
              <>
                <label>
                  Plan name
                  <input
                    value={sequence.name}
                    maxLength={80}
                    onChange={(e) =>
                      updateSequence({ ...sequence, name: e.target.value })
                    }
                  />
                </label>
                <div className="sequence-tools">
                  <button
                    className="text-button"
                    onClick={() => {
                      const s = {
                        ...sequence,
                        id: uid(),
                        name: sequence.name + " copy",
                        moves: sequence.moves.map((m) => ({ ...m, id: uid() })),
                      };
                      commit({ ...data, sequences: [...data.sequences, s] });
                      setSequenceId(s.id);
                    }}
                  >
                    <Copy size={13} />
                    Duplicate
                  </button>
                  <button
                    className="text-button danger"
                    onClick={() => {
                      if (confirm("Delete this saved sequence?")) {
                        commit({
                          ...data,
                          sequences: data.sequences.filter(
                            (s) => s.id !== sequence.id,
                          ),
                        });
                        setSequenceId(
                          sequences.find((s) => s.id !== sequence.id)?.id,
                        );
                      }
                    }}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
                <ol className="moves">
                  {sequence.moves.map((m, i) => (
                    <li key={m.id}>
                      <span className="move-number">{i + 1}</span>
                      <b>{m.limb}</b>
                      <button
                        className="move-hold"
                        onClick={() => setActive(m.holdId)}
                      >
                        Hold {holds.find((h) => h.id === m.holdId)?.label}
                      </button>
                      <button
                        aria-label={`Move step ${i + 1} up`}
                        disabled={i === 0}
                        onClick={() => {
                          const moves = [...sequence.moves];
                          [moves[i - 1], moves[i]] = [moves[i], moves[i - 1]];
                          updateSequence({ ...sequence, moves });
                        }}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        aria-label={`Move step ${i + 1} down`}
                        disabled={i === sequence.moves.length - 1}
                        onClick={() => {
                          const moves = [...sequence.moves];
                          [moves[i + 1], moves[i]] = [moves[i], moves[i + 1]];
                          updateSequence({ ...sequence, moves });
                        }}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        aria-label={`Remove step ${i + 1}`}
                        onClick={() =>
                          updateSequence({
                            ...sequence,
                            moves: sequence.moves.filter((x) => x.id !== m.id),
                          })
                        }
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ol>
                {sequence.moves.length === 0 && (
                  <p className="muted">
                    Select a hold and assign a limb to add your first move.
                  </p>
                )}
                <div className="limbs">
                  {(["LH", "RH", "LF", "RF"] as const).map((l) => (
                    <button
                      key={l}
                      className={limb === l ? "active" : ""}
                      onClick={() => setLimb(l)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <p className="limb-help">LH / RH: hands · LF / RF: feet</p>
                <button
                  className="primary full"
                  disabled={!hold}
                  onClick={() => {
                    if (hold)
                      updateSequence({
                        ...sequence,
                        moves: [
                          ...sequence.moves,
                          { id: uid(), holdId: hold.id, limb },
                        ],
                      });
                  }}
                >
                  <Plus size={16} />
                  Add {hold ? `hold ${hold.label}` : "selected hold"} to plan
                </button>
              </>
            ) : (
              <p className="muted">
                Create a sequence with +. Save different ideas before trying
                them on the wall.
              </p>
            )}
          </div>
          <div className="planner-note">
            <BookOpen size={18} />
            <p>
              {p.notes ||
                "Take a moment to notice your balance, body position, and where you want to go next."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
