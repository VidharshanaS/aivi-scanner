"use client";

import { useState } from "react";

type Finding = {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  fix: string;
};

type ScanResult = {
  host: string;
  score: number;
  grade: string;
  scanned_at: string;
  summary: Record<string, number>;
  findings: Finding[];
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-amber-300 text-amber-950",
  low: "bg-slate-300 text-slate-800 dark:bg-slate-600 dark:text-slate-100",
};

function scoreColor(score: number) {
  return score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative h-36 w-36 shrink-0"
      role="img"
      aria-label={`Security score ${score} out of 100, grade ${grade}`}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke={scoreColor(score)}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset 0.9s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums">{score}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">Grade {grade}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  async function runScan() {
    setError(null);
    setResult(null);
    const value = url.trim();
    if (!/^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]+$/i.test(value)) {
      setError("Enter a full URL, like https://example.com");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "The scan failed. Try again.");
      setResult(data);
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Can't reach the scanner API. Check that the backend is running."
          : (e as Error).message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-12 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Hack My Website</h1>
        <p className="mt-3 max-w-xl text-slate-600 dark:text-slate-400">
          Paste a URL and get a security score with the weak spots to fix first. Results are
          simulated for this demo.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row" role="search">
          <label htmlFor="url" className="sr-only">
            Website URL
          </label>
          <input
            id="url"
            type="url"
            inputMode="url"
            value={url}
            disabled={loading}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && runScan()}
            placeholder="https://example.com"
            aria-invalid={!!error}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            onClick={runScan}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden
              />
            )}
            {loading ? "Scanning…" : "Scan site"}
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            {error}
          </p>
        )}

        {loading && (
          <div className="mt-8 space-y-3" aria-live="polite">
            <p className="text-sm text-slate-500">Checking headers, cookies and exposed paths…</p>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        )}

        {result && (
          <section className="mt-10" aria-live="polite">
            <div className="flex flex-col items-center gap-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:flex-row">
              <ScoreRing score={result.score} grade={result.grade} />
              <div className="w-full">
                <h2 className="break-all text-xl font-semibold">{result.host}</h2>
                <p className="text-sm text-slate-500">
                  Scanned {new Date(result.scanned_at).toLocaleString()}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["critical", "high", "medium", "low"] as const).map((s) => (
                    <span
                      key={s}
                      className={`rounded-full px-3 py-1 text-sm font-medium ${SEVERITY_STYLE[s]}`}
                    >
                      {result.summary[s]} {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {result.findings.length === 0 ? (
              <p className="mt-6 text-slate-600 dark:text-slate-400">
                No issues found. This site passed every check.
              </p>
            ) : (
              <ul className="mt-6 space-y-3">
                {result.findings.map((f) => (
                  <li
                    key={f.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold">{f.title}</h3>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_STYLE[f.severity]}`}
                      >
                        {f.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{f.description}</p>
                    <p className="mt-2 text-sm">
                      <span className="font-medium">Fix:</span> {f.fix}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}