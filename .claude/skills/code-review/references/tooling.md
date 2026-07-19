# Tool detection by language

Check availability with `command -v <tool>` (or `where <tool>` on Windows) before using any
of these. Never install them. If absent, note in the report: "no <purpose> scanner detected
locally — reviewed manually" and proceed with judgment-based review for that language.

| Language / ecosystem | Dependency/vuln tool | Static/security tool | Secret scanning |
|---|---|---|---|
| JavaScript/TypeScript (npm) | `npm audit` | `semgrep` (generic, if installed) | `gitleaks`, `trufflehog` |
| JavaScript/TypeScript (yarn) | `yarn audit` | `semgrep` | `gitleaks` |
| Python | `pip-audit` | `bandit`, `semgrep` | `gitleaks` |
| Go | `govulncheck` | `gosec` | `gitleaks` |
| Rust | `cargo audit` | `cargo clippy` (lint, not security-specific but useful) | `gitleaks` |
| Ruby | `bundler-audit` | `brakeman` | `gitleaks` |
| Java/Kotlin (Maven) | `mvn dependency-check:check` (rarely pre-installed — likely absent) | `semgrep` | `gitleaks` |
| Any language | — | `semgrep --config auto` if installed (broad ruleset) | `gitleaks detect` |

## How to run each (only if `command -v` confirms presence)

```bash
# npm
command -v npm >/dev/null && npm audit --json 2>/dev/null

# pip-audit
command -v pip-audit >/dev/null && pip-audit -r requirements.txt 2>/dev/null

# semgrep (generic — works across many langs, only if installed)
command -v semgrep >/dev/null && semgrep --config auto --json <path>

# gitleaks (secret scanning, works on any repo)
command -v gitleaks >/dev/null && gitleaks detect --source <path> --no-git -v

# govulncheck
command -v govulncheck >/dev/null && govulncheck ./...

# cargo audit
command -v cargo-audit >/dev/null && cargo audit
```

Parse JSON output where available rather than eyeballing raw text — it's more reliable for
pulling exact package names, versions, and CVE IDs into the report.

If a tool errors out (e.g. `npm audit` failing due to no `package-lock.json`), note the
failure plainly in the report rather than silently omitting that section.
