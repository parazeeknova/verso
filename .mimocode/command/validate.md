---
description: "Run the full validation pipeline: type-check, lint/format, and tests. Report pass/fail for each step."
---

# Validate

Run the verso project validation pipeline and report results.

## Commands

```bash
# Type check
bun run check-types 2>&1

# Lint + format
bun run check 2>&1

# Tests (all packages)
bun run test 2>&1
```

## Steps

1. Run `bun run check-types` — report pass/fail and any errors
2. Run `bun run check` — report pass/fail and any auto-fixes applied
3. Run `bun run test` — report pass/fail and test counts
4. If any step fails, stop and report the failures clearly
5. If all pass, confirm "All checks passed" with summary counts

## Per-package validation

To validate only the weby package:

```bash
cd packages/weby && bun run check-types 2>&1
cd packages/weby && bun run test 2>&1
```

$ARGUMENTS
