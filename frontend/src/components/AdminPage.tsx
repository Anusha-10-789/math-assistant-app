import { useEffect, useMemo, useState } from "react";
import {
  adminCreateAssignment,
  adminCreateLesson,
  adminDeleteAssignment,
  adminDeleteLesson,
  adminDraftLesson,
  adminListAssignments,
  adminListLessons,
  adminListStudents,
  adminSetHiddenTopics,
  adminUpdateLesson,
  getTeacherContent,
  type Assignment,
  type StudentAccount,
  type TeacherLesson,
  type TeacherLessonInput,
  type TeacherQuestion,
} from "../api";
import { GRADES, getGradeTopicModules } from "../subjectModules";
import { hiddenTopicKey } from "../teacherContent";
import type { Subject } from "./SubjectSelect";

interface AdminPageProps {
  onBack: () => void;
  // Lessons or topics changed — reload what students see.
  onContentChanged: () => void;
}

type Tab = "lessons" | "assign" | "topics";

const SUBJECTS: Subject[] = ["Mathematics", "Science"];
const subjectLabel = (s: Subject) => (s === "Science" ? "🔬 Science" : "🧮 Maths");
const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong. Please try again.");

const INPUT = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100";
const LABEL = "mb-1 block text-sm font-bold text-slate-700";
const PRIMARY = "rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-300/50 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";
const SECONDARY = "rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const DANGER = "rounded-xl border-2 border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50";

function Pills<T extends string | number>({ value, options, onChange, label }: { value: T; options: T[]; onChange: (v: T) => void; label: (v: T) => string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${option === value ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-indigo-50"}`}
        >
          {label(option)}
        </button>
      ))}
    </div>
  );
}

