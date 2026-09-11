interface ConceptCardProps {
  topic: string;
  grade: number;
  explanation: string;
}

export default function ConceptCard({ topic, grade, explanation }: ConceptCardProps) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-indigo-100 backdrop-blur sm:p-6">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Grade {grade} · Concept
      </p>
      <h2 className="mb-3 text-xl font-bold text-slate-900">{topic}</h2>
      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{explanation}</p>
    </div>
  );
}
