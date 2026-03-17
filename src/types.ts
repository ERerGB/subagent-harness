// Supported compose targets.
// TODO: claude-code and production adapters currently emit the same format as cursor.
//       When runtime-specific differences emerge (e.g. CC uses different frontmatter keys,
//       production needs full config passthrough), add dedicated adapters in compose.ts.
export type RuntimeTarget = "cursor" | "claude-code" | "production";

export interface ComposeTarget {
  runtime: RuntimeTarget;
  dst: string;
}

export interface SubagentConfig {
  src: string;
  pattern?: string;
  targets: ComposeTarget[];
}

export interface RichAgentFrontmatter {
  name: string;
  description: string;
  archetype: string;
  scenario: "meeting" | "creator";
  adr: string;
  contentSchema: Record<string, string>;
  config: {
    confidence: { high: number; medium: number; low: number };
    prefetch: { level: string; maxConcurrent: number; maxHitDistance: number };
    maxIdleTurns: number;
  };
  skills: {
    pre_yield: string[];
    post_yield: string[];
  };
  evolution?: Record<string, unknown>;
}

export interface RichAgentDocument {
  sourcePath: string;
  frontmatter: RichAgentFrontmatter;
  body: string;
}

export interface ValidationIssue {
  code: string;
  message: string;
  path?: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

