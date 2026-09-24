import { useEffect, useState } from "react";
import { getOwnSecurityQuestion, setOwnSecurityQuestion } from "../api";
import { SECURITY_QUESTIONS } from "../securityQuestions";

// Lets accounts created before security questions existed add one, and
// anyone change theirs — it's what "Forgot password?" asks to reset it.
export default function SecurityQuestionCard() {
  const [current, setCurrent] = useState<string | null>(null);
  const [isAccount, setIsAccount] = useState(true);
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getOwnSecurityQuestion()
      .then(({ securityQuestion, isAccount }) => {
        setCurrent(securityQuestion);
        setIsAccount(isAccount);
      })
      .catch(() => setCurrent(""));
  }, []);

  if (!isAccount || current === null) return null;

  async function handleSave() {
    if (answer.trim().length < 2) {
      setError("Please enter an answer.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await setOwnSecurityQuestion(question, answer);
      setCurrent(question);
      setAnswer("");
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save the security question.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg shadow-indigo-100 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Password recovery</h3>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-indigo-600 hover:underline">
            {current ? "Change" : "Set up"}
          </button>
        )}
      </div>

      {!editing ? (
        current ? (
          <p className="text-sm text-slate-700">
            Security question: <span className="font-medium">{current}</span>
          </p>
        ) : (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Add a security question so you can reset your password yourself if you ever forget it.
          </p>
        )
      ) : (
        <div className="space-y-3">
          <select
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {SECURITY_QUESTIONS.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
          <input
            type="text"
            autoComplete="off"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer"
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError("");
              }}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
