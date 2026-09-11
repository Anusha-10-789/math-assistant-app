import { useState } from "react";
import { getProfileInfo, saveProfileInfo, type ProfileInfo } from "../profileInfo";
import { formatDuration, getProfileStats, resetProfileStats } from "../profileStorage";

interface ProfilePageProps {
  username: string;
  onBack: () => void;
  onLogout: () => void;
}

const FIELDS: Array<{ key: keyof ProfileInfo; label: string; type: string; placeholder: string }> = [
  { key: "name", label: "Name", type: "text", placeholder: "Your name" },
  { key: "email", label: "Email address", type: "email", placeholder: "you@example.com" },
  { key: "phone", label: "Phone number", type: "tel", placeholder: "+91 98765 43210" },
  { key: "location", label: "Location", type: "text", placeholder: "City, State" },
  { key: "parentPhone", label: "Parent's phone number", type: "tel", placeholder: "+91 98765 43210" },
  { key: "parentEmail", label: "Parent's email address", type: "email", placeholder: "parent@example.com" },
];

const EMAIL_FIELD_KEYS: Array<keyof ProfileInfo> = ["email", "parentEmail"];

export default function ProfilePage({ username, onBack, onLogout }: ProfilePageProps) {
  const [stats, setStats] = useState(getProfileStats());
  const [info, setInfo] = useState(getProfileInfo());
  const [draft, setDraft] = useState<ProfileInfo>(info);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");

  function handleReset() {
    setStats(resetProfileStats());
  }

  function startEditing() {
    setDraft(info);
    setError("");
    setIsEditing(true);
  }

  function handleSave() {
    for (const key of EMAIL_FIELD_KEYS) {
      const value = draft[key].trim();
      if (value && !value.includes("@")) {
        const label = FIELDS.find((field) => field.key === key)?.label ?? "email address";
        setError(`Please enter a valid ${label.toLowerCase()}, or leave it blank.`);
        return;
      }
    }
    const trimmed: ProfileInfo = {
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      location: draft.location.trim(),
      parentPhone: draft.parentPhone.trim(),
      parentEmail: draft.parentEmail.trim(),
    };
    setInfo(saveProfileInfo(trimmed));
    setIsEditing(false);
  }

  function handleCancel() {
    setError("");
    setIsEditing(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg shadow-indigo-100 backdrop-blur">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-2xl">
            🧑‍🎓
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{info.name || username}</p>
            <p className="text-xs text-slate-500">
              Signed in as {username} — your info is stored on this device.
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-indigo-50 p-4 text-center">
            <p className="text-2xl font-bold text-indigo-700">{formatDuration(stats.totalSeconds)}</p>
            <p className="text-xs font-medium text-slate-600">Total learning time</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{stats.lessonsCompleted}</p>
            <p className="text-xs font-medium text-slate-600">Lessons completed</p>
          </div>
        </div>

        {stats.lastActive && (
          <p className="mb-6 text-xs text-slate-500">
            Last session: {new Date(stats.lastActive).toLocaleString()}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Back to lessons
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Reset stats
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg shadow-indigo-100 backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Profile details</h3>
          {!isEditing && (
            <button
              type="button"
              onClick={startEditing}
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            {FIELDS.map((field) => (
              <div key={field.key}>
                <label
                  htmlFor={`profile-${field.key}`}
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  {field.label}
                </label>
                <input
                  id={`profile-${field.key}`}
                  type={field.type}
                  value={draft[field.key]}
                  onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            ))}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <dl className="space-y-3 text-sm">
            {FIELDS.map((field, index) => (
              <div
                key={field.key}
                className={`flex justify-between ${
                  index < FIELDS.length - 1 ? "border-b border-slate-100 pb-2" : ""
                }`}
              >
                <dt className="font-medium text-slate-500">{field.label}</dt>
                <dd className="text-slate-800">{info[field.key] || "—"}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
