import type { OverallStatus, VerificationResponse } from "@/types/verification";

const CFG: Record<OverallStatus, { icon: string; color: string }> = {
  all_valid: { icon: "✓", color: "border-emerald-500/50 text-emerald-300" },
  issues_found: { icon: "⚠", color: "border-amber-500/50 text-amber-300" },
  critical: { icon: "✕", color: "border-red-500/50 text-red-300" },
  inconclusive: { icon: "?", color: "border-amber-500/50 text-amber-300" },
};

export default function VerificationSummary({ result }: { result: VerificationResponse }) {
  const n = result.issues.length;
  const title =
    result.overallStatus === "all_valid" ? "All API references verified"
    : result.overallStatus === "critical" ? "Invalid API references detected"
    : result.overallStatus === "inconclusive" ? "Verification inconclusive (insufficient reference data)"
    : `${n} potential API issue${n === 1 ? "" : "s"} found`;
  const c = CFG[result.overallStatus] ?? CFG.issues_found;
  return (
    <div role="status" className={`rounded-md border bg-zinc-900 p-4 ${c.color}`}>
      <p className="text-xs uppercase tracking-wider text-zinc-400">Verification Result</p>
      <p className="mt-1 text-lg font-semibold"><span aria-hidden>{c.icon} </span>{title}</p>
      <p className="text-sm text-zinc-400">{result.checkedCount} API reference{result.checkedCount === 1 ? "" : "s"} checked</p>
    </div>
  );
}