function Banner({ message, tone = "error" }: { message: string; tone?: "error" | "ok" }) {
  if (!message) return null;
  return (
    <p className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`} role={tone === "ok" ? "status" : "alert"}>
      {message}
    </p>
  );
}

// ---------- Lessons ----------

const emptyQuestion = (): TeacherQuestion => ({ question: "", options: ["", "", "", ""], answer: "A", explanation: "" });
const emptyLesson = (): TeacherLessonInput => ({
  subject: "Mathematics",
  grade: 3,
  title: "",
  description: "",
  notes: "",
  icon: "📘",
  published: true,
  questions: [emptyQuestion()],
});

function problemsIn(lesson: TeacherLessonInput): string {
  if (!lesson.title.trim()) return "Give the lesson a title.";
  if (lesson.questions.length === 0) return "Add at least one question.";
  const bad = lesson.questions.findIndex((q) => !q.question.trim() || q.options.some((o) => !o.trim()));
  if (bad >= 0) return `Question ${bad + 1} needs the question and all four answers filled in.`;
  return "";
}

function LessonEditor({ initial, onSave, onCancel }: { initial: TeacherLessonInput; onSave: (lesson: TeacherLessonInput) => Promise<void>; onCancel: () => void }) {
  const [lesson, setLesson] = useState(initial);
  const [draftCount, setDraftCount] = useState(10);
  const [busy, setBusy] = useState<"" | "draft" | "save">("");
  const [error, setError] = useState("");
  const set = (patch: Partial<TeacherLessonInput>) => setLesson((l) => ({ ...l, ...patch }));
  const setQuestion = (index: number, patch: Partial<TeacherQuestion>) =>
    set({ questions: lesson.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)) });

  async function draft() {
    if (!lesson.title.trim()) {
      setError("Type a title first — the AI writes the draft about it.");
      return;
    }
    setError("");
    setBusy("draft");
    try {
      const result = await adminDraftLesson({ subject: lesson.subject, grade: lesson.grade, title: lesson.title, num_questions: draftCount });
      set({ notes: lesson.notes.trim() ? lesson.notes : result.notes, questions: result.questions });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy("");
    }
  }

  async function save() {
    const problem = problemsIn(lesson);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setBusy("save");
    try {
      await onSave(lesson);
    } catch (err) {
      setError(errorText(err));
      setBusy("");
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className={LABEL}>Subject</span>
          <Pills value={lesson.subject} options={SUBJECTS} onChange={(subject) => set({ subject })} label={subjectLabel} />
        </div>
        <div>
          <span className={LABEL}>Grade</span>
          <Pills value={lesson.grade} options={GRADES} onChange={(grade) => set({ grade })} label={(g) => `Grade ${g}`} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[5rem_1fr]">
        <label>
          <span className={LABEL}>Icon</span>
          <input className={`${INPUT} text-center text-xl`} value={lesson.icon} maxLength={4} onChange={(e) => set({ icon: e.target.value })} />
        </label>
        <label>
          <span className={LABEL}>Lesson title</span>
          <input className={INPUT} value={lesson.title} maxLength={120} placeholder="e.g. Adding money up to ₹100" onChange={(e) => set({ title: e.target.value })} />
        </label>
      </div>
      <label className="block">
        <span className={LABEL}>Short description (shown on the topic card)</span>
        <input className={INPUT} value={lesson.description} maxLength={200} placeholder="e.g. Add rupees and paise in shopping problems" onChange={(e) => set({ description: e.target.value })} />
      </label>
      <label className="block">
        <span className={LABEL}>Notes for students (shown before the test)</span>
        <textarea className={`${INPUT} min-h-[6rem]`} value={lesson.notes} maxLength={6000} placeholder="Explain the idea in a few simple sentences." onChange={(e) => set({ notes: e.target.value })} />
      </label>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-50 to-fuchsia-50 p-4">
        <span className="text-sm font-semibold text-slate-700">✨ Let the AI write notes and questions for this title, then edit them:</span>
        <select className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm" value={draftCount} onChange={(e) => setDraftCount(Number(e.target.value))} aria-label="Number of questions to draft">
          {[5, 10, 15, 20].map((n) => (
            <option key={n} value={n}>
              {n} questions
            </option>
          ))}
        </select>
        <button type="button" onClick={draft} disabled={busy !== ""} className={PRIMARY}>
          {busy === "draft" ? "Writing… (up to 30 s)" : "✨ Draft with AI"}
        </button>
        {lesson.questions.some((q) => q.question.trim()) && <span className="text-xs text-slate-500">This replaces the questions below.</span>}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Questions ({lesson.questions.length})</h3>
        {lesson.questions.map((q, index) => (
          <fieldset key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <legend className="font-display text-base font-semibold">Question {index + 1}</legend>
              <button
                type="button"
                onClick={() => set({ questions: lesson.questions.filter((_, i) => i !== index) })}
                className="text-sm font-bold text-rose-600 hover:underline"
              >
                Remove
              </button>
            </div>
            <textarea className={`${INPUT} mb-3`} rows={2} value={q.question} placeholder="Type the question" onChange={(e) => setQuestion(index, { question: e.target.value })} />
            <div className="grid gap-2 sm:grid-cols-2">
              {(["A", "B", "C", "D"] as const).map((letter, i) => (
                <label key={letter} className={`flex items-center gap-2 rounded-xl border-2 p-1.5 pl-3 ${q.answer === letter ? "border-emerald-400 bg-emerald-50" : "border-transparent"}`}>
                  <input
                    type="radio"
                    name={`answer-${index}`}
                    checked={q.answer === letter}
                    onChange={() => setQuestion(index, { answer: letter })}
                    aria-label={`${letter} is the correct answer`}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className="font-bold text-slate-600">{letter}</span>
                  <input
                    className={INPUT}
                    value={q.options[i]}
                    placeholder={`Answer ${letter}`}
                    onChange={(e) => {
                      const options = [...q.options] as TeacherQuestion["options"];
                      options[i] = e.target.value;
                      setQuestion(index, { options });
                    }}
                  />
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">Tick the circle next to the correct answer.</p>
            <input className={`${INPUT} mt-3`} value={q.explanation} placeholder="Explanation shown after answering (optional)" onChange={(e) => setQuestion(index, { explanation: e.target.value })} />
          </fieldset>
        ))}
        <button type="button" onClick={() => set({ questions: [...lesson.questions, emptyQuestion()] })} className={SECONDARY}>
          ➕ Add a question
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" checked={lesson.published} onChange={(e) => set({ published: e.target.checked })} className="h-4 w-4 accent-indigo-600" />
        Show this lesson to students in the topic list (untick to keep it for assigned tests only)
      </label>

      <Banner message={error} />
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={busy !== ""} className={PRIMARY}>
          {busy === "save" ? "Saving…" : "💾 Save lesson"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy !== ""} className={SECONDARY}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function LessonsTab({ lessons, onChanged }: { lessons: TeacherLesson[] | null; onChanged: () => void }) {
  const [editing, setEditing] = useState<{ id: string | null; lesson: TeacherLessonInput } | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" }>({ text: "", tone: "ok" });

  async function save(lesson: TeacherLessonInput) {
    if (editing?.id) await adminUpdateLesson(editing.id, lesson);
    else await adminCreateLesson(lesson);
    setEditing(null);
    setMessage({ text: `Saved “${lesson.title}”.`, tone: "ok" });
    onChanged();
  }

  async function remove(lesson: TeacherLesson) {
    if (!window.confirm(`Delete the lesson “${lesson.title}”? Tests assigned from it are removed too. This can't be undone.`)) return;
    try {
      const { assignments_removed } = await adminDeleteLesson(lesson.id);
      setMessage({ text: `Deleted “${lesson.title}”${assignments_removed ? ` and ${assignments_removed} assigned test${assignments_removed === 1 ? "" : "s"}` : ""}.`, tone: "ok" });
      onChanged();
    } catch (err) {
      setMessage({ text: errorText(err), tone: "error" });
    }
  }

  if (editing) {
    return (
      <div>
        <h2 className="mb-4 text-xl font-semibold">{editing.id ? "Edit lesson" : "New lesson"}</h2>
        <LessonEditor initial={editing.lesson} onSave={save} onCancel={() => setEditing(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Your own lessons, with notes and questions. Students find them under “📌 From your teacher”.</p>
        <button type="button" onClick={() => setEditing({ id: null, lesson: emptyLesson() })} className={PRIMARY}>
          ➕ New lesson
        </button>
      </div>
      <Banner message={message.text} tone={message.tone} />
      {lessons === null ? (
        <p className="text-sm text-slate-500">Loading lessons…</p>
      ) : lessons.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No lessons yet. Create your first one!</p>
      ) : (
        <ul className="space-y-2">
          {lessons.map((lesson) => (
            <li key={lesson.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">{lesson.icon || "📘"}</span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-semibold text-slate-900">{lesson.title}</p>
                <p className="text-xs font-semibold text-slate-500">
                  {subjectLabel(lesson.subject)} · Grade {lesson.grade} · {lesson.questions.length} questions ·{" "}
                  {lesson.published ? <span className="text-emerald-700">Shown to students</span> : <span className="text-amber-700">Assigned tests only</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const { id, created_at: _c, updated_at: _u, ...input } = lesson;
                    setEditing({ id, lesson: input });
                  }}
                  className={SECONDARY}
                >
                  ✏️ Edit
                </button>
                <button type="button" onClick={() => remove(lesson)} className={DANGER}>
                  🗑️ Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Assign tests ----------

function AssignTab({ lessons }: { lessons: TeacherLesson[] | null }) {
  const [students, setStudents] = useState<StudentAccount[] | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [subject, setSubject] = useState<Subject>("Mathematics");
  const [grade, setGrade] = useState(3);
  const [choice, setChoice] = useState("");
  const [count, setCount] = useState(10);
  const [everyone, setEveryone] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" }>({ text: "", tone: "ok" });
  const [open, setOpen] = useState<string | null>(null);

  function reload() {
    adminListAssignments()
      .then((d) => setAssignments(d.assignments))
      .catch((err) => setMessage({ text: errorText(err), tone: "error" }));
  }

  useEffect(() => {
    adminListStudents()
      .then((d) => setStudents(d.students))
      .catch((err) => setMessage({ text: errorText(err), tone: "error" }));
    reload();
  }, []);

  const teacherOptions = (lessons ?? []).filter((l) => l.subject === subject && l.grade === grade);
  const syllabusOptions = getGradeTopicModules(subject, grade);
  const chosenLesson = teacherOptions.find((l) => `lesson:${l.id}` === choice);
  const maxCount = chosenLesson ? chosenLesson.questions.length : 50;
  const nameOf = useMemo(() => new Map((students ?? []).map((s) => [s.username, s.name])), [students]);
  const filtered = (students ?? []).filter((s) => `${s.name} ${s.email} ${s.phone}`.toLowerCase().includes(search.toLowerCase()));

  async function assign() {
    const topic = chosenLesson ? chosenLesson.title : choice.replace(/^topic:/, "");
    if (!topic) return setMessage({ text: "Choose a lesson or topic for the test.", tone: "error" });
    if (!everyone && picked.size === 0) return setMessage({ text: "Choose at least one student, or assign to all students.", tone: "error" });
    setBusy(true);
    try {
      await adminCreateAssignment({
        subject,
        grade,
        topic,
        lesson_id: chosenLesson?.id ?? "",
        num_questions: Math.min(count, maxCount),
        students: everyone ? ["*"] : [...picked],
        due,
        note,
      });
      setMessage({ text: `Assigned “${topic}” to ${everyone ? "all students" : `${picked.size} student${picked.size === 1 ? "" : "s"}`}.`, tone: "ok" });
      setPicked(new Set());
      setNote("");
      reload();
    } catch (err) {
      setMessage({ text: errorText(err), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function remove(a: Assignment) {
    if (!window.confirm(`Remove the assigned test “${a.topic}”? Students won't see it any more.`)) return;
    try {
      await adminDeleteAssignment(a.id);
      reload();
    } catch (err) {
      setMessage({ text: errorText(err), tone: "error" });
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
        <h2 className="text-xl font-semibold">Assign a test</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={LABEL}>Subject</span>
            <Pills value={subject} options={SUBJECTS} onChange={(s) => { setSubject(s); setChoice(""); }} label={subjectLabel} />
          </div>
          <div>
            <span className={LABEL}>Grade</span>
            <Pills value={grade} options={GRADES} onChange={(g) => { setGrade(g); setChoice(""); }} label={(g) => `Grade ${g}`} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
          <label>
            <span className={LABEL}>Lesson or topic</span>
            <select className={INPUT} value={choice} onChange={(e) => setChoice(e.target.value)}>
              <option value="">Choose…</option>
              {teacherOptions.length > 0 && (
                <optgroup label="Your lessons">
                  {teacherOptions.map((l) => (
                    <option key={l.id} value={`lesson:${l.id}`}>
                      {l.icon} {l.title} ({l.questions.length} questions)
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Syllabus topics">
                {syllabusOptions.map((m) => (
                  <option key={`${m.topic}|${m.label}`} value={`topic:${m.topic}`}>
                    {m.icon} {m.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label>
            <span className={LABEL}>Questions</span>
            <input className={INPUT} type="number" min={1} max={maxCount} value={Math.min(count, maxCount)} onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} />
          </label>
        </div>

        <div>
          <span className={LABEL}>Students</span>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={everyone} onChange={(e) => setEveryone(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
            All students (including ones who join later)
          </label>
          {!everyone && (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <input className={`${INPUT} mb-2`} placeholder="Search by name, email or mobile" value={search} onChange={(e) => setSearch(e.target.value)} />
              {students === null ? (
                <p className="text-sm text-slate-500">Loading students…</p>
              ) : (
                <ul className="max-h-56 space-y-1 overflow-y-auto">
                  {filtered.map((s) => (
                    <li key={s.username}>
                      <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={picked.has(s.username)}
                          onChange={(e) => {
                            const next = new Set(picked);
                            if (e.target.checked) next.add(s.username);
                            else next.delete(s.username);
                            setPicked(next);
                          }}
                          className="h-4 w-4 accent-indigo-600"
                        />
                        <span className="font-semibold text-slate-800">{s.name}</span>
                        <span className="truncate text-slate-500">{s.email}</span>
                      </label>
                    </li>
                  ))}
                  {filtered.length === 0 && <li className="px-2 text-sm text-slate-500">No students match.</li>}
                </ul>
              )}
              <p className="mt-2 text-xs font-semibold text-slate-500">{picked.size} selected</p>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-[11rem_1fr]">
          <label>
            <span className={LABEL}>Due date (optional)</span>
            <input className={INPUT} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <label>
            <span className={LABEL}>Note to students (optional)</span>
            <input className={INPUT} value={note} maxLength={300} placeholder="e.g. Revise the notes first!" onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <Banner message={message.text} tone={message.tone} />
        <button type="button" onClick={assign} disabled={busy} className={PRIMARY}>
          {busy ? "Assigning…" : "📋 Assign test"}
        </button>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Assigned tests</h2>
        {assignments === null ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : assignments.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No tests assigned yet.</p>
        ) : (
          <ul className="space-y-2">
            {assignments.map((a) => {
              const audience = a.students.includes("*") ? students?.length ?? 0 : a.students.length;
              const results = Object.entries(a.results);
              const average = results.length ? Math.round(results.reduce((sum, [, r]) => sum + (r.score / r.total) * 100, 0) / results.length) : null;
              return (
                <li key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-semibold text-slate-900">{a.topic}</p>
                      <p className="text-xs font-semibold text-slate-500">
                        {subjectLabel(a.subject)} · Grade {a.grade} · {a.num_questions} questions · {a.students.includes("*") ? "All students" : a.students.map((s) => nameOf.get(s) ?? s).join(", ")}
                        {a.due && ` · Due ${a.due}`}
                      </p>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700">
                      {results.length}/{audience} done{average !== null && ` · avg ${average}%`}
                    </span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setOpen(open === a.id ? null : a.id)} className={SECONDARY} aria-expanded={open === a.id}>
                        {open === a.id ? "Hide results" : "Results"}
                      </button>
                      <button type="button" onClick={() => remove(a)} className={DANGER}>
                        🗑️
                      </button>
                    </div>
                  </div>
                  {open === a.id && (
                    <table className="mt-3 w-full text-left text-sm">
                      <thead className="text-xs text-slate-500">
                        <tr>
                          <th className="py-1 font-semibold">Student</th>
                          <th className="py-1 font-semibold">Score</th>
                          <th className="py-1 font-semibold">Finished</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(a.students.includes("*") ? (students ?? []).map((s) => s.username) : a.students).map((username) => {
                          const r = a.results[username];
                          return (
                            <tr key={username} className="border-t border-slate-100">
                              <td className="py-1.5 font-semibold text-slate-800">{nameOf.get(username) ?? username}</td>
                              <td className="py-1.5">{r ? `${r.score}/${r.total} (${Math.round((r.score / r.total) * 100)}%)` : <span className="text-amber-700">Not yet</span>}</td>
                              <td className="py-1.5 text-slate-500">{r ? new Date(r.completed_at * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------- Syllabus topics ----------

function TopicsTab({ onChanged }: { onChanged: () => void }) {
  const [hidden, setHidden] = useState<Set<string> | null>(null);
  const [subject, setSubject] = useState<Subject>("Mathematics");
  const [grade, setGrade] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    getTeacherContent()
      .then((c) => setHidden(new Set(c.hidden_topics)))
      .catch((err) => setError(errorText(err)));
  }, []);

  async function toggle(topic: string) {
    if (!hidden) return;
    const key = hiddenTopicKey(subject, grade, topic);
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setHidden(next);
    try {
      await adminSetHiddenTopics([...next]);
      onChanged();
    } catch (err) {
      setHidden(hidden);
      setError(errorText(err));
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Remove a built-in lesson from students’ topic lists, or bring it back. Removing doesn’t affect tests already taken.
      </p>
      <div className="flex flex-wrap gap-4">
        <Pills value={subject} options={SUBJECTS} onChange={setSubject} label={subjectLabel} />
        <Pills value={grade} options={GRADES} onChange={setGrade} label={(g) => `Grade ${g}`} />
      </div>
      <Banner message={error} />
      {hidden === null ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {getGradeTopicModules(subject, grade).map((m) => {
            const isHidden = hidden.has(hiddenTopicKey(subject, grade, m.topic));
            return (
              <li key={`${m.topic}|${m.label}`} className={`flex items-center gap-3 rounded-2xl border p-3 ${isHidden ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white"}`}>
                <span className={`text-2xl ${isHidden ? "opacity-40 grayscale" : ""}`}>{m.icon}</span>
                <span className={`min-w-0 flex-1 text-sm font-semibold ${isHidden ? "text-slate-400 line-through" : "text-slate-800"}`}>{m.label}</span>
                <button type="button" onClick={() => toggle(m.topic)} className={isHidden ? SECONDARY : DANGER}>
                  {isHidden ? "↩ Restore" : "🗑️ Remove"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------- Page ----------

export default function AdminPage({ onBack, onContentChanged }: AdminPageProps) {
  const [tab, setTab] = useState<Tab>("lessons");
  const [lessons, setLessons] = useState<TeacherLesson[] | null>(null);
  const [error, setError] = useState("");

  function reloadLessons() {
    adminListLessons()
      .then((d) => setLessons(d.lessons))
      .catch((err) => setError(errorText(err)));
  }

  useEffect(reloadLessons, []);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "lessons", label: "📚 Lessons" },
    { id: "assign", label: "📋 Assign tests" },
    { id: "topics", label: "🗂️ Syllabus topics" },
  ];

  return (
    <div className="space-y-5 rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-200/70 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">🛠️ Admin</h1>
          <p className="text-sm text-slate-500">Create lessons, assign tests to students and manage the topics they see.</p>
        </div>
        <button type="button" onClick={onBack} className="shrink-0 whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          🏠 <span className="hidden sm:inline">Back to </span>Home
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-full bg-slate-100 p-1" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${tab === t.id ? "bg-white text-indigo-700 shadow" : "text-slate-600 hover:text-slate-900"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Banner message={error} />
      {tab === "lessons" && (
        <LessonsTab
          lessons={lessons}
          onChanged={() => {
            reloadLessons();
            onContentChanged();
          }}
        />
      )}
      {tab === "assign" && <AssignTab lessons={lessons} />}
      {tab === "topics" && <TopicsTab onChanged={onContentChanged} />}
    </div>
  );
}
