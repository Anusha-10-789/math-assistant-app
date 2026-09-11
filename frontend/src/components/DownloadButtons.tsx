interface DownloadButtonsProps {
  onDownloadDocx: () => void;
  onDownloadPdf: () => void;
  downloadingDocx: boolean;
  downloadingPdf: boolean;
}

export default function DownloadButtons({
  onDownloadDocx,
  onDownloadPdf,
  downloadingDocx,
  downloadingPdf,
}: DownloadButtonsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onDownloadDocx}
        disabled={downloadingDocx}
        className="rounded-lg border border-indigo-300 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {downloadingDocx ? "Preparing Word file..." : "Download as Word"}
      </button>
      <button
        type="button"
        onClick={onDownloadPdf}
        disabled={downloadingPdf}
        className="rounded-lg border border-indigo-300 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {downloadingPdf ? "Preparing PDF file..." : "Download as PDF"}
      </button>
    </div>
  );
}
