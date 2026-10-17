import type { Severity, VerificationIssue } from "@/types/verification";

const LABEL: Record<VerificationIssue["type"], string> = {
  invalid_function: "INVALID FUNCTION",
  invalid_argument: "INVALID ARGUMENT",
  invalid_keyword: "INVALID KEYWORD",
  invalid_import: "INVALID IMPORT",
  invalid_class: "INVALID CLASS",
  invalid_symbol: "INVALID SYMBOL",
  invalid_positional_argument: "INVALID POSITIONAL ARGUMENT",
  excessive_positional_arguments: "EXCESSIVE POSITIONAL ARGUMENTS",
  unsupported_version: "UNSUPPORTED VERSION",
  unresolved_symbol: "UNRESOLVED SYMBOL",
  incomplete_reference_data: "INCOMPLETE REFERENCE DATA",
  syntax_error: "SYNTAX ERROR",
  other: "API ISSUE",
};
const SEV: Record<Severity, string> = {
  critical: "border-red-500/50",
  error: "border-red-500/50",
  warning: "border-amber-500/50",
  info: "border-sky-500/50",
};

export default function IssueCard({ issue, sourceLine }: { issue: VerificationIssue; sourceLine?: string }) {
  const isErr = issue.severity === "critical" || issue.severity === "error";
  return (
    <article className={`rounded-md border bg-zinc-900 p-4 ${SEV[issue.severity] ?? SEV.warning}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-xs font-bold tracking-wider ${isErr ? "text-red-300" : issue.severity === "info" ? "text-sky-300" : "text-amber-300"}`}>
          {isErr ? "❌ " : issue.severity === "info" ? "ℹ️ " : "⚠️ "}{LABEL[issue.type] ?? LABEL.other} <span className="ml-2 font-normal uppercase text-zinc-500">{issue.severity}</span>
        </p>
        {issue.line !== undefined && <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">Line {issue.line}</span>}
      </div>
      <p className="mt-2 break-all font-mono text-base text-white">{issue.argument ?? issue.symbol}</p>
      {issue.argument && <p className="font-mono text-xs text-zinc-500">in {issue.symbol}</p>}
      <p className="mt-2 text-sm text-zinc-300">{issue.message}</p>
      {sourceLine !== undefined && (
        <pre className="mt-3 overflow-x-auto rounded border-l-2 border-red-500 bg-red-500/10 px-3 py-1 font-mono text-xs text-red-200">{sourceLine}</pre>
      )}
      {issue.suggestion && (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-wider text-zinc-500">{issue.suggestion.description ?? "Suggested"}</p>
          <p className="font-mono text-sm text-emerald-300">{issue.suggestion.replacement}</p>
        </div>
      )}
      {issue.evidence && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200">Evidence</summary>
          <p className="mt-1 text-zinc-300">{issue.evidence}</p>
        </details>
      )}
      {issue.version && <p className="mt-3 text-xs text-zinc-500">Version {issue.version}</p>}
    </article>
  );
}
