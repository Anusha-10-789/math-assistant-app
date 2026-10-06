import ReadingKid from "./ReadingKid";

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl bg-white/70 px-6 py-6 text-center shadow-sm ring-1 ring-white" role="status">
      <ReadingKid className="h-40 w-40" />
      <p className="font-display text-lg font-semibold text-slate-800">Getting your questions ready…</p>
      <p className="text-sm text-slate-500">Reading up on your topic — just a moment!</p>
    </div>
  );
}
