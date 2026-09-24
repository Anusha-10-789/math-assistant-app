export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center gap-3 py-8 text-slate-600">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
      <span>Getting your questions ready...</span>
    </div>
  );
}
