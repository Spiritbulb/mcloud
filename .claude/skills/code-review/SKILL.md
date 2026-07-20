---
name: code-review
description: Perform a structured, in-depth code review of a PR, diff, branch, or pasted/uploaded code — covering input/output behavior, process/logic, function/responsibility, coding principles, dependencies, and security vulnerabilities. Produces a saved Markdown report, never edits files. Use this whenever the user asks to "review this code," "review this PR," "check this diff," "look over these changes," asks for a security or dependency check on code, or uploads/pastes code and asks for feedback — even if they don't say the words "code review" explicitly.
---

# Code Review

A structured, multi-dimensional code review skill. Produces a saved Markdown report only —
this skill never edits source files. If the user wants a fix applied, that's a separate,
explicit ask outside this skill's scope.

## Step 0: Establish scope and context

Figure out what's being reviewed:
- **Claude Code**: a git diff (`git diff`, `git diff main...HEAD`), a PR (via `gh pr diff <n>`
  if the `gh` CLI is available and authenticated), or specific files/paths the user names.
- **Claude.ai**: files the user uploaded or pasted inline.

Then ask (once, briefly — don't block if they don't answer) whether there's business/product
context worth knowing: why this code exists, what tradeoffs were already made, what matters
most (latency vs correctness vs simplicity, etc). If none is given, proceed without it — see
the "Questions for Author" rule below for how to handle things you can't judge without it.

Don't ask more than one clarifying question up front. If scope is obvious (e.g. "review my
diff"), just proceed with `git diff` / the uploaded files.

## Step 1: Detect language(s) and available tooling

Identify the language(s)/stack involved from file extensions and manifests
(`package.json`, `requirements.txt`/`pyproject.toml`, `go.mod`, `Cargo.toml`, etc).

Then check — **do not install anything** — which real scanning tools are already available,
per the table in `references/tooling.md`. For each detected language, run `command -v <tool>`
(or equivalent). If a tool is present, run it and fold its output into the Security and
Dependencies sections of the report, clearly attributed to that tool. If not present, fall
back to manual/model-judgment review for that language and say so in the report — don't
silently skip it, and don't tell the user to go install something unless they ask.

## Step 2: Write a code walkthrough (before critiquing anything)

The person using this skill cares as much about **understanding what the code does** as
about finding issues with it. Before evaluating anything, write a walkthrough for each
reviewed file (or logical unit, for very large files) as **short, terse bullet points** —
not narrative prose paragraphs. Default to fragments over full sentences where meaning
doesn't suffer:

- What triggers this code (request, queue message, scheduled job, UI event) — one line.
- Control flow as a flat or lightly-nested bullet list, in order: each branch, each external
  call (DB, API, other module), what it returns/produces. One bullet per step, not a
  paragraph per step.
- Only add a "why" note where it's genuinely non-obvious — don't narrate intent for
  self-evident steps.
- No severity tags or judgments here — save critique for Step 3.

Length scales with complexity — a 15-line helper gets 1-2 bullets, a 300-line handler gets
a real list, but each bullet should still be one line wherever possible. If a walkthrough
bullet is running past ~20 words, look for a way to cut it rather than let it run on.

## Step 3: Review across the seven dimensions

For each changed file (or logical unit of changed code), evaluate:

1. **Input** — what does this function/module/endpoint receive? Is it validated? Are types,
   ranges, nullability, and untrusted-source assumptions handled correctly?
2. **Output** — what does it return/emit/persist? Correct shape, correct error surfaces,
   correct status codes, no accidental data leakage (e.g. returning internal fields, stack
   traces, or secrets to a client)?
3. **Process** — does the internal logic do what it appears intended to do? Edge cases, off-
   by-one errors, race conditions, error handling/swallowing, async/await correctness.
4. **Function/Responsibility** — does this unit have a single clear purpose? Is it in the
   right place architecturally? Any responsibility creep or hidden side effects?
5. **Coding principles** — naming, readability, duplication (DRY), complexity/nesting depth,
   consistency with the rest of the codebase's existing conventions (infer these from
   surrounding code — don't impose a generic style the codebase doesn't already use).
6. **Dependencies** — new packages added, version pins, known-vulnerable or abandoned
   packages, license concerns if apparent, unnecessary bloat for what's being solved.
7. **Security** — the standard risk classes: injection (SQL/command/template), auth/authz
   gaps, secrets or credentials in code, unsafe deserialization, SSRF, path traversal, unsafe
   direct object references, missing rate limiting on sensitive endpoints, and whatever the
   real scanners from Step 1 surface.

Full detailed criteria and things to check per dimension are in
`references/review-checklist.md` — read it before writing the report if this is a
substantial review (more than a couple of small files).

### The "Questions for Author" rule

If something looks wrong but could plausibly be an intentional tradeoff you don't have
context for (e.g. "this cache TTL seems short" or "why is retry logic disabled here"),
do **not** report it as a bug. Put it in a dedicated "Questions for Author" section instead.
Only call something a defect when you're confident it's unintentional (crashes, clear logic
errors, security holes, contradicts what the code itself claims to do).

### On suggesting fixes

You may include a **small, clearly-labeled suggested change** inline in the report (a few
lines of pseudo-diff under a "Suggested fix" sub-heading) to make the issue concrete — but
never apply it to the actual file. Keep suggestions minimal and scoped to the one issue
being described, not a rewrite.

## Step 4: Write the report

Write tight. Favor short bullets and fragments over full paragraphs everywhere in the
report — walkthrough, findings, questions. One idea per line. Cut connective phrases
("it's worth noting that," "this suggests that") — state the fact or the issue directly.
A finding is: what's wrong, where, why it matters — in as few words as that takes, not a
paragraph building up to it. Reserve full sentences for places where the logic genuinely
needs a clause to connect (e.g. explaining *why* something is a problem), not as a default
style.

Use the template in `references/report-template.md`. Save it to disk rather than only
printing to chat:

- **Claude Code**: save under `docs/code-reviews/YYYY-MM-DD-<branch-or-pr>.md` in the repo
  (create the folder if needed).
- **Claude.ai**: create the file via the file-creation tool and present it to the user as a
  downloadable Markdown artifact.

Keep the summary at the top short (a few lines: overall risk level, count of findings by
severity). The detail belongs in the per-file sections below it — don't make the person
read the whole report to find out if something's blocking.

## Severity levels

Use these consistently (defined in full in `references/report-template.md`):

- **Critical** — security hole, data loss, crash in a common path
- **High** — likely bug, meaningfully wrong behavior
- **Medium** — real but non-urgent issue (poor error handling, missing edge case)
- **Low** — style/readability/minor duplication
- **Question** — needs author context, not a confirmed defect

## What this skill does NOT do

- Does not edit, patch, or commit any files.
- Does not install missing security tools — it uses what's present and says what it couldn't
  check.
- Does not assume the business intent behind a design choice it wasn't told about.
