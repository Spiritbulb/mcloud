# Detailed review checklist by dimension

Use this as a working checklist for substantial reviews. Not every item applies to every
file — use judgment about relevance, don't force-fit a checklist to trivial changes.

## 1. Input
- Are all external inputs (HTTP params, form data, file uploads, queue messages, function
  args from untrusted callers) validated for type, range, length, and format?
- Is missing/null/undefined handled explicitly, or does it rely on implicit falsy behavior
  that could hide bugs?
- For public-facing endpoints: is there any implicit trust of client-supplied data that
  should be re-validated server-side (IDs, prices, roles, permissions)?

## 2. Output
- Does the return shape match what callers/consumers expect (check call sites if visible)?
- Are error responses distinct from success responses in a way consumers can rely on?
- Any accidental over-exposure — internal IDs, stack traces, debug info, other users' data,
  secrets/tokens — leaking into a response, log, or client-visible object?
- Consistent status codes / error conventions with the rest of the codebase?

## 3. Process / Logic
- Off-by-one errors, incorrect boundary conditions (`<` vs `<=`).
- Async correctness: missing `await`, unhandled promise rejections, race conditions between
  concurrent operations touching shared state.
- Error handling: are errors caught and either handled meaningfully or propagated? Flag
  silent `catch {}` blocks that swallow errors with no logging/handling.
- Resource cleanup: are file handles, DB connections, locks released in all code paths
  (including early returns and exceptions)?
- Idempotency: for retryable operations (webhooks, payment callbacks, queue consumers), is
  the operation safe to run more than once?

## 4. Function / Responsibility
- Single Responsibility: does this function/class do one coherent thing, or has it
  accumulated unrelated responsibilities over time?
- Is this the right layer for this logic (e.g. business logic leaking into a route handler
  or UI component)?
- Hidden side effects: does calling this do something a reader wouldn't expect from its name
  (mutating shared state, sending network requests, writing files)?

## 5. Coding principles
- DRY: is this duplicating logic that exists elsewhere in the codebase (search for it)?
- Naming: do names accurately describe what the thing does/holds? Flag misleading names
  specifically — they're worse than merely unclear ones.
- Nesting/complexity: deeply nested conditionals that could be flattened with early returns
  or extracted helpers.
- Consistency: does this follow the formatting/structure/error-handling conventions already
  established elsewhere in this repo? (Infer conventions from surrounding code rather than
  a generic external style guide — a codebase's own consistency matters more than which
  convention was chosen.)

## 6. Dependencies
- New dependency added — is it necessary, or does existing code/stdlib already solve this?
- Version pinning: is it pinned to a specific version, a loose range, or a floating tag
  that could pull in breaking/malicious updates unexpectedly?
- Any dependency flagged by the tools in `tooling.md` as vulnerable, deprecated, or
  unmaintained?
- License concerns (e.g. copyleft license introduced into a proprietary codebase) — only
  flag if apparent from the manifest, don't do a full legal audit.

## 7. Security
- Injection: string-concatenated SQL/shell/template commands built from untrusted input.
- AuthN/AuthZ: missing permission checks, checking the wrong user/tenant ID, relying on
  client-supplied role claims without server-side verification.
- Secrets: hardcoded API keys, tokens, passwords, connection strings in source (cross-check
  with `gitleaks` output if available).
- Unsafe deserialization (`pickle`, `eval`, unsafe YAML loaders, etc.).
- SSRF: server making outbound requests to a URL built from user input without an allowlist.
- Path traversal: file operations built from user-supplied paths without normalization/
  containment checks.
- IDOR: object/resource access based on a client-supplied ID with no ownership check.
- Rate limiting / abuse potential on sensitive or expensive endpoints (auth, payment,
  search, email-sending).

## Questions-for-author triggers
Use this section instead of flagging a defect when:
- A design choice looks unusual but could be deliberate (short TTL, disabled retry, unusual
  ordering) and no context was given to explain it.
- Business logic branches on values whose meaning isn't clear from the code alone (e.g. a
  magic status code, a feature flag whose purpose isn't documented nearby).
- A tradeoff between two reasonable approaches was made and it's unclear which property
  (speed, safety, simplicity) was being optimized for.
