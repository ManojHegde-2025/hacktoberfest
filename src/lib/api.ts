// The ONLY place the frontend talks to the backend.
import type {
  ApiErrorKind,
  IssueType,
  LibraryOption,
  OverallStatus,
  Severity,
  StructuredEvidence,
  Suggestion,
  VerificationIssue,
  VerificationMetadata,
  VerificationRequest,
  VerificationResponse,
} from "@/types/verification";
import { DEMO_EXAMPLES, FALLBACK_LIBRARIES } from "@/lib/demo";

export class ApiError extends Error {
  kind: ApiErrorKind;
  constructor(kind: ApiErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export const ERROR_MESSAGES: Record<ApiErrorKind, string> = {
  empty: "Please enter some code before verifying.",
  invalid: "We couldn't process this verification. Check your code and try again.",
  unavailable: "Verification service is currently unavailable. Please try again.",
};

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");

// Raw backend JSON is untyped by nature; it is normalized immediately below.
type Raw = Record<string, unknown>;

const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? (v as Raw[]) : []);

function formatEvidence(ev: Raw): string {
  const parts: string[] = [];
  if (ev.library && ev.version) parts.push(`Target: ${ev.library} ${ev.version}`);
  if (Array.isArray(ev.knownArguments) && ev.knownArguments.length > 0) {
    parts.push(`Known arguments: ${ev.knownArguments.join(", ")}`);
  }
  if (Array.isArray(ev.positionalParameters) && ev.positionalParameters.length > 0) {
    parts.push(`Positional parameters: ${ev.positionalParameters.join(", ")}`);
  }
  if (ev.maxPositionalArguments !== undefined && ev.maxPositionalArguments !== null) {
    parts.push(`Max positional arguments: ${ev.maxPositionalArguments}`);
  }
  if (ev.parameterCompleteness && ev.parameterCompleteness !== "unknown") {
    parts.push(`Parameter completeness: ${ev.parameterCompleteness}`);
  }
  if (ev.signatureCompleteness && ev.signatureCompleteness !== "unknown") {
    parts.push(`Signature completeness: ${ev.signatureCompleteness}`);
  }
  if (ev.referenceSource) {
    parts.push(`Source: ${ev.referenceSource}`);
  }
  return parts.join(" | ");
}

function mapOverallStatus(rawStatus: unknown, issues: VerificationIssue[], verifiedCount: number): OverallStatus {
  const s = str(rawStatus).toLowerCase();
  if (s === "passed" || s === "all_valid") return "all_valid";
  if (s === "issues_found") return "issues_found";
  if (s === "inconclusive") return "inconclusive";
  if (s === "critical") return "critical";
  if (s === "error") {
    return issues.some((i) => i.severity === "critical" || i.severity === "error") ? "critical" : "issues_found";
  }
  // Derive if missing
  if (issues.length === 0 && verifiedCount > 0) return "all_valid";
  if (issues.some((i) => i.severity === "critical" || i.severity === "error")) return "critical";
  if (issues.some((i) => i.severity === "warning")) return "inconclusive";
  return issues.length > 0 ? "issues_found" : "inconclusive";
}

/** Map the backend payload to the frontend shape. */
export function normalizeResponse(raw: Raw): VerificationResponse {
  const topSuggestions: Suggestion[] = arr(raw.suggestions).map((s) => ({
    original: str(s.original) || undefined,
    replacement: str(s.suggested ?? s.replacement),
    description: str(s.reason ?? s.description) || undefined,
    symbol: str(s.symbol) || undefined,
    line: num(s.line),
  }));

  const issues: VerificationIssue[] = arr(raw.issues).map((i, idx) => {
    const s = i.suggestion;
    const sug = s && typeof s === "object" ? (s as Raw) : undefined;
    const symbol = str(i.symbol ?? i.function ?? i.name);
    const argument = typeof i.argument === "string" ? i.argument : undefined;
    const line = num(i.line);
    const column = num(i.column);
    const sev = str(i.severity, "warning").toLowerCase();
    const severity: Severity =
      sev === "critical" || sev === "error"
        ? "critical"
        : sev === "info"
          ? "info"
          : "warning";
    const type = str(i.type, "other") as IssueType;

    let evidenceStr: string | undefined;
    let structuredEv: StructuredEvidence | undefined;
    if (typeof i.evidence === "string") {
      evidenceStr = i.evidence;
    } else if (i.evidence && typeof i.evidence === "object") {
      structuredEv = i.evidence as StructuredEvidence;
      evidenceStr = formatEvidence(i.evidence as Raw);
    }

    let suggestion: Suggestion | undefined;
    if (typeof s === "string") {
      suggestion = { replacement: s };
    } else if (sug) {
      suggestion = {
        original: str(sug.original) || undefined,
        replacement: str(sug.suggested ?? sug.replacement),
        description: str(sug.reason ?? sug.description) || undefined,
      };
    } else {
      const match = topSuggestions.find(
        (sg) =>
          (sg.symbol === symbol && argument && sg.original === argument) ||
          (argument && sg.original === argument) ||
          (sg.symbol === symbol && sg.original === symbol) ||
          (line !== undefined && sg.line === line && argument && sg.original === argument)
      );
      if (match) {
        suggestion = {
          original: match.original,
          replacement: match.replacement,
          description: match.description,
        };
      }
    }

    return {
      id: str(i.id, `issue-${idx}`),
      severity,
      type,
      symbol,
      argument,
      line,
      column,
      message: str(i.message ?? i.explanation),
      suggestion,
      version: typeof i.version === "string" ? i.version : undefined,
      evidence: evidenceStr,
      structuredEvidence: structuredEv,
    };
  });

  const verifiedItems = arr(raw.verifiedItems).map((v) => {
    const checksPassed = Array.isArray(v.checksPassed) ? (v.checksPassed as string[]) : undefined;
    let message = typeof v.message === "string" ? v.message : undefined;
    if (!message && checksPassed && checksPassed.length > 0) {
      message = `Checks passed: ${checksPassed.map((c) => c.replace(/_/g, " ")).join(", ")}`;
    }
    return {
      symbol: str(v.symbol),
      kind: str(v.kind, "function"),
      message,
      line: num(v.line),
      checksPassed,
    };
  });

  const ex = raw.explanation ?? raw.gemma;
  const exObj = ex && typeof ex === "object" ? (ex as Raw) : undefined;
  const text = typeof ex === "string" ? ex : str(exObj?.text);
  const explanation = text
    ? { text, correctedCode: str(exObj?.correctedCode ?? raw.correctedCode) || undefined }
    : undefined;

  const meta = raw.metadata && typeof raw.metadata === "object" ? (raw.metadata as Raw) : undefined;
  const metadata: VerificationMetadata | undefined = meta
    ? {
        library: str(meta.library),
        version: str(meta.version),
        checksPerformed: Array.isArray(meta.checksPerformed) ? (meta.checksPerformed as string[]) : [],
        warnings: Array.isArray(meta.warnings) ? (meta.warnings as string[]) : [],
        snapshotCompleteness: str(meta.snapshotCompleteness),
      }
    : undefined;

  const checkedCount = num(raw.checkedCount) ?? (issues.length + verifiedItems.length);
  const overallStatus = mapOverallStatus(raw.overallStatus, issues, verifiedItems.length);
  const aiAvailable = raw.aiAvailable === true || Boolean(explanation && !raw.aiError);

  return {
    overallStatus,
    issues,
    verifiedItems,
    suggestions: topSuggestions,
    checkedCount,
    explanation,
    aiAvailable,
    metadata,
  };
}

async function mockVerify(req: VerificationRequest): Promise<VerificationResponse> {
  await new Promise((r) => setTimeout(r, 700));
  const hit = DEMO_EXAMPLES.find((e) => e.code.trim() === req.code.trim());
  if (!hit) throw new ApiError("unavailable", ERROR_MESSAGES.unavailable);
  return hit.response;
}

export async function verifyCode(req: VerificationRequest): Promise<VerificationResponse> {
  if (!req.code.trim()) throw new ApiError("empty", ERROR_MESSAGES.empty);
  if (USE_MOCK) return mockVerify(req);
  let res: Response;
  try {
    const url = API_BASE_URL ? `${API_BASE_URL}/api/verify` : "/api/verify";
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: req.code,
        library: req.library,
        version: req.version,
      }),
    });
  } catch {
    throw new ApiError("unavailable", ERROR_MESSAGES.unavailable);
  }
  if (res.status === 400 || res.status === 422) throw new ApiError("invalid", ERROR_MESSAGES.invalid);
  if (!res.ok) throw new ApiError("unavailable", ERROR_MESSAGES.unavailable);
  try {
    return normalizeResponse((await res.json()) as Raw);
  } catch {
    throw new ApiError("invalid", ERROR_MESSAGES.invalid);
  }
}

/** Optional: GET /api/libraries -> [{ name, versions }]. Falls back to demo values. */
export async function getLibraries(): Promise<LibraryOption[]> {
  if (USE_MOCK) return FALLBACK_LIBRARIES;
  try {
    const url = API_BASE_URL ? `${API_BASE_URL}/api/libraries` : "/api/libraries";
    const res = await fetch(url);
    if (!res.ok) return FALLBACK_LIBRARIES;
    const data = (await res.json()) as unknown;
    const list = Array.isArray(data) ? data : (data as Raw).libraries;
    const out = arr(list)
      .map((l) => ({ name: str(l.name), versions: Array.isArray(l.versions) ? (l.versions as string[]) : [] }))
      .filter((l) => l.name && l.versions.length);
    return out.length ? out : FALLBACK_LIBRARIES;
  } catch {
    return FALLBACK_LIBRARIES;
  }
}

