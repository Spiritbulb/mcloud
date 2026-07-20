# Report template

Fill this in and save as the final Markdown report. Omit sections that genuinely don't
apply (e.g. no dependency changes in this diff) rather than leaving them empty with
"N/A" — keep the report tight.

```markdown
# Code Review: <branch / PR title / file set>

**Date:** <date>
**Scope:** <files/paths reviewed, or "PR #123", or "diff main...feature-x">
**Business context provided:** <summary of what the user told you, or "none provided">
**Tools used:** <e.g. "npm audit (found), semgrep (not installed — manual review used)">

## Summary
- Overall risk: <Critical / High / Medium / Low / Clean>
- Findings: <n> Critical, <n> High, <n> Medium, <n> Low, <n> Questions for Author
- One or two lines on the general shape of the change.

## Code Walkthrough

### `<file path>`

<Plain-language, step-by-step walkthrough: what triggers this code, the control flow in
order, what it calls out to, what it returns — written for understanding, not critique.
No severity tags or judgments here. Length scales with the file's actual complexity.>

<Repeat per file.>

## Findings

### `<file path>`

**[Critical|High|Medium|Low] <Dimension> — <short title>**
<description of the issue, why it matters, and where (line/function name)>

<Optional:>
Suggested fix:
\`\`\`diff
- old line
+ new line
\`\`\`

<Repeat per finding, grouped by file, ordered by severity within each file.>

## Dependency / Security Scan Output
<Raw or lightly-summarized output from any real tools that were run, attributed by tool
name. If a tool wasn't installed, say so here rather than omitting the section silently.>

## Questions for Author
- <Item that needs the author's context to judge — phrased as a genuine question, not an
  implied accusation of a bug.>

## Not Reviewed
- <Anything explicitly out of scope or skipped, and why — e.g. "auth-gated admin routes not
  exercised," "vendor/ directory excluded.">
```

## Severity definitions (for consistency across reports)

| Severity | Meaning |
|---|---|
| Critical | Security vulnerability, data loss/corruption risk, or a crash in a common/expected path |
| High | Behavior is likely wrong in a way that matters (logic bug, broken contract with callers) |
| Medium | Real issue but not urgent — poor error handling, missed edge case, maintainability risk |
| Low | Style, readability, minor duplication — doesn't affect correctness |
| Question | Can't be judged without author context — not a confirmed defect |
