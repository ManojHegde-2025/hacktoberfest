// Central frontend types. Person 1: adapt `normalizeResponse` in lib/api.ts if your schema differs.
export type OverallStatus = "all_valid" | "issues_found" | "critical" | "inconclusive";
export type Severity = "critical" | "error" | "warning" | "info";
export type IssueType =
  | "invalid_function"
  | "invalid_argument"
  | "invalid_keyword"
  | "invalid_import"
  | "invalid_class"
  | "invalid_symbol"
  | "invalid_positional_argument"
  | "excessive_positional_arguments"
  | "unsupported_version"
  | "unresolved_symbol"
  | "incomplete_reference_data"
  | "syntax_error"
  | "other";

export interface VerificationRequest {
  code: string;
  library: string;
  version: string;
}

export interface Suggestion {
  line?: number;
  symbol?: string;
  original?: string;
  replacement: string;
  description?: string;
}

export interface StructuredEvidence {
  library?: string;
  version?: string;
  knownArguments?: string[];
  referenceSource?: string;
  parameterCompleteness?: string;
  positionalParameters?: string[];
  maxPositionalArguments?: number | null;
  signatureCompleteness?: string;
  [key: string]: unknown;
}

export interface VerificationIssue {
  id: string;
  severity: Severity;
  type: IssueType;
  symbol: string;
  argument?: string;
  line?: number; // only shown when the backend provides it
  column?: number;
  message: string;
  suggestion?: Suggestion;
  version?: string;
  evidence?: string;
  structuredEvidence?: StructuredEvidence;
}

export interface VerifiedItem {
  symbol: string;
  kind: string; // "function" | "class" | "module" | ...
  message?: string;
  line?: number;
  checksPassed?: string[];
}

export interface GemmaExplanation {
  text: string;
  correctedCode?: string;
}

export interface VerificationMetadata {
  library?: string;
  version?: string;
  checksPerformed?: string[];
  warnings?: string[];
  snapshotCompleteness?: string;
}

export interface VerificationResponse {
  overallStatus: OverallStatus;
  issues: VerificationIssue[];
  verifiedItems: VerifiedItem[];
  suggestions: Suggestion[];
  checkedCount: number;
  explanation?: GemmaExplanation;
  /** false => deterministic results are valid but Gemma failed */
  aiAvailable: boolean;
  metadata?: VerificationMetadata;
}

export interface LibraryOption {
  name: string;
  versions: string[];
}

export type ApiErrorKind = "empty" | "invalid" | "unavailable";

