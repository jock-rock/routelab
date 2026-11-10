import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Mountain,
  LayoutGrid,
  Route,
  Box,
  Video,
  BookOpen,
  Plus,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  Download,
  Upload,
  X,
  Trash2,
  MapPin,
  Calendar,
  HardDrive,
  ShieldCheck,
  Ellipsis,
} from "lucide-react";
import {
  type Data,
  type Problem,
  uid,
  removeProblem,
} from "./domain";
import * as storage from "./storage";
import "./style.css";
import { Photo } from "./Photo";
import { ProblemForm } from "./ProblemForm";
import { Planner } from "./Planner";
function App() {
  const [data, setData] = useState<Data>();
  const [error, setError] = useState("");
  const [page, setPage] = useState("Problems");
  const [selected, setSelected] = useState<string>();
  const [editing, setEditing] = useState<Problem | null | undefined>();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All problems");
  const [saved, setSaved] = useState(true);
  const [quota, setQuota] = useState("");
  const [info, setInfo] = useState(false);
  const saveChain = useRef(Promise.resolve());
  const importRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const modal = document.querySelector<HTMLElement>("[role=dialog]");
      if (!modal) return;
      if (e.key === "Escape") {
        setEditing(undefined);
        setInfo(false);
      }
      if (e.key === "Tab") {
        const nodes = Array.from(
          modal.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input,select,textarea,[tabindex="0"]',
          ),
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            !modal.contains(document.activeElement))
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            !modal.contains(document.activeElement))
        ) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    if (editing === undefined && !info) return;
    const prior = document.activeElement as HTMLElement;
    const timer = setTimeout(
      () =>
        document
          .querySelector<HTMLElement>(
            "[role=dialog] input,[role=dialog] button",
          )
          ?.focus(),
      0,
    );
    return () => {
      clearTimeout(timer);
      prior?.focus();
    };
  }, [editing !== undefined, info]);
  useEffect(() => {
    storage
      .load()
      .then(setData)
      .catch((e) =>
        setError(
          `Local storage unavailable: ${e.message}. Enable website storage and reload.`,
        ),
      );
    navigator.storage?.estimate().then((s) => {
      if (s.quota && s.usage)
        setQuota(
          `${Math.round(s.usage / 1024 / 1024)} MB used${s.usage / s.quota > 0.8 ? " · Storage nearly full. Export a backup." : ""}`,
        );
    });
  }, []);
  const commit = (next: Data) => {
    setData(next);
    setSaved(false);
    saveChain.current = saveChain.current
      .catch(() => {})
      .then(() => storage.save(next))
      .then(() => setSaved(true))
      .catch((e) => {
        setError(
          `Could not save: ${e.message}. Export a backup before leaving.`,
        );
        throw e;
      });
    saveChain.current.catch(() => {});
  };
  const navigate = (name: string) => {
    setPage(name);
    setSelected(undefined);
  };
  async function backup() {
    if (!data) return;
    try {
      const json = await storage.exportBackup(data);
      const url = URL.createObjectURL(
        new Blob([json], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `routelab-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function restore(file?: File) {
    if (!file) return;
    if (
      !confirm(
        "Replace all local projects and photos with this backup? Export your current library first.",
      )
    )
      return;
    try {
      await saveChain.current.catch(() => {});
      const next = await storage.importBackup(file);
      setData(next);
      setSelected(undefined);
      setSaved(true);
    } catch (e) {
      setError(`Import failed: ${(e as Error).message}`);
    }
  }
  async function saveProblem(p: Problem, file?: File) {
    if (!data) return;
    try {
      let photoId = p.photoId;
      if (file) {
        if (file.size > 12 * 1024 * 1024) throw Error("Choose a photo smaller than 12 MB.");
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw Error("Use a JPEG, PNG, or WebP photo. Export HEIC as JPEG first.");
        const image = new Image();
        const temp = URL.createObjectURL(file);
        try {
          image.src = temp;
          await image.decode();
        } finally {
          URL.revokeObjectURL(temp);
        }
        photoId = uid();
        await storage.putPhoto(photoId, file);
      }
      const next = {
        ...p,
        photoId,
        samplePhoto: file ? undefined : p.samplePhoto,
      };
      const old = data.problems.find((x) => x.id === p.id);
      const nextData = {
        ...data,
        problems: old
          ? data.problems.map((x) => (x.id === p.id ? next : x))
          : [next, ...data.problems],
      };
      await saveChain.current.catch(() => {});
      await storage.save(nextData);
      setData(nextData);
      setSaved(true);
      setEditing(undefined);
      if (old?.photoId && old.photoId !== photoId)
        await storage.deletePhoto(old.photoId);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function deleteProblem(p: Problem) {
    if (
      !data ||
      !confirm(
        `Delete “${p.name}”, its photo, holds, and saved plans? This cannot be undone.`,
      )
    )
      return;
    try {
      const next = removeProblem(data, p.id);
      await saveChain.current.catch(() => {});
      await storage.save(next);
      setData(next);
      setSelected(undefined);
      if (p.photoId) await storage.deletePhoto(p.photoId);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (!data) return;
    navigator.storage
      ?.estimate()
      .then((s) => {
        if (s.quota && s.usage) {
          const percent = Math.round((s.usage / s.quota) * 100);
          setQuota(
            `${Math.round(s.usage / 1024 / 1024)} MB used · ${percent}% of available storage${percent >= 80 ? " · Storage nearly full. Export a backup." : ""}`,
          );
          if (percent >= 80)
            setError(
              "Storage nearly full. Export a backup and remove unused photos before adding more.",
            );
        }
      })
      .catch(() => {});
  }, [data]);
  const problem = data?.problems.find((p) => p.id === selected);
  const filtered =
    data?.problems.filter(
      (p) =>
        (filter === "All problems" || p.status === filter) &&
        `${p.name} ${p.gym} ${p.grade}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ) ?? [];
  return (
    <div className="app">
      <aside className="sidebar">
        <a href="#" className="brand" onClick={() => navigate("Problems")}>
          <span className="brand-icon">
            <Mountain size={25} />
          </span>
          RouteLab<span className="brand-dot">®</span>
        </a>
        <div className="workspace-label">YOUR CLIMBING WORKSPACE</div>
        <nav>
          {[
            { name: "Problems", icon: LayoutGrid },
            { name: "Route planner", icon: Route },
            { name: "3D viewer", icon: Box },
            { name: "Video review", icon: Video },
            { name: "Coaching journal", icon: BookOpen },
          ].map(({ name, icon: Icon }, i) => (
            <button
              key={name}
              className={page === name ? "nav-item active" : "nav-item"}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              <span>{name}</span>
              {i > 1 && <span className="soon-dot" />}
              {name === "Problems" && (
                <span className="nav-count">{data?.problems.length ?? 0}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="mini-icon">↗</span>
          <strong>
            Better beta.
            <br />
            More intention.
          </strong>
          <p>A little reflection goes a long way on the wall.</p>
          <span className="line-drawing">⌁</span>
        </div>
        <div className="sidebar-bottom">
          <span className="local-dot" /> Local-first. Just for you.
          <button
            onClick={() => setInfo(true)}
            aria-label="Storage information"
          >
            <ShieldCheck size={17} />
          </button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span className="breadcrumb">
            Workspace <span>/</span> <b>{selected ? "Route planner" : page}</b>
          </span>
          <button className="local-label" onClick={() => setInfo(true)}>
            <span className="local-dot" />
            {saved ? "Saved on this device" : "Saving…"}
            <HardDrive size={15} />
          </button>
        </header>
        {error && (
          <div className="error" role="alert">
            {error}
            <button onClick={() => setError("")} aria-label="Dismiss error">
              <X size={18} />
            </button>
          </div>
        )}
        {!data ? (
          <div className="loading">
            {error
              ? "Your local library could not be opened."
              : "Opening your workspace…"}
          </div>
        ) : problem ? (
          <Planner
            key={problem.id}
            problem={problem}
            data={data}
            commit={commit}
            back={() => setSelected(undefined)}
            edit={() => setEditing(problem)}
            remove={() => deleteProblem(problem)}
          />
        ) : page === "Problems" || page === "Route planner" ? (
          <div className="content">
            <section className="page-heading">
              <div>
                <div className="eyebrow">READ. PLAN. REFLECT.</div>
                <h1>
                  {page === "Problems"
                    ? "Your next move starts here."
                    : "A better climb starts with a plan."}
                </h1>
                <p>
                  {page === "Problems"
                    ? "A home for your projects, your beta, and the little breakthroughs."
                    : "Choose a problem to explore holds and map out your next attempt."}
                </p>
              </div>
              <button className="primary" onClick={() => setEditing(null)}>
                <Plus size={18} />
                New problem
              </button>
            </section>
            <section className="overview">
              <div>
                <span className="stat-label">IN YOUR NOTEBOOK</span>
                <strong>
                  {String(data.problems.length).padStart(2, "0")}
                  <span>problems</span>
                </strong>
              </div>
              <div>
                <span className="stat-label">
                  <span className="status-dot projecting" />
                  WORK IN PROGRESS
                </span>
                <strong>
                  {String(
                    data.problems.filter((p) => p.status === "Projecting")
                      .length,
                  ).padStart(2, "0")}
                  <span>projects to explore</span>
                </strong>
              </div>
              <div>
                <span className="stat-label">
                  <span className="status-dot sent" />
                  SMALL WINS ADD UP
                </span>
                <strong>
                  {String(
                    data.problems.filter((p) => p.status === "Sent").length,
                  ).padStart(2, "0")}
                  <span>problems sent</span>
                </strong>
              </div>
              <div className="overview-quote">
                <Mountain size={28} />
                <p>
                  Climb with curiosity.
                  <br />
                  <em>Progress follows.</em>
                </p>
              </div>
            </section>
            <section className="library">
              <div className="library-title">
                <h2>
                  {page === "Problems"
                    ? "Problem library"
                    : "Choose your canvas"}{" "}
                  <span>{data.problems.length}</span>
                </h2>
                <div className="backup-actions">
                  <button onClick={backup}>
                    <Download size={15} />
                    Export
                  </button>
                  <button onClick={() => importRef.current?.click()}>
                    <Upload size={15} />
                    Import
                  </button>
                </div>
              </div>
              <div className="filters">
                <div className="tabs">
                  {["All problems", "Projecting", "To try", "Sent"].map((f) => (
                    <button
                      key={f}
                      className={filter === f ? "selected" : ""}
                      onClick={() => setFilter(f)}
                    >
                      {f}
                      {f === "All problems" && (
                        <span>{data.problems.length}</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="search">
                  <Search size={17} />
                  <input
                    aria-label="Search problems"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search problems…"
                  />
                  <SlidersHorizontal size={16} />
                </div>
              </div>
              <div className="card-grid">
                {filtered.map((p, i) => (
                  <article className="problem-card" key={p.id}>
                    <button
                      className={`card-image image-${i % 3}`}
                      onClick={() => setSelected(p.id)}
                    >
                      <Photo problem={p} />
                      <span className={`grade grade-${i % 3}`}>{p.grade}</span>
                      <span className="image-arrow">
                        <ArrowUpRight size={20} />
                      </span>
                      <span className="image-caption">
                        {p.wallStyle.toUpperCase()}
                      </span>
                    </button>
                    <div className="card-body">
                      <div className="card-status">
                        <span
                          className={`status-pill ${p.status.toLowerCase().replace(" ", "-")}`}
                        >
                          <span />
                          {p.status}
                        </span>
                        <button
                          aria-label={`Edit ${p.name}`}
                          onClick={() => setEditing(p)}
                        >
                          <Ellipsis size={21} />
                        </button>
                      </div>
                      <button
                        className="card-name"
                        onClick={() => setSelected(p.id)}
                      >
                        {p.name}
                      </button>
                      <div className="gym">
                        <MapPin size={13} />
                        {p.gym}
                      </div>
                      <p className="card-notes">
                        {p.notes || "A fresh problem. A new possibility."}
                      </p>
                      <div className="card-footer">
                        <span>
                          <Calendar size={13} />
                          {new Date(p.date + "T12:00:00").toLocaleDateString(
                            "en-GB",
                            { month: "short", day: "numeric" },
                          )}
                        </span>
                        <button onClick={() => setSelected(p.id)}>
                          {data.sequences.filter((s) => s.problemId === p.id)
                            .length
                            ? "View plan"
                            : "Start planning"}
                          <ArrowUpRight size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                <button className="add-card" onClick={() => setEditing(null)}>
                  <span>
                    <Plus size={25} />
                  </span>
                  <strong>
                    A new problem.
                    <br />A new possibility.
                  </strong>
                  <p>
                    Add a photo and start
                    <br />
                    figuring out your beta.
                  </p>
                  <b>
                    Add problem <ArrowUpRight size={15} />
                  </b>
                </button>
              </div>
              {filtered.length === 0 && (
                <p className="empty-message">
                  No matching problems. Try another search or add your first
                  project.
                </p>
              )}
            </section>
            <div className="bottom-note">
              <span>
                <ShieldCheck size={15} />
                Your projects stay on this device. Your progress is yours.
              </span>
              <button onClick={() => setInfo(true)}>
                About your workspace <ArrowUpRight size={14} />
              </button>
            </div>
            <section className="tip">
              <div className="tip-symbol">
                <Route size={25} />
              </div>
              <div>
                <span className="eyebrow">
                  A LITTLE INTENTION GOES A LONG WAY
                </span>
                <h3>Read the route before you leave the ground.</h3>
                <p>
                  Mark your holds. Explore a sequence. Give your next attempt a
                  plan.
                </p>
              </div>
              <button
                onClick={() => {
                  const p = data.problems[0];
                  if (p) setSelected(p.id);
                  else setEditing(null);
                }}
              >
                Open route planner <ArrowUpRight size={17} />
              </button>
            </section>
          </div>
        ) : (
          <div className="content upcoming">
            <div className="eyebrow">THE NEXT CHAPTER</div>
            <h1>{page}</h1>
            <p>
              {page === "3D viewer"
                ? "Explore local GLB and GLTF scans with orbit, pan, and zoom. Planned for milestone 2."
                : page === "Video review"
                  ? "Review attempts, bookmark moments, and compare your movement against a plan. Planned for milestone 3."
                  : "Reflect on falls, choose your next correction, and see recurring patterns. Planned for milestone 4."}
            </p>
            <span className="status-pill">Coming in a later milestone</span>
            <button className="primary" onClick={() => navigate("Problems")}>
              Back to your projects <ArrowUpRight size={18} />
            </button>
          </div>
        )}
        <footer>
          ROUTELAB <span>Less guessing. More understanding.</span>
          <span>MADE FOR THE PROCESS.</span>
        </footer>
      </main>
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          restore(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {editing !== undefined && (
        <ProblemForm
          problem={editing}
          close={() => setEditing(undefined)}
          save={saveProblem}
        />
      )}{" "}
      {info && (
        <div className="modal-overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-title"
          >
            <button
              className="modal-close"
              onClick={() => setInfo(false)}
              aria-label="Close"
            >
              <X />
            </button>
            <ShieldCheck size={30} />
            <h2 id="info-title">Your workspace, on this device.</h2>
            <p>
              Projects and photos are stored in IndexedDB in this browser.
              Nothing you add is uploaded to GitHub Pages or any server.
            </p>
            <p>
              Use Export to save a JSON backup with your photos. Import replaces
              your library. Clearing Safari website data or private browsing may
              remove your work. Back up regularly.
            </p>
            <p>
              The planner works without a connection while the page remains
              open. Reopening offline is not guaranteed; no offline app shell is
              installed. Storage is separate for every browser and website
              address.
            </p>
            <p>
              Photos: JPEG, PNG, or WebP, up to 12 MB each. Video import is not
              included in this milestone; the future module will require size
              limits. {quota}
            </p>
            <button
              className="primary"
              onClick={() =>
                navigator.storage
                  ?.persist?.()
                  .then((granted) =>
                    setQuota(
                      granted
                        ? "Persistent storage granted. Keep making backups."
                        : "Safari may manage storage automatically. Keep making backups.",
                    ),
                  )
                  .catch(() =>
                    setQuota(
                      "Persistent storage is unavailable. Keep making backups.",
                    ),
                  )
              }
            >
              Request persistent storage
            </button>
            <p className="muted">{quota}</p>
            <button onClick={backup} className="secondary">
              <Download size={16} />
              Export backup
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
