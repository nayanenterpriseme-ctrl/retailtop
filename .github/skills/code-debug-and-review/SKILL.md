---
name: code-debug-and-review
description: 'Debug and review application code systematically. Use for bug reports, failing tests, runtime errors, build or type errors, regressions, pull request reviews, security concerns, and requests to assess code quality or missing tests.'
argument-hint: '[bug, error, diff, file, or review target]'
user-invocable: true
---

# Code Debug And Review

Use this skill to investigate behavior, make the smallest justified change, and verify the result. Keep the work anchored to the reported symptom or review target.

## 1. Establish The Target

1. Read the request completely and identify the concrete anchor: failing command, error text, test, file, symbol, diff, or observed behavior.
2. Inspect the owning implementation and one nearby test or call site. Prefer targeted search over broad repository mapping.
3. Check repository instructions, package scripts, and relevant history only when they affect the decision.
4. State one falsifiable hypothesis about the controlling code path and one cheap check that could disconfirm it.
5. Separate facts from assumptions. Record constraints such as compatibility, public APIs, data shape, and expected error behavior.

## 2. Choose The Path

- **Debug path:** Follow the reported input through the smallest controlling path. Reproduce the failure with the narrowest available command or test before editing when practical.
- **Review path:** Inspect the requested diff or surface for correctness first. Prioritize user-visible defects, data loss, security issues, broken contracts, and regressions over style.
- **Mixed request:** Review existing changes first, then debug only findings that require execution or a code change.
- **Unclear request:** Infer the path from the strongest concrete anchor. Ask one concise question only when the expected behavior or scope cannot be determined from the repository.

## 3. Investigate Locally

1. Trace inputs, state changes, side effects, error handling, and boundary conditions.
2. Compare behavior with a neighboring implementation, test, or documented contract.
3. For async, persistence, authentication, or UI behavior, inspect lifecycle and failure paths, not only the happy path.
4. For security-sensitive behavior, check authorization, validation, trust boundaries, secret handling, and information disclosure.
5. For reviews, classify each finding by severity and include the affected file and line. Explain the concrete failure scenario and why it matters.
6. Avoid speculative findings. A concern should have a reachable path, violated expectation, or clear test gap.

## 4. Make The Smallest Fix

1. Edit the code that controls the behavior, not a downstream symptom.
2. Preserve existing APIs, conventions, and unrelated user changes.
3. Add or update a focused regression test when the behavior is testable.
4. Keep comments rare and explain only non-obvious reasoning.
5. Do not broaden a fix into an unrelated refactor.

## 5. Validate

Run the cheapest check that can falsify the hypothesis immediately after the first edit:

1. Re-run the reproducer or narrow test.
2. Run a focused typecheck, lint, or build for the touched slice if no behavior test exists.
3. Exercise relevant edge cases: empty, malformed, duplicate, boundary, unauthorized, failure, and repeated inputs as applicable.
4. Run the repository's broader validation when the change crosses module boundaries or when the project provides a standard check.
5. Inspect the final diff for accidental changes, incomplete error handling, and missing tests.

A fix is complete only when the original symptom is reproduced as passing or is explained by a verified environmental constraint, relevant tests pass, no new diagnostics remain in the touched files, and the final behavior matches the stated contract.

## Review Output

For review requests, report findings first in descending severity. Each finding should contain:

- Severity and file/line reference
- Concrete failure scenario
- Why the current code causes it
- A concise remediation direction

Then list open questions or assumptions, validation performed, and a short change summary. If there are no findings, say so clearly and mention meaningful remaining test gaps or residual risk.

## Debug Output

For debugging requests, summarize the root cause, changed files, validation commands and outcomes, and any remaining limitations. Do not claim a test was run unless it was actually executed.
