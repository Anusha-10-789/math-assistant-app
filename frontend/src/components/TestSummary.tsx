import { useEffect, useState } from "react";
import { getSmsConfig, sendResultSms } from "../api";
import { getProfileInfo } from "../profileInfo";
import type { QuizResult } from "./QuizPlayer";

interface TestSummaryProps {
  topic: string;
  grade: number;
  result: QuizResult;
  onDownloadReportDocx: () => void;
  onDownloadReportPdf: () => void;
  downloadingReportDocx: boolean;
  downloadingReportPdf: boolean;
}

type SmsState = { status: "idle" } | { status: "sending" } | { status: "sent" } | { status: "error"; message: string };

function encouragement(percent: number): string {
  if (percent >= 80) return "Excellent work! You really know this topic.";
  if (percent >= 50) return "Good effort! A little more practice and you'll master this.";
  return "Nice try! Let's keep practicing this topic together.";
}

export default function TestSummary({
  topic,
  grade,
  result,
  onDownloadReportDocx,
  onDownloadReportPdf,
  downloadingReportDocx,
  downloadingReportPdf,
}: TestSummaryProps) {
  const percent = Math.round((result.score / result.total) * 100);
  const [smsConfigured, setSmsConfigured] = useState(false);
  const [smsState, setSmsState] = useState<SmsState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;
    getSmsConfig().then(({ configured }) => {
      if (!cancelled) setSmsConfigured(configured);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSendSms() {
    const phone = getProfileInfo().phone.trim();
    if (!phone) {
      setSmsState({
        status: "error",
        message: "Add a phone number in your Profile first, then try again.",
      });
      return;
    }

    setSmsState({ status: "sending" });
    try {
      await sendResultSms(phone, topic, grade, result.score, result.total);
      setSmsState({ status: "sent" });
    } catch (err) {
      setSmsState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to send the result by SMS.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/60 bg-white/80 p-6 text-center shadow-lg shadow-indigo-100 backdrop-blur">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">
          Grade {grade} · {topic}
        </p>
        <p className="mb-2 text-4xl font-bold text-slate-900">
          {result.score} / {result.total}
        </p>
        <p className="mb-3 text-sm font-semibold text-indigo-600">{percent}% correct</p>
        <p className="mb-4 text-sm text-slate-600">{encouragement(percent)}</p>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onDownloadReportDocx}
            disabled={downloadingReportDocx}
            className="rounded-lg border border-indigo-300 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloadingReportDocx ? "Preparing report..." : "Download Report (Word)"}
          </button>
          <button
            type="button"
            onClick={onDownloadReportPdf}
            disabled={downloadingReportPdf}
            className="rounded-lg border border-indigo-300 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloadingReportPdf ? "Preparing report..." : "Download Report (PDF)"}
          </button>
          {smsConfigured && (
            <button
              type="button"
              onClick={handleSendSms}
              disabled={smsState.status === "sending"}
              className="rounded-lg border border-indigo-300 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {smsState.status === "sending" ? "Sending..." : "📱 Text Me My Result"}
            </button>
          )}
        </div>

        {smsState.status === "sent" && (
          <p className="mt-3 text-sm text-emerald-700">Result sent by SMS!</p>
        )}
        {smsState.status === "error" && (
          <p className="mt-3 text-sm text-red-600">{smsState.message}</p>
        )}
      </div>

      {result.missed.length > 0 && (
        <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-indigo-100 backdrop-blur sm:p-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Questions to review</h3>
          <ul className="space-y-2 text-sm text-slate-700">
            {result.missed.map((item) => (
              <li key={item.questionNumber} className="rounded-lg bg-red-50 px-3 py-2">
                <span className="font-semibold">Q.{item.questionNumber}) {item.topic}:</span>{" "}
                {item.question}
                <br />
                <span className="text-red-700">
                  Your answer:{" "}
                  {item.yourAnswer
                    ? `${item.yourAnswer}) ${item.yourAnswerText}`
                    : "(skipped)"}
                </span>
                <br />
                <span className="text-green-700">
                  Correct answer: {item.correctAnswer}) {item.correctAnswerText}
                </span>
                {item.explanation && (
                  <p className="mt-1 text-slate-700">{item.explanation}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
