// Supported compose targets.
export type RuntimeTarget = "cursor" | "claude-code" | "production";

export interface ComposeTarget {
  runtime: RuntimeTarget;
  dst: string;
  profile?: string;
}

export interface SubagentConfig {
  src: string;
  pattern?: string;
  targets: ComposeTarget[];
}

// ── Model Config pillar ──────────────────────────────────────────
// Optional at SSOT level. When absent, compose adapters emit "inherited"
// so the runtime environment provides its own defaults.

export interface ModelConfig {
  name: string;
  temperature?: number;
  maxTokens?: number;
}

// ── Profiles pillar ──────────────────────────────────────────────
// A sub-agent can operate in multiple states. Each profile defines a
// skill set and optional model config overrides. The runtime environment
// activates one profile via keyword selection.

export interface AgentProfile {
  skills: string[];
  model?: Partial<ModelConfig>;
}

export interface ProfilesConfig {
  default?: string;
  profiles: Record<string, AgentProfile>;
}

// ── Frontmatter ──────────────────────────────────────────────────

export interface RichAgentFrontmatter {
  schemaVersion?: string;
  name: string;
  description: string;
  model?: ModelConfig;
  profiles?: ProfilesConfig;
}

export interface RichAgentDocument {
  sourcePath: string;
  frontmatter: RichAgentFrontmatter;
  body: string;
  extensions: Record<string, unknown>;
}

// ── Validation ───────────────────────────────────────────────────

export type IssueLevel = "error" | "warning";

export interface ValidationIssue {
  code: string;
  message: string;
  level: IssueLevel;
  path?: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

/** Consumer-supplied validator for sidecar extension fields. */
export type ExtensionValidator = (extensions: Record<string, unknown>) => ValidationIssue[];

export interface ValidateOptions {
  /** When provided, called to validate extension fields against a consumer schema. */
  extensionValidator?: ExtensionValidator;
}
