---
name: code-review-fix
description: "Fix inline code review comments: parse review findings, validate each against current code, apply minimal fixes, then validate with type-check, lint, and tests."
---

# Code Review Fix Workflow

Systematic process for addressing inline code review comments (e.g., from GitHub PR reviews, CodeRabbit, or similar tools).

## Steps

### 1. Parse review findings

Extract each finding from the review input. For each finding, note:

- **File path** and **line range**
- **Issue type**: bug, stale closure, missing guard, style, i18n, security, performance, etc.
- **Suggested fix** (if any)

Group by file to minimize context switches.

### 2. Read and validate each finding

For each file/issue:

- Read the current file at the referenced line(s)
- Determine if the issue is **still valid** against current code
- If valid: apply the minimal fix
- If invalid: skip with a brief reason (e.g., "already fixed in prior commit", "line range no longer matches")

### 3. Apply fixes

- Keep changes minimal — fix only what the issue requires
- Prefer fixing root causes over adding workarounds
- For stale-closure patterns in React/hooks: resolve values at transaction time instead of relying on captured render-time props
- For null/undefined guards: add early returns or optional chaining
- For missing deps: add to package.json via `bun add` (not manual edit)

### 4. Validate

Run the project validation pipeline after all fixes:

```bash
bun run check-types   # type check
bun run check         # lint + format (ultracite)
bun run test          # tests (or per-package: cd packages/weby && bun run test)
```

Fix any issues found. Repeat until clean.

### 5. Commit

Stage changes and commit with a descriptive message following the project convention:

```
fix[MODULE]: Fix <brief description>
```

Include a summary table of what was fixed vs. skipped in the commit message body.

## Anti-patterns to avoid

- Don't over-refactor beyond what the issue requires
- Don't add features or improvements not mentioned in the review
- Don't skip validation — always run check-types + check + test before committing
- Don't commit partial validation (e.g., type-check passes but tests weren't run)
